-- =============================================================================
-- Week 2: club approval, Nikl admins, atomic event creation, poster storage
--
-- * DECISIONS.md P15: anyone can create a club page, but it stays hidden until a
--   Nikl admin approves it. Until then the club, its events, posts and stories are
--   visible only to its own team and Nikl admins.
-- * Clubs are created through create_club() (rate-limited), events through
--   create_event() (event + weekly dates + ticket tiers in one transaction).
-- * Posters live in a public "posters" storage bucket, one folder per user.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Categories: one list, enforced by the database too (mirrors packages/utils)
-- -----------------------------------------------------------------------------
create or replace function public.is_valid_category(c text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select c = any (array['fitness', 'art', 'music', 'comedy', 'food', 'outdoors', 'games',
                        'learn', 'dance', 'markets', 'social', 'wellness']);
$$;

alter table public.clubs  add constraint clubs_category_valid  check (public.is_valid_category(category));
alter table public.events add constraint events_category_valid check (public.is_valid_category(category));

-- -----------------------------------------------------------------------------
-- Nikl admins (staff who approve clubs and moderate). Added by hand, never by the apps:
--   insert into public.platform_admins (user_id)
--   select id from auth.users where phone = '91XXXXXXXXXX';
-- -----------------------------------------------------------------------------
create table public.platform_admins (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);
comment on table public.platform_admins is 'Nikl staff. Rows are added by hand in the SQL editor, never by the apps.';
alter table public.platform_admins enable row level security;
revoke insert, update, delete on public.platform_admins from anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins a where a.user_id = auth.uid());
$$;

create policy "admins see the admin list" on public.platform_admins
  for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- Club review status
-- -----------------------------------------------------------------------------
create type public.club_review_status as enum ('pending', 'approved', 'rejected', 'suspended');

alter table public.clubs
  add column review_status  public.club_review_status not null default 'pending',
  add column reviewed_at    timestamptz,
  add column reviewed_by    uuid references public.profiles (id) on delete set null,
  add column review_note    text check (char_length(review_note) <= 500);
create index clubs_review_status_idx on public.clubs (review_status);

-- Clubs that already exist were set up by Nikl (sample data): approve them.
-- (On a fresh database this updates nothing; seed.sql approves its own clubs.)
update public.clubs set review_status = 'approved', reviewed_at = now();

create or replace function public.club_is_live(club uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.clubs c where c.id = club and c.review_status = 'approved');
$$;

-- When a rejected club's team edits their page, it goes back into the review queue.
create or replace function public.resubmit_rejected_club()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.review_status = 'rejected' and new.review_status = 'rejected' and not public.is_platform_admin() then
    new.review_status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

create trigger on_rejected_club_edited
  before update on public.clubs
  for each row execute function public.resubmit_rejected_club();

-- Clubs are now created only through create_club()
drop policy "signed-in users create clubs" on public.clubs;
revoke insert on public.clubs from authenticated;

drop policy "clubs are public" on public.clubs;
create policy "approved clubs are public" on public.clubs
  for select to anon, authenticated
  using (review_status = 'approved' or public.is_club_staff(id) or public.is_platform_admin());

-- -----------------------------------------------------------------------------
-- Visibility: events, posts and stories of unapproved clubs stay hidden
-- -----------------------------------------------------------------------------
create or replace function public.event_visible(ev uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.events e
    where e.id = ev
      and ((e.status <> 'draft' and e.visibility in ('public', 'unlisted') and public.club_is_live(e.club_id))
        or public.is_club_admin(e.club_id)
        or public.is_platform_admin())
  );
$$;

drop policy "published events are public" on public.events;
create policy "published events of approved clubs are public" on public.events
  for select to anon, authenticated
  using ((status <> 'draft' and visibility in ('public', 'unlisted') and public.club_is_live(club_id))
      or public.is_club_admin(club_id)
      or public.is_platform_admin());

drop policy "approved public posts are public" on public.posts;
create policy "approved public posts are public" on public.posts
  for select to anon, authenticated
  using ((moderation_status = 'approved' and visibility = 'public'
          and (author_type = 'user' or public.club_is_live(author_id)))
      or (author_type = 'user' and author_id = auth.uid())
      or (author_type = 'club' and public.is_club_admin(author_id)));

