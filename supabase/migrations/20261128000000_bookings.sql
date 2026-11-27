-- =============================================================================
-- Week 6: booking (DEV_PLAN §5.1, DECISIONS.md P24–P27, T30–T31)
--
-- * quote_booking(): prices a ticket selection (promo code, 4% booking fee) without holding seats.
-- * hold_booking(): reserves seats for 10 minutes in one transaction (row locks on the date and its
--   ticket types). Free bookings are confirmed at once and get tickets.
-- * Paid bookings: the "payments" Edge Function creates a Razorpay order (or a pretend one in local
--   "mock" mode), and payment_captured() confirms the booking and issues tickets. It is idempotent and
--   handles payments that arrive after the hold expired (seats re-checked; otherwise a refund is queued).
-- * expire_holds() releases unpaid seats every minute (pg_cron).
-- * Promo codes per club (percent or rupee off, use limit, dates, optional single event).
-- * The pay page works by a random pay token, so the app can open it in a browser without a login.
-- Money is integer paise everywhere. The fee rule mirrors packages/utils bookingFeePaise().
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables and columns
-- -----------------------------------------------------------------------------
create table public.promo_codes (
  id                uuid primary key default gen_random_uuid(),
  club_id           uuid not null references public.clubs (id) on delete cascade,
  code              text not null check (code ~ '^[A-Z0-9]{3,20}$'),
  percent_off       smallint check (percent_off between 1 and 100),
  amount_off_paise  integer check (amount_off_paise > 0),
  max_uses          integer check (max_uses > 0),
  used              integer not null default 0 check (used >= 0),
  event_id          uuid references public.events (id) on delete cascade,   -- null = any of the club's events
  valid_from        timestamptz,
  valid_until       timestamptz,
  active            boolean not null default true,
  created_by        uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (club_id, code),
  check ((percent_off is null) <> (amount_off_paise is null))
);
alter table public.promo_codes enable row level security;
create policy "club admins see their promo codes" on public.promo_codes
  for select to authenticated using (public.is_club_admin(club_id));
create policy "club admins add promo codes" on public.promo_codes
  for insert to authenticated with check (public.is_club_admin(club_id) and used = 0);
create policy "club admins change promo codes" on public.promo_codes
  for update to authenticated using (public.is_club_admin(club_id)) with check (public.is_club_admin(club_id));
revoke update on public.promo_codes from anon, authenticated;
grant update (active, max_uses, valid_until) on public.promo_codes to authenticated;

alter table public.bookings
  add column subtotal_paise  integer not null default 0 check (subtotal_paise >= 0),
  add column discount_paise  integer not null default 0 check (discount_paise >= 0),
  add column promo_code_id   uuid references public.promo_codes (id) on delete set null,
  add column pay_token       text unique,
  add column confirmed_at    timestamptz;

alter table public.tickets add column admits smallint not null default 1 check (admits >= 1);

-- Razorpay webhooks arrive at least once; remember which events were handled.
create table public.payment_events (
  event_id     text primary key,
  event_type   text not null,
  received_at  timestamptz not null default now()
);
alter table public.payment_events enable row level security;   -- no policies: server only

