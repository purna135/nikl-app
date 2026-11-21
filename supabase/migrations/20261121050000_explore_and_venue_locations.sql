-- =============================================================================
-- Week 3: map pins and Explore
--
-- * venues.lat / venues.lng: plain numbers derived from the PostGIS location, easy for the apps to read.
-- * create_event(): now accepts a map pin (p_venue_lat / p_venue_lng) for new venues.
-- * explore_events(): one row per upcoming public event (its next date in the window), for the
--   map, lists and the home feed. Runs as the caller, so the normal visibility rules apply too.
-- =============================================================================

alter table public.venues
  add column lat double precision generated always as (extensions.st_y(location::extensions.geometry)) stored,
  add column lng double precision generated always as (extensions.st_x(location::extensions.geometry)) stored;

-- -----------------------------------------------------------------------------
-- create_event() v2: same as before, plus an optional map pin for the venue
-- -----------------------------------------------------------------------------
drop function public.create_event(uuid, text, text, timestamptz, timestamptz, text, text, uuid, text, text, text,
                                  integer, integer, jsonb, boolean, text[]);

create function public.create_event(
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
  p_tags           text[] default '{}',
  p_venue_lat      double precision default null,
  p_venue_lng      double precision default null
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
  if (p_venue_lat is null) <> (p_venue_lng is null) then
    raise exception 'Drop the map pin again.' using errcode = '22023';
  end if;
  -- India only for now (generous box around the country)
  if p_venue_lat is not null and (p_venue_lat not between 6 and 37 or p_venue_lng not between 68 and 98) then
    raise exception 'The map pin has to be in India.' using errcode = '22023';
  end if;

  if v_id is null and nullif(trim(p_venue_name), '') is not null then
    insert into public.venues (name, address, area, location)
    values (trim(p_venue_name), nullif(trim(p_venue_address), ''), nullif(trim(p_venue_area), ''),
            case when p_venue_lat is null then null
                 else extensions.st_setsrid(extensions.st_makepoint(p_venue_lng, p_venue_lat), 4326)::extensions.geography end)
    returning id into v_id;
  end if;

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

  dur := p_ends_at - p_starts_at;
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
        values (occ_id, trim(r.t ->> 'name'), coalesce((r.t ->> 'price_paise')::integer, 0),
                nullif(r.t ->> 'quantity', '')::integer,
                coalesce(nullif(r.t ->> 'seats_per_ticket', '')::smallint, 1), (r.pos - 1)::smallint);
      end loop;
    end if;
  end loop;

  return ev_id;
end;
$$;

revoke execute on function public.create_event(uuid, text, text, timestamptz, timestamptz, text, text, uuid, text, text, text,
                                               integer, integer, jsonb, boolean, text[], double precision, double precision)
  from public, anon;
grant execute on function public.create_event(uuid, text, text, timestamptz, timestamptz, text, text, uuid, text, text, text,
                                              integer, integer, jsonb, boolean, text[], double precision, double precision)
  to authenticated;

-- -----------------------------------------------------------------------------
-- explore_events(): what's on, for the map / lists / home feed
-- -----------------------------------------------------------------------------
create or replace function public.explore_events(
  p_from  timestamptz default now(),
  p_to    timestamptz default now() + interval '60 days'
)
returns table (
  event_id         uuid,
  slug             text,
  title            text,
  category         text,
  poster_url       text,
  tags             text[],
  occurrence_id    uuid,
  starts_at        timestamptz,
  ends_at          timestamptz,
  more_dates       integer,
  venue_name       text,
  area             text,
  lat              double precision,
  lng              double precision,
  min_price_paise  integer,
  is_free          boolean,
  spots_left       integer,
  going            integer,
  club_name        text,
  club_handle      text,
  club_verified    boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with dates as (
    select o.*,
           row_number() over (partition by o.event_id order by o.starts_at) as rn,
           count(*) over (partition by o.event_id) as n
    from public.event_occurrences o
    where o.status = 'scheduled'
      and o.starts_at < p_to
      -- include events that are still going on (started, not yet ended)
      and coalesce(o.ends_at, o.starts_at + interval '2 hours') > p_from
  )
  select e.id, e.slug, e.title, e.category, e.poster_url, e.tags,
         d.id, d.starts_at, d.ends_at, (d.n - 1)::integer,
         v.name, coalesce(v.area, c.area), v.lat, v.lng,
         (select min(t.price_paise) from public.ticket_tiers t where t.occurrence_id = d.id)::integer,
         not exists (select 1 from public.ticket_tiers t where t.occurrence_id = d.id and t.price_paise > 0),
         case when d.capacity is null then null else greatest(d.capacity - d.seats_taken, 0) end,
         d.seats_taken,
         c.name, c.handle, c.verified
  from dates d
  join public.events e on e.id = d.event_id
  join public.clubs c on c.id = e.club_id
  left join public.venues v on v.id = e.venue_id
  where d.rn = 1
    and e.status = 'published'
    and e.visibility = 'public'
    and c.review_status = 'approved'
  order by d.starts_at
  limit 500;
$$;

revoke execute on function public.explore_events(timestamptz, timestamptz) from public;
grant execute on function public.explore_events(timestamptz, timestamptz) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- set_event_pin(): add, move or remove an event's map pin after it was created.
-- Gives the event its own copy of the venue with the new pin, so venues shared by
-- other events (or other clubs) are never changed.
-- -----------------------------------------------------------------------------
create or replace function public.set_event_pin(p_event_id uuid, p_lat double precision default null, p_lng double precision default null)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ev        record;
  new_venue uuid;
begin
  select e.club_id, v.name, v.address, v.area into ev
  from public.events e
  left join public.venues v on v.id = e.venue_id
  where e.id = p_event_id;
  if not found or not public.is_club_admin(ev.club_id) then
    raise exception 'You can only change events you manage.' using errcode = '42501';
  end if;
  if (p_lat is null) <> (p_lng is null) then
    raise exception 'Drop the map pin again.' using errcode = '22023';
  end if;
  if p_lat is not null and (p_lat not between 6 and 37 or p_lng not between 68 and 98) then
    raise exception 'The map pin has to be in India.' using errcode = '22023';
  end if;
  if ev.name is null then
    raise exception 'Add a venue name first.' using errcode = '22023';
  end if;

  insert into public.venues (name, address, area, location)
  values (ev.name, ev.address, ev.area,
          case when p_lat is null then null
               else extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography end)
  returning id into new_venue;
  update public.events set venue_id = new_venue where id = p_event_id;
end;
$$;

revoke execute on function public.set_event_pin(uuid, double precision, double precision) from public, anon;
grant execute on function public.set_event_pin(uuid, double precision, double precision) to authenticated;