drop policy "live approved stories are public" on public.stories;
create policy "live approved stories are public" on public.stories
  for select to anon, authenticated
  using ((moderation_status = 'approved' and expires_at > now()
          and (author_type = 'user' or public.club_is_live(author_id)))
      or (author_type = 'user' and author_id = auth.uid())
      or (author_type = 'club' and public.is_club_admin(author_id)));

-- -----------------------------------------------------------------------------
-- create_club(): any signed-in user; at most 3 clubs waiting for review at once
-- -----------------------------------------------------------------------------
create or replace function public.create_club(
  p_name      text,
  p_handle    text,
  p_category  text,
  p_kind      text default null,
  p_area      text default null,
  p_bio       text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid     uuid := auth.uid();
  new_id  uuid;
begin
  if uid is null then
    raise exception 'Log in to create a club page.' using errcode = '42501';
  end if;
  if not public.is_valid_category(p_category) then
    raise exception 'Pick a category from the list.' using errcode = '22023';
  end if;
  if (select count(*) from public.clubs c where c.created_by = uid and c.review_status = 'pending') >= 3 then
    raise exception 'You already have 3 club pages waiting for approval.' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.clubs c where lower(c.handle) = lower(trim(p_handle))) then
    raise exception 'That handle is taken. Try another one.' using errcode = '23505';
  end if;

  insert into public.clubs (name, handle, kind, category, bio, area, created_by)
  values (trim(p_name), lower(trim(p_handle)), nullif(trim(p_kind), ''), p_category,
          nullif(trim(p_bio), ''), nullif(trim(p_area), ''), uid)
  returning id into new_id;
  -- The on_club_created trigger makes the creator the owner.
  return new_id;
end;
$$;

