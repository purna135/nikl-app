-- =============================================================================
-- Nikl · schema v1 (P0 tables)
-- -----------------------------------------------------------------------------
-- Implements DEV_PLAN.md §4 for everything that ships at launch.
-- P1-only tables (comments, squads, squad_members, messages, polls,
-- poll_votes, share_requests) come in a later migration.
--
-- Rules this file enforces:
--  * Row-level security is ON for every table. Nothing is readable or
--    writable from the apps unless a policy below allows it.
--  * MONEY AND SEATS ARE SERVER-ONLY. bookings, booking_items, payments,
--    refunds, payouts, tickets, waitlist and audit_log have NO insert/update
--    policies for app users. Only server code (Edge Functions using the
--    service role, inside transactions) may change them. Users can read their
--    own bookings/tickets; club staff can read tickets for their events.
--  * Seat counters (event_occurrences.seats_taken, ticket_tiers.sold) and
--    trust fields (clubs.verified, kyc_status, ratings) are excluded from
--    the columns app users may write.
--  * Money is stored as integer paise (₹1 = 100 paise).
--  * Phone numbers live in profiles_private (owner-only), never in the
--    publicly readable profiles table.
-- =============================================================================

create extension if not exists postgis with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.event_status        as enum ('draft', 'published', 'cancelled', 'ended');
create type public.occurrence_status   as enum ('scheduled', 'cancelled', 'ended');
-- Booking state machine, DEV_PLAN §5.1
create type public.booking_status      as enum ('held', 'payment_pending', 'failed', 'paid', 'confirmed',
                                                'expired', 'late_paid', 'cancel_requested', 'refunded', 'checked_in');
create type public.ticket_status       as enum ('valid', 'used', 'void');
create type public.post_kind           as enum ('photo', 'event', 'going');
create type public.moderation_status   as enum ('pending', 'approved', 'rejected', 'flagged');
create type public.club_role           as enum ('owner', 'admin', 'checkin');
create type public.club_member_status  as enum ('invited', 'active', 'removed');
create type public.report_status       as enum ('open', 'reviewing', 'actioned', 'dismissed');
create type public.report_target       as enum ('post', 'story', 'user', 'club', 'event');
create type public.follow_target       as enum ('club', 'user');
create type public.author_type         as enum ('club', 'user');
create type public.story_kind          as enum ('event_auto', 'custom', 'your_plan');
create type public.payment_status      as enum ('created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded');
create type public.refund_status       as enum ('pending', 'processed', 'failed');
create type public.payout_status       as enum ('pending', 'on_hold', 'processed', 'reversed', 'failed');
create type public.kyc_status          as enum ('not_started', 'pending', 'verified', 'rejected');
create type public.visibility          as enum ('public', 'friends', 'unlisted', 'private');

-- -----------------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- People
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text check (char_length(name) <= 80),
  username    text check (username ~ '^[a-z0-9._]{3,30}$'),
  avatar_url  text,
  bio         text check (char_length(bio) <= 300),
  area        text,
  interests   text[] not null default '{}',
  is_private  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index profiles_username_key on public.profiles (lower(username));
comment on table public.profiles is 'Public profile. Readable by everyone. Phone lives in profiles_private.';

create table public.profiles_private (
  id          uuid primary key references public.profiles (id) on delete cascade,
  phone       text,
  dob_year    smallint check (dob_year between 1900 and 2100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles_private is 'Owner-only personal data (phone, year of birth for the 18+ rule).';

-- Create profile rows when someone signs up with phone OTP
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'name', ''));
  insert into public.profiles_private (id, phone)
  values (new.id, new.phone);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Clubs (organizer pages) and venues
-- -----------------------------------------------------------------------------
create table public.clubs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 80),
  handle        text not null check (handle ~ '^[a-z0-9._]{3,30}$'),
  kind          text,                       -- e.g. "Run club"
  category      text not null,              -- category slug, e.g. "fitness"
  bio           text check (char_length(bio) <= 500),
  logo_url      text,
  cover_url     text,
  area          text,
  location      extensions.geography(Point, 4326),
  verified      boolean not null default false,
  kyc_status    public.kyc_status not null default 'not_started',
  rating_avg    numeric(2, 1),
  rating_count  integer not null default 0,
  created_by    uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index clubs_handle_key on public.clubs (lower(handle));