-- -----------------------------------------------------------------------------
-- Prices
-- -----------------------------------------------------------------------------
-- 4% of the amount after discounts, rounded to the nearest rupee (same as bookingFeePaise in utils).
create or replace function public.booking_fee_paise(p_amount integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case when coalesce(p_amount, 0) <= 0 then 0
              else (round(p_amount * 400 / 10000.0 / 100.0) * 100)::integer end;
$$;

-- Validates a selection and prices it. Raises friendly errors; doesn't change anything.
create or replace function public.price_selection(
  p_occurrence_id uuid,
  p_items         jsonb,
  p_promo_code    text,
  p_user_id       uuid
)
returns table (
  subtotal_paise  integer,
  discount_paise  integer,
  fee_paise       integer,
  total_paise     integer,
  seats           integer,
  tickets         integer,
  promo_code_id   uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  occ        record;
  item       jsonb;
  tier       record;
  qty        integer;
  sub        integer := 0;
  seat_count integer := 0;
  ticket_count integer := 0;
  promo      record;
  promo_id   uuid;
  discount   integer := 0;
  wanted     text := upper(nullif(trim(p_promo_code), ''));
  seen_tiers uuid[] := '{}';
begin
  select o.id, o.event_id, o.starts_at, o.ends_at, o.status, o.capacity, o.seats_taken,
         e.status as event_status, e.visibility, e.club_id, e.age_limit
    into occ
  from public.event_occurrences o join public.events e on e.id = o.event_id
  where o.id = p_occurrence_id;
  if not found or occ.event_status <> 'published' or occ.visibility not in ('public', 'unlisted')
     or not public.club_is_live(occ.club_id) then
    raise exception 'This event isn''t open for booking.' using errcode = '22023';
  end if;
  if occ.status <> 'scheduled' then
    raise exception 'This date was cancelled.' using errcode = '22023';
  end if;
  if coalesce(occ.ends_at, occ.starts_at + interval '2 hours') <= now() then
    raise exception 'This date is over.' using errcode = '22023';
  end if;
  if occ.age_limit is not null and p_user_id is not null and exists (
    select 1 from public.profiles_private pp
    where pp.id = p_user_id and pp.dob_year is not null
      and extract(year from now())::integer - pp.dob_year < occ.age_limit
  ) then
    raise exception 'This event is %+ only.', occ.age_limit using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Pick at least one ticket.' using errcode = '22023';
  end if;

  for item in select * from jsonb_array_elements(p_items) loop
    qty := nullif(item ->> 'qty', '')::integer;
    if qty is null or qty < 1 or qty > 10 then
      raise exception 'Pick 1 to 10 of each ticket.' using errcode = '22023';
    end if;
    select t.id, t.name, t.price_paise, t.quantity, t.sold, t.seats_per_ticket, t.sale_starts_at, t.sale_ends_at
      into tier
    from public.ticket_tiers t
    where t.id = (item ->> 'tier_id')::uuid and t.occurrence_id = p_occurrence_id;
    if not found then
      raise exception 'That ticket type isn''t available any more.' using errcode = '22023';
    end if;
    if tier.id = any (seen_tiers) then
      raise exception 'Each ticket type can only be listed once.' using errcode = '22023';
    end if;
    seen_tiers := seen_tiers || tier.id;
    if (tier.sale_starts_at is not null and tier.sale_starts_at > now())
       or (tier.sale_ends_at is not null and tier.sale_ends_at <= now()) then
      raise exception '% isn''t on sale right now.', tier.name using errcode = '22023';
    end if;
    if tier.quantity is not null and tier.sold + qty > tier.quantity then
      raise exception 'Only % % left.', greatest(tier.quantity - tier.sold, 0), tier.name using errcode = '22023';
    end if;
    sub := sub + tier.price_paise * qty;
    seat_count := seat_count + tier.seats_per_ticket * qty;
    ticket_count := ticket_count + qty;
  end loop;

  if ticket_count > 10 then
    raise exception 'Up to 10 tickets per booking.' using errcode = '22023';
  end if;
  if occ.capacity is not null and occ.seats_taken + seat_count > occ.capacity then
    raise exception 'Only % spots left.', greatest(occ.capacity - occ.seats_taken, 0) using errcode = '22023';
  end if;

  if wanted is not null then
    select pc.* into promo
    from public.promo_codes pc
    where pc.club_id = occ.club_id and pc.code = wanted and pc.active
      and (pc.event_id is null or pc.event_id = occ.event_id)
      and (pc.valid_from is null or pc.valid_from <= now())
      and (pc.valid_until is null or pc.valid_until > now());
    if not found then
      raise exception 'That code doesn''t work for this event.' using errcode = '22023';
    end if;
    if promo.max_uses is not null and promo.used + (
         select count(*) from public.bookings b
         where b.promo_code_id = promo.id and b.status in ('held', 'payment_pending', 'failed')
           and b.hold_expires_at > now() and b.user_id is distinct from p_user_id
       ) >= promo.max_uses then
      raise exception 'That code has been used up.' using errcode = '22023';
    end if;
    if p_user_id is not null and exists (
      select 1 from public.bookings b
      where b.user_id = p_user_id and b.promo_code_id = promo.id
        and b.status in ('paid', 'confirmed', 'checked_in', 'late_paid')
    ) then
      raise exception 'You''ve already used that code.' using errcode = '22023';
    end if;
    promo_id := promo.id;
    discount := case when promo.percent_off is not null then (sub * promo.percent_off / 100)
                     else least(promo.amount_off_paise, sub) end;
  end if;

  return query select sub, discount, public.booking_fee_paise(sub - discount),
                      sub - discount + public.booking_fee_paise(sub - discount),
                      seat_count, ticket_count, promo_id;
end;
$$;

-- What the booking screen shows as you pick tickets (no seats held).
create or replace function public.quote_booking(p_occurrence_id uuid, p_items jsonb, p_promo_code text default null)
returns table (subtotal_paise integer, discount_paise integer, fee_paise integer, total_paise integer)
language sql
stable
security definer
set search_path = ''
as $$
  select q.subtotal_paise, q.discount_paise, q.fee_paise, q.total_paise
  from public.price_selection(p_occurrence_id, p_items, p_promo_code, auth.uid()) q;
$$;

-- -----------------------------------------------------------------------------
-- Holding, confirming and releasing seats
-- -----------------------------------------------------------------------------
create or replace function public.ticket_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- no 0/O, 1/I
  result text;
  bytes  bytea;
begin
  loop
    bytes := extensions.gen_random_bytes(6);
    result := 'NKL-';
    -- 6 characters from 32, each from a secure random byte (32 divides 256, so no bias).
    for i in 0..5 loop
      result := result || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
    end loop;
    exit when not exists (select 1 from public.tickets t where t.code = result);
  end loop;
  return result;
end;
$$;

-- Confirms a held/paid booking: tickets (one per ticket bought; a "Squad of 4" ticket admits 4) and
-- the promo code's use count.
create or replace function public.confirm_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b    record;
  item record;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if b.status in ('confirmed', 'checked_in') then
    return;
  end if;
  update public.bookings
  set status = 'confirmed', confirmed_at = now(), hold_expires_at = null
  where id = p_booking_id;
  for item in
    select bi.qty, t.seats_per_ticket
    from public.booking_items bi join public.ticket_tiers t on t.id = bi.tier_id
    where bi.booking_id = p_booking_id
  loop
    insert into public.tickets (booking_id, user_id, occurrence_id, code, admits)
    select b.id, b.user_id, b.occurrence_id, public.ticket_code(), item.seats_per_ticket
    from generate_series(1, item.qty);
  end loop;
  if b.promo_code_id is not null then
    update public.promo_codes set used = used + 1 where id = b.promo_code_id;
  end if;
end;
$$;

-- Gives back the seats of an unpaid booking.
create or replace function public.release_booking(p_booking_id uuid, p_status public.booking_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or b.status not in ('held', 'payment_pending', 'failed') then
    return;
  end if;
  update public.ticket_tiers t
  set sold = greatest(t.sold - bi.qty, 0)
  from public.booking_items bi
  where bi.booking_id = p_booking_id and t.id = bi.tier_id;
  update public.event_occurrences o
  set seats_taken = greatest(o.seats_taken - (
        select coalesce(sum(bi.qty * t.seats_per_ticket), 0)
        from public.booking_items bi join public.ticket_tiers t on t.id = bi.tier_id
        where bi.booking_id = p_booking_id), 0)
  where o.id = b.occurrence_id;
  update public.bookings set status = p_status, hold_expires_at = null where id = p_booking_id;
end;
$$;

create or replace function public.hold_booking(
  p_occurrence_id    uuid,
  p_items            jsonb,
  p_promo_code       text default null,
  p_idempotency_key  text default null
)
returns table (
  booking_id       uuid,
  status           text,
  subtotal_paise   integer,
  discount_paise   integer,
  fee_paise        integer,
  total_paise      integer,
  hold_expires_at  timestamptz,
  pay_token        text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  existing record;
  price    record;
  b_id     uuid;
  item     jsonb;
  old_id   uuid;
  key      text := p_idempotency_key;
begin
  if uid is null then
    raise exception 'Log in to book.' using errcode = '42501';
  end if;
  -- Booking needs a finished profile and the 18+ check (P11, P16).
  if not exists (
    select 1 from public.profiles p join public.profiles_private pp on pp.id = p.id
    where p.id = uid and p.username is not null and pp.dob_year is not null
      and extract(year from now())::integer - pp.dob_year >= 18
  ) then
    raise exception 'Finish setting up your profile first.' using errcode = '22023';
  end if;

  -- Same request twice (a double tap, a retry): hand back the same booking.
  if key is not null then
    select b.* into existing from public.bookings b where b.idempotency_key = key;
    if found and existing.user_id <> uid then
      key := null;   -- someone else's key: never reveal or reuse their booking
    elsif found and existing.status = 'expired' then
      key := null;   -- that attempt ran out or was cancelled; start a new one
    elsif found then
      return query select existing.id, existing.status::text, existing.subtotal_paise, existing.discount_paise,
                          existing.fee_paise, existing.total_paise, existing.hold_expires_at, existing.pay_token;
      return;
    end if;
  end if;

  -- Lock the date first, then its ticket types, so two people can't take the last seat.
  perform 1 from public.event_occurrences o where o.id = p_occurrence_id for update;
  perform 1 from public.ticket_tiers t where t.occurrence_id = p_occurrence_id for update;

  -- Free up expired holds on this date, and your own unpaid hold (a new selection replaces it).
  for old_id in
    select b.id from public.bookings b
    where b.occurrence_id = p_occurrence_id and b.status in ('held', 'payment_pending', 'failed')
      and (b.hold_expires_at < now() or b.user_id = uid)
  loop
    perform public.release_booking(old_id, 'expired');
  end loop;

  select * into price from public.price_selection(p_occurrence_id, p_items, p_promo_code, uid);

  insert into public.bookings (user_id, occurrence_id, status, subtotal_paise, discount_paise, fee_paise, total_paise,
                               promo_code_id, hold_expires_at, idempotency_key, pay_token)
  values (uid, p_occurrence_id, 'held', price.subtotal_paise, price.discount_paise, price.fee_paise, price.total_paise,
          price.promo_code_id,
          case when price.total_paise > 0 then now() + interval '10 minutes' end,
          coalesce(key, gen_random_uuid()::text),
          case when price.total_paise > 0 then encode(extensions.gen_random_bytes(18), 'hex') end)
  returning id into b_id;

  for item in select * from jsonb_array_elements(p_items) loop
    insert into public.booking_items (booking_id, tier_id, qty, unit_price_paise)
    select b_id, t.id, (item ->> 'qty')::integer, t.price_paise
    from public.ticket_tiers t where t.id = (item ->> 'tier_id')::uuid;
    update public.ticket_tiers set sold = sold + (item ->> 'qty')::integer where id = (item ->> 'tier_id')::uuid;
  end loop;
  update public.event_occurrences set seats_taken = seats_taken + price.seats where id = p_occurrence_id;

  if price.total_paise = 0 then
    perform public.confirm_booking(b_id);
  end if;

  return query select b.id, b.status::text, b.subtotal_paise, b.discount_paise, b.fee_paise, b.total_paise,
                      b.hold_expires_at, b.pay_token
               from public.bookings b where b.id = b_id;
end;
$$;

create or replace function public.cancel_hold(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.bookings b where b.id = p_booking_id and b.user_id = auth.uid()) then
    raise exception 'That booking isn''t yours.' using errcode = '42501';
  end if;
  perform public.release_booking(p_booking_id, 'expired');
end;
$$;

-- Every minute: unpaid holds past their 10 minutes give their seats back.
create or replace function public.expire_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  b_id  uuid;
  n     integer := 0;
begin
  for b_id in
    select b.id from public.bookings b
    where b.status in ('held', 'payment_pending', 'failed') and b.hold_expires_at < now()
    for update skip locked
  loop
    perform public.release_booking(b_id, 'expired');
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- -----------------------------------------------------------------------------
-- Payments (called by the "payments" Edge Function with the service key, never by apps)
-- -----------------------------------------------------------------------------
-- The pay page: a booking by its pay token (shown to whoever has the link, like a payment link).
create or replace function public.booking_for_payment(p_token text)
returns table (
  booking_id       uuid,
  status           text,
  event_title      text,
  event_slug       text,
  poster_url       text,
  category         text,
  starts_at        timestamptz,
  venue_name       text,
  area             text,
  items            jsonb,
  subtotal_paise   integer,
  discount_paise   integer,
  fee_paise        integer,
  total_paise      integer,
  hold_expires_at  timestamptz,
  ticket_count     integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.status::text, e.title, e.slug, e.poster_url, e.category, o.starts_at, v.name, v.area,
         (select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'qty', bi.qty, 'unit_price_paise', bi.unit_price_paise)
                                    order by t.position), '[]'::jsonb)
          from public.booking_items bi join public.ticket_tiers t on t.id = bi.tier_id where bi.booking_id = b.id),
         b.subtotal_paise, b.discount_paise, b.fee_paise, b.total_paise, b.hold_expires_at,
         -- only a count: the link can be opened by anyone who has it, the codes live in the app
         (select count(*)::integer from public.tickets tk where tk.booking_id = b.id)
  from public.bookings b
  join public.event_occurrences o on o.id = b.occurrence_id
  join public.events e on e.id = o.event_id
  left join public.venues v on v.id = e.venue_id
  where p_token ~ '^[0-9a-f]{36}$' and b.pay_token = p_token;
$$;

-- Records the provider order for a held booking and gives the payer a fresh 10 minutes.
create or replace function public.start_payment(p_token text, p_provider text, p_order_id text)
returns table (booking_id uuid, amount_paise integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
begin
  select * into b from public.bookings where pay_token = p_token for update;
  if not found or b.status not in ('held', 'payment_pending', 'failed') or b.hold_expires_at < now() then
    raise exception 'This booking has expired. Pick your tickets again.' using errcode = '22023';
  end if;
  insert into public.payments (booking_id, provider, provider_order_id, amount_paise, status)
  values (b.id, p_provider, p_order_id, b.total_paise, 'created')
  on conflict (provider_order_id) do nothing;
  -- A fresh 10 minutes once, when paying starts; never more than 20 minutes from the hold, so pressing
  -- Pay again and again can't keep seats away from everyone else.
  update public.bookings
  set status = 'payment_pending',
      hold_expires_at = case when b.status = 'held'
                             then least(greatest(hold_expires_at, now() + interval '10 minutes'), created_at + interval '20 minutes')
                             else hold_expires_at end
  where id = b.id;
  return query select b.id, b.total_paise;
end;
$$;

-- The order already made for this booking, if any (so a retry reuses it).
create or replace function public.open_order_for(p_token text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.provider_order_id from public.payments p join public.bookings b on b.id = p.booking_id
  where b.pay_token = p_token and p.status in ('created', 'failed')
  order by p.created_at desc limit 1;
$$;

-- A payment went through (checkout handler, webhook or mock). Safe to call more than once.
create or replace function public.payment_captured(
  p_order_id    text,
  p_payment_id  text,
  p_method      text,
  p_amount      integer,
  p_raw         jsonb default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay          record;
  b            record;
  tiers_ok     boolean;
  seats_needed integer;
  room_ok      boolean;
  item         record;
begin
  select * into pay from public.payments where provider_order_id = p_order_id for update;
  if not found then
    raise exception 'Unknown order %', p_order_id using errcode = '22023';
  end if;
  if p_amount is distinct from pay.amount_paise then
    raise exception 'Amount mismatch for order %', p_order_id using errcode = '22023';
  end if;
  select * into b from public.bookings where id = pay.booking_id for update;
  if pay.status = 'captured' then
    return b.status::text;
  end if;
  update public.payments
  set status = 'captured', provider_payment_id = coalesce(p_payment_id, provider_payment_id), method = coalesce(p_method, method),
      raw_webhook = coalesce(p_raw, raw_webhook)
  where id = pay.id;

  if b.status in ('held', 'payment_pending', 'failed') then
    update public.bookings set status = 'paid' where id = b.id;
    perform public.confirm_booking(b.id);
    return 'confirmed';
  end if;

  if b.status = 'expired' then
    -- Paid after the hold ran out: take the seats again if they're still free, else queue a refund.
    perform 1 from public.event_occurrences o where o.id = b.occurrence_id for update;
    perform 1 from public.ticket_tiers t where t.occurrence_id = b.occurrence_id for update;
    select coalesce(bool_and(t.quantity is null or t.sold + bi.qty <= t.quantity), true),
           coalesce(sum(bi.qty * t.seats_per_ticket), 0)::integer
      into tiers_ok, seats_needed
    from public.booking_items bi join public.ticket_tiers t on t.id = bi.tier_id
    where bi.booking_id = b.id;
    select o.capacity is null or o.seats_taken + seats_needed <= o.capacity into room_ok
    from public.event_occurrences o where o.id = b.occurrence_id;
    if tiers_ok and room_ok then
      for item in select bi.tier_id, bi.qty, t.seats_per_ticket from public.booking_items bi
                  join public.ticket_tiers t on t.id = bi.tier_id where bi.booking_id = b.id loop
        update public.ticket_tiers set sold = sold + item.qty where id = item.tier_id;
        update public.event_occurrences set seats_taken = seats_taken + item.qty * item.seats_per_ticket where id = b.occurrence_id;
      end loop;
      update public.bookings set status = 'late_paid' where id = b.id;
      perform public.confirm_booking(b.id);
      return 'confirmed';
    end if;
    update public.bookings set status = 'late_paid' where id = b.id;
    insert into public.refunds (payment_id, amount_paise, reason, status)
    values (pay.id, pay.amount_paise, 'Paid after the hold expired and the event was full', 'pending');
    return 'refund_pending';
  end if;
  return b.status::text;
end;
$$;

-- A payment attempt failed. The hold stays, so the person can try again until it runs out.
create or replace function public.payment_failed(p_order_id text, p_payment_id text, p_raw jsonb default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pay record;
begin
  select * into pay from public.payments where provider_order_id = p_order_id for update;
  if not found or pay.status = 'captured' then
    return coalesce(pay.status::text, 'unknown');
  end if;
  update public.payments set status = 'failed', provider_payment_id = coalesce(p_payment_id, provider_payment_id),
         raw_webhook = coalesce(p_raw, raw_webhook)
  where id = pay.id;
  update public.bookings set status = 'failed' where id = pay.booking_id and status = 'payment_pending';
  return 'failed';
end;
$$;

-- Webhook de-duplication: true the first time an event id is seen.
create or replace function public.claim_payment_event(p_event_id text, p_event_type text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.payment_events (event_id, event_type) values (p_event_id, p_event_type);
  return true;
exception when unique_violation then
  return false;
end;
$$;

-- -----------------------------------------------------------------------------
-- Your bookings and tickets
-- -----------------------------------------------------------------------------
create or replace function public.my_bookings()
returns table (
  booking_id       uuid,
  status           text,
  event_id         uuid,
  event_slug       text,
  event_title      text,
  poster_url       text,
  category         text,
  club_name        text,
  starts_at        timestamptz,
  ends_at          timestamptz,
  venue_name       text,
  area             text,
  total_paise      integer,
  hold_expires_at  timestamptz,
  pay_token        text,
  items            jsonb,
  tickets          jsonb,
  created_at       timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.id, b.status::text, e.id, e.slug, e.title, e.poster_url, e.category, c.name, o.starts_at, o.ends_at,
         v.name, coalesce(v.area, c.area), b.total_paise,
         case when b.status in ('held', 'payment_pending', 'failed') then b.hold_expires_at end,
         case when b.status in ('held', 'payment_pending', 'failed') and b.hold_expires_at > now() then b.pay_token end,
         (select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'qty', bi.qty) order by t.position), '[]'::jsonb)
          from public.booking_items bi join public.ticket_tiers t on t.id = bi.tier_id where bi.booking_id = b.id),
         (select coalesce(jsonb_agg(jsonb_build_object('code', tk.code, 'admits', tk.admits, 'status', tk.status) order by tk.created_at), '[]'::jsonb)
          from public.tickets tk where tk.booking_id = b.id),
         b.created_at
  from public.bookings b
  join public.event_occurrences o on o.id = b.occurrence_id
  join public.events e on e.id = o.event_id
  join public.clubs c on c.id = e.club_id
  left join public.venues v on v.id = e.venue_id
  where b.user_id = auth.uid()
    and (b.status not in ('held', 'payment_pending', 'failed', 'expired')
         or (b.status in ('held', 'payment_pending', 'failed') and b.hold_expires_at > now()))
  order by o.starts_at;
$$;

-- -----------------------------------------------------------------------------
-- Timer: release expired holds every minute
-- -----------------------------------------------------------------------------
create extension if not exists pg_cron;
select cron.schedule('nikl-expire-holds', '* * * * *', 'select public.expire_holds();');

-- -----------------------------------------------------------------------------
-- Who can call what
-- -----------------------------------------------------------------------------
revoke execute on function public.price_selection(uuid, jsonb, text, uuid) from public, anon, authenticated;
revoke execute on function public.ticket_code() from public, anon, authenticated;
revoke execute on function public.confirm_booking(uuid) from public, anon, authenticated;
revoke execute on function public.release_booking(uuid, public.booking_status) from public, anon, authenticated;
revoke execute on function public.expire_holds() from public, anon, authenticated;
revoke execute on function public.start_payment(text, text, text) from public, anon, authenticated;
revoke execute on function public.open_order_for(text) from public, anon, authenticated;
revoke execute on function public.payment_captured(text, text, text, integer, jsonb) from public, anon, authenticated;
revoke execute on function public.payment_failed(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.claim_payment_event(text, text) from public, anon, authenticated;
grant execute on function public.start_payment(text, text, text) to service_role;
grant execute on function public.open_order_for(text) to service_role;
grant execute on function public.payment_captured(text, text, text, integer, jsonb) to service_role;
grant execute on function public.payment_failed(text, text, jsonb) to service_role;
grant execute on function public.claim_payment_event(text, text) to service_role;

revoke execute on function public.quote_booking(uuid, jsonb, text) from public;
revoke execute on function public.booking_for_payment(text) from public;
revoke execute on function public.hold_booking(uuid, jsonb, text, text) from public, anon;
revoke execute on function public.cancel_hold(uuid) from public, anon;
revoke execute on function public.my_bookings() from public, anon;
grant execute on function public.quote_booking(uuid, jsonb, text) to anon, authenticated;
grant execute on function public.booking_for_payment(text) to anon, authenticated;
grant execute on function public.hold_booking(uuid, jsonb, text, text) to authenticated;
grant execute on function public.cancel_hold(uuid) to authenticated;
grant execute on function public.my_bookings() to authenticated;