revoke execute on function public.create_club(text, text, text, text, text, text) from public, anon;
grant execute on function public.create_club(text, text, text, text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- review_club(): Nikl admins approve, reject or suspend a club (logged)
-- -----------------------------------------------------------------------------
create or replace function public.review_club(
  p_club_id   uuid,
  p_decision  public.club_review_status,
  p_note      text default null
)
returns public.clubs
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_status  public.club_review_status;
  result         public.clubs;
begin
  if not public.is_platform_admin() then
    raise exception 'Only Nikl admins can review club pages.' using errcode = '42501';
  end if;
  if p_decision = 'pending' then
    raise exception 'Choose approved, rejected or suspended.' using errcode = '22023';
  end if;

  select review_status into before_status from public.clubs where id = p_club_id;
  if not found then
    raise exception 'Club not found.' using errcode = 'P0002';
  end if;

  update public.clubs
     set review_status = p_decision,
         reviewed_at   = now(),
         reviewed_by   = auth.uid(),
         review_note   = nullif(trim(p_note), '')
   where id = p_club_id
  returning * into result;

  insert into public.audit_log (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'club.review', 'club', p_club_id::text,
          jsonb_build_object('review_status', before_status),
          jsonb_build_object('review_status', p_decision, 'note', nullif(trim(p_note), '')));
  return result;
end;
$$;

revoke execute on function public.review_club(uuid, public.club_review_status, text) from public, anon;
grant execute on function public.review_club(uuid, public.club_review_status, text) to authenticated;

-- -----------------------------------------------------------------------------
-- create_event(): event + weekly dates + ticket tiers in one transaction.
-- Runs as the caller, so the normal row-level security rules still apply.
--   p_tiers: [{"name": "Regular", "price_paise": 19900, "quantity": 80, "seats_per_ticket": 1}]
--   An empty list means a single free RSVP tier.
-- -----------------------------------------------------------------------------
create or replace function public.create_event(
  p_club_id        uuid,
  p_title          text,
  p_category       text,
  p_starts_at      timestamptz,
  p_ends_at        timestamptz default null,
  p_description    text default null,
  p_poster_url     text default null,
  p_venue_id       uuid default null,
  p_venue_name     text default null,
  p_venue_address  text default null,
  p_venue_area     text default null,
  p_capacity       integer default null,
  p_repeat_weeks   integer default 1,
  p_tiers          jsonb default '[]'::jsonb,
  p_publish        boolean default false,
  p_tags           text[] default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ev_id      uuid;
  occ_id     uuid;
  v_id       uuid := p_venue_id;
  base_slug  text;
  new_slug   text;
  dur        interval;
  occ_start  timestamptz;
  r          record;
  i          integer;
begin
  if not public.is_club_admin(p_club_id) then
    raise exception 'You can only add events to clubs you manage.' using errcode = '42501';
  end if;
  if not public.is_valid_category(p_category) then
    raise exception 'Pick a category from the list.' using errcode = '22023';
  end if;
  if p_repeat_weeks is null or p_repeat_weeks < 1 or p_repeat_weeks > 12 then
    raise exception 'Weekly repeats must be between 1 and 12.' using errcode = '22023';
  end if;
  if p_starts_at < now() - interval '1 hour' then
    raise exception 'Pick a date and time in the future.' using errcode = '22023';
  end if;
  if p_ends_at is not null and p_ends_at <= p_starts_at then
    raise exception 'The event has to end after it starts.' using errcode = '22023';
  end if;
  if p_capacity is not null and p_capacity < 1 then
    raise exception 'Capacity must be at least 1.' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_tiers, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_tiers, '[]'::jsonb)) > 6 then
    raise exception 'Add up to 6 ticket types.' using errcode = '22023';
  end if;

  -- Venue: reuse one, or create it from the typed name
  if v_id is null and nullif(trim(p_venue_name), '') is not null then
    insert into public.venues (name, address, area)
    values (trim(p_venue_name), nullif(trim(p_venue_address), ''), nullif(trim(p_venue_area), ''))
    returning id into v_id;
  end if;

  -- URL slug: words from the title + a short random suffix
  base_slug := left(trim(both '-' from regexp_replace(lower(p_title), '[^a-z0-9]+', '-', 'g')), 120);
  if char_length(base_slug) < 3 then
    base_slug := 'event';
  end if;
  loop
    new_slug := base_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    exit when not exists (select 1 from public.events e where e.slug = new_slug);
  end loop;

  insert into public.events (club_id, title, slug, category, description, poster_url, venue_id,
                             status, recurrence_rule, tags, published_at)
  values (p_club_id, trim(p_title), new_slug, p_category, nullif(trim(p_description), ''),
          nullif(trim(p_poster_url), ''), v_id,
          case when p_publish then 'published'::public.event_status else 'draft'::public.event_status end,
          case when p_repeat_weeks > 1 then 'FREQ=WEEKLY;COUNT=' || p_repeat_weeks end,
          coalesce(p_tags, '{}'),
          case when p_publish then now() end)
  returning id into ev_id;

  dur := p_ends_at - p_starts_at;   -- null when there's no end time
  for i in 0 .. p_repeat_weeks - 1 loop
    occ_start := p_starts_at + make_interval(weeks => i);
    insert into public.event_occurrences (event_id, starts_at, ends_at, capacity)
    values (ev_id, occ_start, occ_start + dur, p_capacity)
    returning id into occ_id;

    if jsonb_array_length(coalesce(p_tiers, '[]'::jsonb)) = 0 then
      insert into public.ticket_tiers (occurrence_id, name, price_paise, quantity, position)
      values (occ_id, 'Free RSVP', 0, null, 0);
    else
      for r in select value as t, ordinality as pos from jsonb_array_elements(p_tiers) with ordinality loop
        if nullif(trim(r.t ->> 'name'), '') is null then
          raise exception 'Every ticket type needs a name.' using errcode = '22023';
        end if;
        insert into public.ticket_tiers (occurrence_id, name, price_paise, quantity, seats_per_ticket, position)
        values (occ_id,
                trim(r.t ->> 'name'),
                coalesce((r.t ->> 'price_paise')::integer, 0),
                nullif(r.t ->> 'quantity', '')::integer,
                coalesce(nullif(r.t ->> 'seats_per_ticket', '')::smallint, 1),
                (r.pos - 1)::smallint);
      end loop;
    end if;
  end loop;

  return ev_id;
end;
$$;

revoke execute on function public.create_event(uuid, text, text, timestamptz, timestamptz, text, text, uuid, text, text, text,
                                               integer, integer, jsonb, boolean, text[]) from public, anon;
grant execute on function public.create_event(uuid, text, text, timestamptz, timestamptz, text, text, uuid, text, text, text,
                                              integer, integer, jsonb, boolean, text[]) to authenticated;

-- -----------------------------------------------------------------------------
-- Poster storage: public bucket, each user uploads only into their own folder
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posters', 'posters', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "users upload posters to their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'posters' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users replace their own posters" on storage.objects
  for update to authenticated
  using (bucket_id = 'posters' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete their own posters" on storage.objects
  for delete to authenticated
  using (bucket_id = 'posters' and (storage.foldername(name))[1] = (select auth.uid())::text);