create index clubs_location_idx on public.clubs using gist (location);
create index clubs_category_idx on public.clubs (category);

-- Payout details are admin-only, so they sit in their own table
create table public.club_payout_settings (
  club_id              uuid primary key references public.clubs (id) on delete cascade,
  razorpay_account_id  text unique,
  bank_last4           text check (bank_last4 ~ '^[0-9]{4}$'),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table public.club_members (
  club_id     uuid not null references public.clubs (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        public.club_role not null default 'admin',
  status      public.club_member_status not null default 'active',
  created_at  timestamptz not null default now(),
  primary key (club_id, user_id)
);
create index club_members_user_idx on public.club_members (user_id);

create table public.venues (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  address          text,
  area             text,
  location         extensions.geography(Point, 4326),
  google_place_id  text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index venues_location_idx on public.venues using gist (location);

-- -----------------------------------------------------------------------------
-- Events
-- -----------------------------------------------------------------------------
create table public.events (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references public.clubs (id) on delete cascade,
  title            text not null check (char_length(title) between 3 and 120),
  slug             text not null check (slug ~ '^[a-z0-9-]{3,140}$'),
  category         text not null,
  description      text check (char_length(description) <= 5000),
  poster_url       text,
  venue_id         uuid references public.venues (id) on delete set null,
  visibility       public.visibility not null default 'public',
  status           public.event_status not null default 'draft',
  recurrence_rule  text,                    -- RFC 5545 RRULE, e.g. FREQ=WEEKLY;BYDAY=SU
  tags             text[] not null default '{}',
  refund_policy    text,
  age_limit        smallint check (age_limit between 0 and 99),
  women_only       boolean not null default false,
  published_at     timestamptz,
  created_by       uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index events_slug_key on public.events (slug);
create index events_club_idx on public.events (club_id);
create index events_venue_idx on public.events (venue_id);
create index events_category_status_idx on public.events (category, status);

-- One row per date, so "every Sunday" is one event with many occurrences
create table public.event_occurrences (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events (id) on delete cascade,
  starts_at    timestamptz not null,
  ends_at      timestamptz,
  capacity     integer check (capacity > 0),          -- null = no limit
  seats_taken  integer not null default 0 check (seats_taken >= 0),
  status       public.occurrence_status not null default 'scheduled',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (capacity is null or seats_taken <= capacity)
);
create index event_occurrences_event_idx on public.event_occurrences (event_id);
create index event_occurrences_starts_at_idx on public.event_occurrences (starts_at);

create table public.ticket_tiers (
  id                uuid primary key default gen_random_uuid(),
  occurrence_id     uuid not null references public.event_occurrences (id) on delete cascade,
  name              text not null,
  price_paise       integer not null check (price_paise >= 0),
  quantity          integer check (quantity > 0),     -- null = no limit
  sold              integer not null default 0 check (sold >= 0),
  seats_per_ticket  smallint not null default 1 check (seats_per_ticket >= 1),
  position          smallint not null default 0,
  sale_starts_at    timestamptz,
  sale_ends_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (quantity is null or sold <= quantity)
);
create index ticket_tiers_occurrence_idx on public.ticket_tiers (occurrence_id);

-- -----------------------------------------------------------------------------
-- Money (server-only writes)
-- -----------------------------------------------------------------------------
create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete restrict,
  occurrence_id    uuid not null references public.event_occurrences (id) on delete restrict,
  status           public.booking_status not null default 'held',
  total_paise      integer not null default 0 check (total_paise >= 0),
  fee_paise        integer not null default 0 check (fee_paise >= 0),
  hold_expires_at  timestamptz,
  going_solo       boolean not null default false,
  squad_id         uuid,                    -- FK added with the P1 squads table
  idempotency_key  text not null unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index bookings_user_idx on public.bookings (user_id);
create index bookings_occurrence_idx on public.bookings (occurrence_id);
create index bookings_hold_expiry_idx on public.bookings (hold_expires_at) where status in ('held', 'payment_pending');

create table public.booking_items (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references public.bookings (id) on delete cascade,
  tier_id           uuid not null references public.ticket_tiers (id) on delete restrict,
  qty               integer not null check (qty > 0),
  unit_price_paise  integer not null check (unit_price_paise >= 0),
  created_at        timestamptz not null default now()
);
create index booking_items_booking_idx on public.booking_items (booking_id);
create index booking_items_tier_idx on public.booking_items (tier_id);

create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  booking_id           uuid not null references public.bookings (id) on delete restrict,
  provider             text not null default 'razorpay',
  provider_order_id    text unique,
  provider_payment_id  text unique,
  method               text,                -- upi, card, netbanking … (never credentials)
  amount_paise         integer not null check (amount_paise >= 0),
  status               public.payment_status not null default 'created',
  raw_webhook          jsonb,               -- redacted payload, for reconciliation
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index payments_booking_idx on public.payments (booking_id);

create table public.refunds (
  id                  uuid primary key default gen_random_uuid(),
  payment_id          uuid not null references public.payments (id) on delete restrict,
  amount_paise        integer not null check (amount_paise >= 0),
  reason              text,
  provider_refund_id  text unique,
  status              public.refund_status not null default 'pending',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index refunds_payment_idx on public.refunds (payment_id);

create table public.payouts (
  id                    uuid primary key default gen_random_uuid(),
  club_id               uuid not null references public.clubs (id) on delete restrict,
  provider_transfer_id  text unique,
  amount_paise          integer not null check (amount_paise >= 0),
  status                public.payout_status not null default 'pending',
  on_hold_until         timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index payouts_club_idx on public.payouts (club_id);

create table public.tickets (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings (id) on delete restrict,
  user_id         uuid not null references public.profiles (id) on delete restrict,
  occurrence_id   uuid not null references public.event_occurrences (id) on delete restrict,
  code            text not null unique,     -- human-readable entry code, e.g. NKL-R5K2
  qr_token        text,                     -- signed token (DEV_PLAN §5.5)
  status          public.ticket_status not null default 'valid',
  checked_in_at   timestamptz,
  checked_in_by   uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index tickets_booking_idx on public.tickets (booking_id);
create index tickets_user_idx on public.tickets (user_id);
create index tickets_occurrence_idx on public.tickets (occurrence_id);

create table public.waitlist (
  id             uuid primary key default gen_random_uuid(),
  occurrence_id  uuid not null references public.event_occurrences (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  position       integer not null,
  notified_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (occurrence_id, user_id)
);
create index waitlist_user_idx on public.waitlist (user_id);

-- -----------------------------------------------------------------------------
-- Social
-- -----------------------------------------------------------------------------
create table public.follows (
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  target_type  public.follow_target not null,
  target_id    uuid not null,               -- club id or profile id
  created_at   timestamptz not null default now(),
  primary key (follower_id, target_type, target_id)
);
create index follows_target_idx on public.follows (target_type, target_id);

create table public.posts (
  id                 uuid primary key default gen_random_uuid(),
  author_type        public.author_type not null,
  author_id          uuid not null,         -- club id or profile id
  kind               public.post_kind not null default 'photo',
  caption            text check (char_length(caption) <= 2200),
  event_id           uuid references public.events (id) on delete set null,
  club_id            uuid references public.clubs (id) on delete set null,   -- tagged club
  moderation_status  public.moderation_status not null default 'pending',
  visibility         public.visibility not null default 'public',
  created_by         uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_idx on public.posts (author_type, author_id, created_at desc);
create index posts_event_idx on public.posts (event_id);
create index posts_club_idx on public.posts (club_id);

create table public.post_media (
  id                 uuid primary key default gen_random_uuid(),
  post_id            uuid not null references public.posts (id) on delete cascade,
  url                text not null,
  width              integer,
  height             integer,
  blurhash           text,
  position           smallint not null default 0 check (position between 0 and 4),   -- 1–5 photos
  moderation_labels  jsonb,
  created_at         timestamptz not null default now()
);
create index post_media_post_idx on public.post_media (post_id);

create table public.post_tags (
  post_id         uuid not null references public.posts (id) on delete cascade,
  tagged_user_id  uuid not null references public.profiles (id) on delete cascade,
  accepted        boolean not null default false,
  created_at      timestamptz not null default now(),
  primary key (post_id, tagged_user_id)
);
create index post_tags_user_idx on public.post_tags (tagged_user_id);

create table public.likes (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  post_id     uuid not null references public.posts (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index likes_post_idx on public.likes (post_id);

create table public.saves (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  event_id    uuid not null references public.events (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);
create index saves_event_idx on public.saves (event_id);

create table public.stories (
  id                 uuid primary key default gen_random_uuid(),
  author_type        public.author_type not null,
  author_id          uuid not null,
  kind               public.story_kind not null default 'custom',
  event_id           uuid references public.events (id) on delete cascade,
  media_url          text,
  template           jsonb,                 -- auto-stories are rendered from data (DEV_PLAN §5.2)
  moderation_status  public.moderation_status not null default 'pending',
  expires_at         timestamptz not null default (now() + interval '24 hours'),
  created_by         uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now()
);
create index stories_author_idx on public.stories (author_type, author_id, expires_at desc);
create index stories_expires_idx on public.stories (expires_at);
create index stories_event_idx on public.stories (event_id);

create table public.story_views (
  story_id   uuid not null references public.stories (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  viewed_at  timestamptz not null default now(),
  primary key (story_id, user_id)
);
create index story_views_user_idx on public.story_views (user_id);

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  type          text not null,              -- friend_going, new_event, reminder, follow, like …
  actor_type    public.author_type,
  actor_id      uuid,
  target_type   text,
  target_id     uuid,
  data          jsonb not null default '{}',
  read_at       timestamptz,
  push_sent_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Trust & safety
-- -----------------------------------------------------------------------------
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type  public.report_target not null,
  target_id    uuid not null,
  reason       text not null,
  details      text check (char_length(details) <= 1000),
  status       public.report_status not null default 'open',
  reviewed_by  uuid references public.profiles (id) on delete set null,
  action       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at);
create index reports_reporter_idx on public.reports (reporter_id);

create table public.blocks (
  user_id          uuid not null references public.profiles (id) on delete cascade,
  blocked_user_id  uuid not null references public.profiles (id) on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (user_id, blocked_user_id),
  check (user_id <> blocked_user_id)
);
create index blocks_blocked_idx on public.blocks (blocked_user_id);

-- -----------------------------------------------------------------------------
-- City Passport
-- -----------------------------------------------------------------------------
create table public.badges (
  id           text primary key,            -- slug, e.g. early_bird
  name         text not null,
  description  text,
  icon         text,
  created_at   timestamptz not null default now()
);

create table public.user_badges (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  badge_id   text not null references public.badges (id) on delete cascade,
  earned_at  timestamptz not null default now(),
  primary key (user_id, badge_id)
);

-- -----------------------------------------------------------------------------
-- Audit log (admin and money actions; server-only)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid,
  action       text not null,
  entity_type  text not null,
  entity_id    text,
  before       jsonb,
  after        jsonb,
  created_at   timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'profiles_private', 'clubs', 'club_payout_settings', 'venues', 'events',
    'event_occurrences', 'ticket_tiers', 'bookings', 'payments', 'refunds', 'payouts',
    'tickets', 'posts', 'reports'
  ] loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Permission helpers (security definer, so policies don't recurse)
-- -----------------------------------------------------------------------------
create or replace function public.is_club_admin(club uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.club_members m
    where m.club_id = club
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
      and m.status = 'active'
  );
$$;

create or replace function public.is_club_owner(club uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.club_members m
    where m.club_id = club and m.user_id = auth.uid() and m.role = 'owner' and m.status = 'active'
  );
$$;

-- Owners, admins and check-in staff (door volunteers)
create or replace function public.is_club_staff(club uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.club_members m
    where m.club_id = club and m.user_id = auth.uid() and m.status = 'active'
  );
$$;

create or replace function public.can_manage_event(ev uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.events e where e.id = ev and public.is_club_admin(e.club_id));
$$;

-- Visible to the public (published/ended/cancelled and public or unlisted), or managed by the caller
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
      and ((e.status <> 'draft' and e.visibility in ('public', 'unlisted')) or public.is_club_admin(e.club_id))
  );
$$;

create or replace function public.occurrence_visible(occ uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.event_occurrences o where o.id = occ and public.event_visible(o.event_id));
$$;

create or replace function public.can_manage_occurrence(occ uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.event_occurrences o where o.id = occ and public.can_manage_event(o.event_id));
$$;

create or replace function public.can_staff_occurrence(occ uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_occurrences o
    join public.events e on e.id = o.event_id
    where o.id = occ and public.is_club_staff(e.club_id)
  );
$$;

-- Author of a post: the user themself, or an admin of the club that posted it
create or replace function public.can_edit_post(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.posts x
    where x.id = p
      and ((x.author_type = 'user' and x.author_id = auth.uid())
        or (x.author_type = 'club' and public.is_club_admin(x.author_id)))
  );
$$;

-- Whoever creates a club becomes its owner
create or replace function public.handle_new_club()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.club_members (club_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_club_created
  after insert on public.clubs
  for each row execute function public.handle_new_club();

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.profiles_private      enable row level security;
alter table public.clubs                 enable row level security;
alter table public.club_payout_settings  enable row level security;
alter table public.club_members          enable row level security;
alter table public.venues                enable row level security;
alter table public.events                enable row level security;
alter table public.event_occurrences     enable row level security;
alter table public.ticket_tiers          enable row level security;
alter table public.bookings              enable row level security;
alter table public.booking_items         enable row level security;
alter table public.payments              enable row level security;
alter table public.refunds               enable row level security;
alter table public.payouts               enable row level security;
alter table public.tickets               enable row level security;
alter table public.waitlist              enable row level security;
alter table public.follows               enable row level security;
alter table public.posts                 enable row level security;
alter table public.post_media            enable row level security;
alter table public.post_tags             enable row level security;
alter table public.likes                 enable row level security;
alter table public.saves                 enable row level security;
alter table public.stories               enable row level security;
alter table public.story_views           enable row level security;
alter table public.notifications         enable row level security;
alter table public.reports               enable row level security;
alter table public.blocks                enable row level security;
alter table public.badges                enable row level security;
alter table public.user_badges           enable row level security;
alter table public.audit_log             enable row level security;

-- profiles: public read, owner updates own row
create policy "profiles are public" on public.profiles
  for select to anon, authenticated using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- profiles_private: owner can read; changes go through the server (phone comes from auth)
create policy "users read own private profile" on public.profiles_private
  for select to authenticated using (id = auth.uid());

-- clubs: public read; any signed-in user can create a club; admins edit safe columns
create policy "clubs are public" on public.clubs
  for select to anon, authenticated using (true);
create policy "signed-in users create clubs" on public.clubs
  for insert to authenticated with check (created_by = auth.uid());
create policy "club admins update their club" on public.clubs
  for update to authenticated using (public.is_club_admin(id)) with check (public.is_club_admin(id));

create policy "club admins read payout settings" on public.club_payout_settings
  for select to authenticated using (public.is_club_admin(club_id));

-- club_members: members see their own rows; admins see the team; owners manage it
create policy "members and admins read team" on public.club_members
  for select to authenticated using (user_id = auth.uid() or public.is_club_admin(club_id));
create policy "owners add members" on public.club_members
  for insert to authenticated with check (public.is_club_owner(club_id));
create policy "owners update members" on public.club_members
  for update to authenticated using (public.is_club_owner(club_id)) with check (public.is_club_owner(club_id));
create policy "owners remove members" on public.club_members
  for delete to authenticated using (public.is_club_owner(club_id));

-- venues: public read; signed-in organizers can add venues
create policy "venues are public" on public.venues
  for select to anon, authenticated using (true);
create policy "signed-in users add venues" on public.venues
  for insert to authenticated with check (true);

-- events: public sees published public/unlisted events; club admins manage their own
create policy "published events are public" on public.events
  for select to anon, authenticated
  using ((status <> 'draft' and visibility in ('public', 'unlisted')) or public.is_club_admin(club_id));
create policy "club admins create events" on public.events
  for insert to authenticated with check (public.is_club_admin(club_id));
create policy "club admins update events" on public.events
  for update to authenticated using (public.is_club_admin(club_id)) with check (public.is_club_admin(club_id));
create policy "club admins delete draft events" on public.events
  for delete to authenticated using (public.is_club_admin(club_id) and status = 'draft');

create policy "occurrences of visible events are public" on public.event_occurrences
  for select to anon, authenticated using (public.event_visible(event_id));
create policy "club admins create occurrences" on public.event_occurrences
  for insert to authenticated with check (public.can_manage_event(event_id));
create policy "club admins update occurrences" on public.event_occurrences
  for update to authenticated using (public.can_manage_event(event_id)) with check (public.can_manage_event(event_id));
create policy "club admins delete occurrences" on public.event_occurrences
  for delete to authenticated using (public.can_manage_event(event_id));

create policy "tiers of visible events are public" on public.ticket_tiers
  for select to anon, authenticated using (public.occurrence_visible(occurrence_id));
create policy "club admins create tiers" on public.ticket_tiers
  for insert to authenticated with check (public.can_manage_occurrence(occurrence_id));
create policy "club admins update tiers" on public.ticket_tiers
  for update to authenticated using (public.can_manage_occurrence(occurrence_id)) with check (public.can_manage_occurrence(occurrence_id));
create policy "club admins delete tiers" on public.ticket_tiers
  for delete to authenticated using (public.can_manage_occurrence(occurrence_id));

-- money: read-only for the people involved, NO client writes
create policy "users read own bookings" on public.bookings
  for select to authenticated using (user_id = auth.uid() or public.can_manage_occurrence(occurrence_id));
create policy "users read own booking items" on public.booking_items
  for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
create policy "users read own payments" on public.payments
  for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid()));
create policy "users read own refunds" on public.refunds
  for select to authenticated
  using (exists (
    select 1 from public.payments p join public.bookings b on b.id = p.booking_id
    where p.id = payment_id and b.user_id = auth.uid()));
create policy "club admins read payouts" on public.payouts
  for select to authenticated using (public.is_club_admin(club_id));
create policy "users and club staff read tickets" on public.tickets
  for select to authenticated using (user_id = auth.uid() or public.can_staff_occurrence(occurrence_id));
create policy "users read own waitlist entries" on public.waitlist
  for select to authenticated using (user_id = auth.uid());
-- audit_log: RLS on, no policies, so only the service role can touch it.

-- follows: public (for follower counts); users manage their own
create policy "follows are public" on public.follows
  for select to anon, authenticated using (true);
create policy "users follow" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());
create policy "users unfollow" on public.follows
  for delete to authenticated using (follower_id = auth.uid());

-- posts: approved public posts are public; authors see their own (incl. pending)
-- Friends-only visibility is enforced once the friends graph lands; until then only public posts are shared.
create policy "approved public posts are public" on public.posts
  for select to anon, authenticated
  using ((moderation_status = 'approved' and visibility = 'public')
      or (author_type = 'user' and author_id = auth.uid())
      or (author_type = 'club' and public.is_club_admin(author_id)));
create policy "users and club admins create posts" on public.posts
  for insert to authenticated
  with check (moderation_status = 'pending'
    and created_by = auth.uid()
    and ((author_type = 'user' and author_id = auth.uid())
      or (author_type = 'club' and public.is_club_admin(author_id))));
create policy "authors edit posts" on public.posts
  for update to authenticated using (public.can_edit_post(id)) with check (public.can_edit_post(id));
create policy "authors delete posts" on public.posts
  for delete to authenticated using (public.can_edit_post(id));

-- post_media follows the post's visibility (the subquery runs under posts' RLS)
create policy "media of visible posts is public" on public.post_media
  for select to anon, authenticated using (exists (select 1 from public.posts p where p.id = post_id));
create policy "authors add media" on public.post_media
  for insert to authenticated with check (public.can_edit_post(post_id));
create policy "authors delete media" on public.post_media
  for delete to authenticated using (public.can_edit_post(post_id));

create policy "tags visible to tagged user, author, or when accepted" on public.post_tags
  for select to anon, authenticated
  using (tagged_user_id = auth.uid() or public.can_edit_post(post_id)
      or (accepted and exists (select 1 from public.posts p where p.id = post_id)));
create policy "authors tag friends" on public.post_tags
  for insert to authenticated with check (public.can_edit_post(post_id) and accepted = false);
create policy "tagged users accept" on public.post_tags
  for update to authenticated using (tagged_user_id = auth.uid()) with check (tagged_user_id = auth.uid());
create policy "tagged users or authors remove tags" on public.post_tags
  for delete to authenticated using (tagged_user_id = auth.uid() or public.can_edit_post(post_id));

create policy "likes are public" on public.likes
  for select to anon, authenticated using (true);
create policy "users like" on public.likes
  for insert to authenticated with check (user_id = auth.uid());
create policy "users unlike" on public.likes
  for delete to authenticated using (user_id = auth.uid());

create policy "users read own saves" on public.saves
  for select to authenticated using (user_id = auth.uid());
create policy "users save" on public.saves
  for insert to authenticated with check (user_id = auth.uid());
create policy "users unsave" on public.saves
  for delete to authenticated using (user_id = auth.uid());

-- stories: live approved stories are public; authors see their own
create policy "live approved stories are public" on public.stories
  for select to anon, authenticated
  using ((moderation_status = 'approved' and expires_at > now())
      or (author_type = 'user' and author_id = auth.uid())
      or (author_type = 'club' and public.is_club_admin(author_id)));
create policy "users and club admins create stories" on public.stories
  for insert to authenticated
  with check (moderation_status = 'pending'
    and kind <> 'event_auto'
    and created_by = auth.uid()
    and ((author_type = 'user' and author_id = auth.uid() and kind = 'your_plan')
      or (author_type = 'club' and public.is_club_admin(author_id) and kind = 'custom')));
create policy "authors delete stories" on public.stories
  for delete to authenticated
  using ((author_type = 'user' and author_id = auth.uid()) or (author_type = 'club' and public.is_club_admin(author_id)));

create policy "users read own story views" on public.story_views
  for select to authenticated using (user_id = auth.uid());
create policy "users mark stories seen" on public.story_views
  for insert to authenticated with check (user_id = auth.uid());

create policy "users read own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "users mark notifications read" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users file reports" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "users read own reports" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

create policy "users read own blocks" on public.blocks
  for select to authenticated using (user_id = auth.uid());
create policy "users block" on public.blocks
  for insert to authenticated with check (user_id = auth.uid());
create policy "users unblock" on public.blocks
  for delete to authenticated using (user_id = auth.uid());

create policy "badges are public" on public.badges
  for select to anon, authenticated using (true);
create policy "earned badges are public" on public.user_badges
  for select to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- Column-level write limits (policies decide WHICH rows; these decide WHICH columns)
-- -----------------------------------------------------------------------------
-- profiles: users may edit their public fields only
revoke insert, update on public.profiles from anon, authenticated;
grant update (name, username, avatar_url, bio, area, interests, is_private) on public.profiles to authenticated;

revoke insert, update, delete on public.profiles_private from anon, authenticated;

-- clubs: trust fields (verified, kyc_status, ratings) are server-only
revoke insert, update on public.clubs from anon, authenticated;
grant insert (name, handle, kind, category, bio, logo_url, cover_url, area, location) on public.clubs to authenticated;
grant update (name, handle, kind, category, bio, logo_url, cover_url, area, location) on public.clubs to authenticated;

revoke insert, update, delete on public.club_payout_settings from anon, authenticated;

-- seat counters are server-only
revoke insert, update on public.event_occurrences from anon, authenticated;
grant insert (event_id, starts_at, ends_at, capacity, status) on public.event_occurrences to authenticated;
grant update (starts_at, ends_at, capacity, status) on public.event_occurrences to authenticated;

revoke insert, update on public.ticket_tiers from anon, authenticated;
grant insert (occurrence_id, name, price_paise, quantity, seats_per_ticket, position, sale_starts_at, sale_ends_at)
  on public.ticket_tiers to authenticated;
grant update (name, price_paise, quantity, seats_per_ticket, position, sale_starts_at, sale_ends_at)
  on public.ticket_tiers to authenticated;

-- posts: authors can change caption and visibility, never moderation status
revoke update on public.posts from anon, authenticated;
grant update (caption, visibility) on public.posts to authenticated;

-- post_tags: only the accepted flag can change
revoke update on public.post_tags from anon, authenticated;
grant update (accepted) on public.post_tags to authenticated;

-- notifications: only read_at can change
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- money tables: belt and braces on top of "no policies"
revoke insert, update, delete on
  public.bookings, public.booking_items, public.payments, public.refunds,
  public.payouts, public.tickets, public.waitlist, public.audit_log,
  public.user_badges, public.badges
from anon, authenticated;
