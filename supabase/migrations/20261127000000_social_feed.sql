-- =============================================================================
-- Week 4: the social layer (DEV_PLAN §5.6, DECISIONS.md P17–P18, T28)
--
-- * set_follow_club / set_like / set_save: one call per tap. They take the state the app
--   wants ("on" or "off"), so a double tap or a retry can't flip it back by accident.
-- * create_club_post(): club teams post to their followers. Posts by clubs that Nikl has
--   approved are published straight away; photos must already be in Nikl's own storage.
-- * home_feed(): the ranked home feed (rules, no machine learning).
-- * suggested_clubs(): "Clubs you might like".
-- * A public "post-media" storage bucket, one folder per user (like posters).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Storage for post photos
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "users upload post photos to their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users replace their own post photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete their own post photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Storage only removes files the caller can also look up, so owners need to read their own folder.
-- (Everyone else reads photos through the public URL, not through this table.)
create policy "users read their own post photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- -----------------------------------------------------------------------------
-- Follow, like, save: set to the state the app asks for
-- -----------------------------------------------------------------------------
create or replace function public.set_follow_club(p_club_id uuid, p_on boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Log in to follow clubs.' using errcode = '42501';
  end if;
  if p_on then
    if not exists (select 1 from public.clubs c where c.id = p_club_id and c.review_status = 'approved') then
      raise exception 'That club isn''t on Nikl right now.' using errcode = '22023';
    end if;
    insert into public.follows (follower_id, target_type, target_id)
    values (uid, 'club', p_club_id)
    on conflict do nothing;
  else
    delete from public.follows f
    where f.follower_id = uid and f.target_type = 'club' and f.target_id = p_club_id;
  end if;
end;
$$;

create or replace function public.set_like(p_post_id uuid, p_on boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Log in to like posts.' using errcode = '42501';
  end if;
  if p_on then
    -- Runs under the caller's row rules, so only posts they can see can be liked.
    if not exists (select 1 from public.posts p where p.id = p_post_id and p.moderation_status = 'approved') then
      raise exception 'That post isn''t available.' using errcode = '22023';
    end if;
    insert into public.likes (user_id, post_id) values (uid, p_post_id) on conflict do nothing;
  else
    delete from public.likes l where l.user_id = uid and l.post_id = p_post_id;
  end if;
end;
$$;

create or replace function public.set_save(p_event_id uuid, p_on boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Log in to save events.' using errcode = '42501';
  end if;
  if p_on then
    if not exists (select 1 from public.events e where e.id = p_event_id and e.status <> 'draft') then
      raise exception 'That event isn''t available.' using errcode = '22023';
    end if;
    insert into public.saves (user_id, event_id) values (uid, p_event_id) on conflict do nothing;
  else
    delete from public.saves s where s.user_id = uid and s.event_id = p_event_id;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Club posts
-- -----------------------------------------------------------------------------
create or replace function public.create_club_post(
  p_club_id      uuid,
  p_caption      text default null,
  p_event_id     uuid default null,
  p_media_paths  text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  caption  text := nullif(trim(p_caption), '');
  paths    text[] := coalesce(p_media_paths, '{}');
  path     text;
  post_id  uuid;
  i        integer := 0;
begin
  if uid is null or not public.is_club_admin(p_club_id) then
    raise exception 'You can only post for clubs you manage.' using errcode = '42501';
  end if;
  if char_length(caption) > 2200 then
    raise exception 'Keep the caption under 2,200 characters.' using errcode = '22023';
  end if;
  if caption is null and p_event_id is null and cardinality(paths) = 0 then
    raise exception 'Add a photo, an event or a caption.' using errcode = '22023';
  end if;
  if cardinality(paths) > 5 then
    raise exception 'Add up to 5 photos.' using errcode = '22023';
  end if;
  if p_event_id is not null and not exists (
    select 1 from public.events e where e.id = p_event_id and e.club_id = p_club_id and e.status = 'published'
  ) then
    raise exception 'Pick one of your club''s upcoming events.' using errcode = '22023';
  end if;
  -- Photos must be the caller's own uploads in Nikl's storage (DECISIONS.md S11).
  foreach path in array paths loop
    if path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
       or split_part(path, '/', 1) <> uid::text
       or not exists (select 1 from storage.objects o where o.bucket_id = 'post-media' and o.name = path) then
      raise exception 'Upload the photo again.' using errcode = '22023';
    end if;
  end loop;
  -- A generous limit that still stops floods.
  if (select count(*) from public.posts p
      where p.author_type = 'club' and p.author_id = p_club_id and p.created_at > now() - interval '1 day') >= 20 then
    raise exception 'That''s 20 posts today. Try again tomorrow.' using errcode = '54000';
  end if;

  -- Clubs are reviewed by Nikl before they go public, so their posts publish straight away
  -- (still hidden while the club itself is waiting for approval). User posts are moderated.
  insert into public.posts (author_type, author_id, kind, caption, event_id, club_id, moderation_status, visibility, created_by)
  values ('club', p_club_id,
          case when cardinality(paths) > 0 then 'photo'::public.post_kind else 'event'::public.post_kind end,
          caption, p_event_id, p_club_id, 'approved', 'public', uid)
  returning id into post_id;

  foreach path in array paths loop
    insert into public.post_media (post_id, url, position) values (post_id, path, i);
    i := i + 1;
  end loop;
  return post_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Home feed v1 (DEV_PLAN §5.6). Weights are here for now; they move to remote config later.
--   newer is higher (about 1 point per 2 days) · clubs you follow +3 · event in the next 72h +2
--   matches your interests +1 · in your area +1 · a little for likes
--   posts about events that are over are hidden · at most 2 posts per club
--   "suggested" = a club you don't follow, shown only once you follow at least one club
-- Post photos are storage paths in the "post-media" bucket (the apps build the public URL).
-- -----------------------------------------------------------------------------
create or replace function public.home_feed(p_limit integer default 40)
returns table (
  post_id          uuid,
  kind             text,
  caption          text,
  created_at       timestamptz,
  media_path       text,
  club_id          uuid,
  club_name        text,
  club_handle      text,
  club_verified    boolean,
  club_category    text,
  club_logo_url    text,
  following        boolean,
  suggested        boolean,
  event_id         uuid,
  event_slug       text,
  event_title      text,
  event_category   text,
  poster_url       text,
  starts_at        timestamptz,
  venue_name       text,
  area             text,
  min_price_paise  integer,
  is_free          boolean,
  like_count       integer,
  liked            boolean,
  saved            boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select auth.uid() as uid,
           p.area,
           coalesce(p.interests, '{}') as interests,
           exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.target_type = 'club') as follows_any
    from (select 1) one
    left join public.profiles p on p.id = auth.uid()
  ),
  next_date as (
    select distinct on (o.event_id) o.event_id, o.id as occurrence_id, o.starts_at
    from public.event_occurrences o
    where o.status = 'scheduled' and coalesce(o.ends_at, o.starts_at + interval '2 hours') > now()
    order by o.event_id, o.starts_at
  ),
  candidates as (
    select p.id, p.kind::text as kind, p.caption, p.created_at,
           (select m.url from public.post_media m where m.post_id = p.id order by m.position limit 1) as media_path,
           c.id as club_id, c.name as club_name, c.handle as club_handle, c.verified as club_verified,
           c.category as club_category, c.logo_url as club_logo_url,
           (f.follower_id is not null) as following,
           e.id as event_id, e.slug as event_slug, e.title as event_title, e.category as event_category, e.poster_url,
           nd.starts_at, v.name as venue_name, coalesce(v.area, c.area) as area,
           (select min(t.price_paise) from public.ticket_tiers t where t.occurrence_id = nd.occurrence_id)::integer as min_price_paise,
           (nd.occurrence_id is not null
             and not exists (select 1 from public.ticket_tiers t where t.occurrence_id = nd.occurrence_id and t.price_paise > 0)) as is_free,
           (select count(*) from public.likes l where l.post_id = p.id)::integer as like_count,
           exists (select 1 from public.likes l where l.post_id = p.id and l.user_id = (select uid from me)) as liked,
           exists (select 1 from public.saves s where s.event_id = e.id and s.user_id = (select uid from me)) as saved
    from public.posts p
    join public.clubs c on c.id = p.author_id and c.review_status = 'approved'
    left join public.follows f
      on f.follower_id = (select uid from me) and f.target_type = 'club' and f.target_id = c.id
    left join public.events e on e.id = p.event_id
    left join next_date nd on nd.event_id = e.id
    left join public.venues v on v.id = e.venue_id
    where p.author_type = 'club'
      and p.moderation_status = 'approved'
      and p.visibility = 'public'
      and p.created_at > now() - interval '30 days'
      -- posts about an event only while it's still on
      and (p.event_id is null or (e.status = 'published' and nd.event_id is not null))
  ),
  scored as (
    select cand.*,
           ( - extract(epoch from (now() - cand.created_at)) / 172800.0
             + case when cand.following then 3 else 0 end
             + case when cand.starts_at < now() + interval '72 hours' then 2 else 0 end
             + case when coalesce(cand.event_category, cand.club_category) = any (me.interests) then 1 else 0 end
             + case when cand.area is not null and cand.area = me.area then 1 else 0 end
             + ln(1 + cand.like_count) * 0.5 ) as score
    from candidates cand
    cross join me
  ),
  capped as (
    select s.*, row_number() over (partition by s.club_id order by s.score desc) as club_rank
    from scored s
  )
  select c.id, c.kind, c.caption, c.created_at, c.media_path,
         c.club_id, c.club_name, c.club_handle, c.club_verified, c.club_category, c.club_logo_url,
         c.following, ((select follows_any from me) and not c.following) as suggested,
         c.event_id, c.event_slug, c.event_title, c.event_category, c.poster_url,
         c.starts_at, c.venue_name, c.area, c.min_price_paise, c.is_free,
         c.like_count, c.liked, c.saved
  from capped c
  where c.club_rank <= 2
  order by c.score desc, c.created_at desc
  limit least(greatest(coalesce(p_limit, 40), 1), 100);
$$;

-- -----------------------------------------------------------------------------
-- Clubs you might like: approved clubs you don't follow yet, matching your interests and area first
-- -----------------------------------------------------------------------------
create or replace function public.suggested_clubs(p_limit integer default 10)
returns table (
  club_id    uuid,
  name       text,
  handle     text,
  kind       text,
  category   text,
  area       text,
  verified   boolean,
  logo_url   text,
  followers  integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (
    select p.area, coalesce(p.interests, '{}') as interests
    from (select 1) one
    left join public.profiles p on p.id = auth.uid()
  )
  select c.id, c.name, c.handle, c.kind, c.category, c.area, c.verified, c.logo_url,
         (select count(*) from public.follows f where f.target_type = 'club' and f.target_id = c.id)::integer
  from public.clubs c
  cross join me
  where c.review_status = 'approved'
    and not exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.target_type = 'club' and f.target_id = c.id)
    and not public.is_club_admin(c.id)
  order by (c.category = any (me.interests)) desc,
           (c.area is not null and c.area = me.area) desc,
           c.verified desc, c.rating_count desc, c.name
  limit least(greatest(coalesce(p_limit, 10), 1), 30);
$$;

-- -----------------------------------------------------------------------------
-- Who can call what
-- -----------------------------------------------------------------------------
revoke execute on function public.set_follow_club(uuid, boolean) from public, anon;
revoke execute on function public.set_like(uuid, boolean) from public, anon;
revoke execute on function public.set_save(uuid, boolean) from public, anon;
revoke execute on function public.create_club_post(uuid, text, uuid, text[]) from public, anon;
grant execute on function public.set_follow_club(uuid, boolean) to authenticated;
grant execute on function public.set_like(uuid, boolean) to authenticated;
grant execute on function public.set_save(uuid, boolean) to authenticated;
grant execute on function public.create_club_post(uuid, text, uuid, text[]) to authenticated;

revoke execute on function public.home_feed(integer) from public;
revoke execute on function public.suggested_clubs(integer) from public;
grant execute on function public.home_feed(integer) to anon, authenticated;
grant execute on function public.suggested_clubs(integer) to anon, authenticated;
