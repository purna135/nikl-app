-- =============================================================================
-- Week 5: stories, user posts, moderation, report and block (DEV_PLAN §5.2–5.3,
-- DECISIONS.md P19–P22, T29)
--
-- * Moderation switch (app_settings.moderation_mode): "review" = user photos and text wait for a
--   Nikl admin (until automatic image/text checks exist); "publish" = they go out straight away.
-- * Stories: club photo stories, automatic story when a club publishes an event, "Your plans"
--   stories from users (event card only = no review needed), story_feed() grouped by author.
-- * User posts with 1–5 photos, optional event tag (an event you saved), public or friends-only.
-- * Following people (set_follow_user), friends = people who follow each other.
-- * Follow lists are private; counts stay public through follower_count() / following_count().
-- * Reports (3 different people → the post or story is hidden until reviewed), blocks, and the
--   Nikl admin moderation queue.
-- Story photos, like post photos, are storage paths in the "post-media" bucket (DECISIONS.md S13).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Settings and helpers
-- -----------------------------------------------------------------------------
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null
);
alter table public.app_settings enable row level security;
create policy "admins read settings" on public.app_settings
  for select to authenticated using (public.is_platform_admin());

insert into public.app_settings (key, value) values ('moderation_mode', '"review"');

-- Nikl admins can look up and delete any post or story photo (removing content deletes its files).
create policy "admins read post photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'post-media' and public.is_platform_admin());
create policy "admins delete post photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'post-media' and public.is_platform_admin());

alter table public.posts   add column moderation_note text check (char_length(moderation_note) <= 300);
alter table public.stories add column moderation_note text check (char_length(moderation_note) <= 300);

create unique index reports_one_open_per_target on public.reports (reporter_id, target_type, target_id) where status = 'open';

-- Status for new user-made photos and text.
create or replace function public.moderation_default()
returns public.moderation_status
language sql
stable
security definer
set search_path = ''
as $$
  select case when coalesce((select s.value #>> '{}' from public.app_settings s where s.key = 'moderation_mode'), 'review') = 'publish'
              then 'approved'::public.moderation_status
              else 'pending'::public.moderation_status end;
$$;

create or replace function public.is_follower(follower uuid, target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select follower is not null and exists (
    select 1 from public.follows f
    where f.follower_id = follower and f.target_type = 'user' and f.target_id = target_user);
$$;

-- Friends = two people who follow each other.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_follower(a, b) and public.is_follower(b, a);
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a is not null and b is not null and exists (
    select 1 from public.blocks x
    where (x.user_id = a and x.blocked_user_id = b) or (x.user_id = b and x.blocked_user_id = a));
$$;

-- Row rules and apps may only ask about the signed-in person ("do I follow X?", "is X my friend?",
-- "have X and I blocked each other?"); the general helpers above are for the database's own functions,
-- so nobody can probe other people's follows or blocks (DECISIONS.md P19).
create or replace function public.i_follow(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_follower(auth.uid(), target);
$$;

create or replace function public.is_my_friend(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.are_friends(auth.uid(), other);
$$;

create or replace function public.blocked_with_me(other uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_blocked_between(auth.uid(), other);
$$;

revoke execute on function public.is_follower(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.are_friends(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.i_follow(uuid) from public;
revoke execute on function public.is_my_friend(uuid) from public;
revoke execute on function public.blocked_with_me(uuid) from public;
grant execute on function public.i_follow(uuid) to anon, authenticated;
grant execute on function public.is_my_friend(uuid) to anon, authenticated;
grant execute on function public.blocked_with_me(uuid) to anon, authenticated;

-- Photo paths: the caller's own uploads in Nikl storage (S13).
create or replace function public.valid_media_path(path text, owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
     and split_part(path, '/', 1) = owner::text
     and exists (select 1 from storage.objects o where o.bucket_id = 'post-media' and o.name = path);
$$;

-- -----------------------------------------------------------------------------
-- Follow lists are private; counts are public (DECISIONS.md P19)
-- -----------------------------------------------------------------------------
drop policy "follows are public" on public.follows;
create policy "people see their own follows and followers" on public.follows
  for select to authenticated
  using (follower_id = auth.uid()
      or (target_type = 'user' and target_id = auth.uid())
      or (target_type = 'club' and public.is_club_admin(target_id)));

create or replace function public.follower_count(p_target_type public.follow_target, p_target_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.follows f where f.target_type = p_target_type and f.target_id = p_target_id;
$$;

create or replace function public.following_count(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.follows f where f.follower_id = p_user_id;
$$;

-- Who liked what is private like follows (P19); counts stay public.
drop policy "likes are public" on public.likes;
create policy "people see their own likes" on public.likes
  for select to authenticated using (user_id = auth.uid());

create or replace function public.like_count(p_post_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.likes l where l.post_id = p_post_id;
$$;
revoke execute on function public.like_count(uuid) from public;
grant execute on function public.like_count(uuid) to anon, authenticated;

-- suggested_clubs counted followers by reading follows directly; use the public count now.
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
         public.follower_count('club', c.id)
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
-- Posts, stories, reports and follows change only through the functions above, which check the
-- rules (photos from Nikl storage, limits, review, the 3-report rule, blocks). Approved posts can't be
-- edited (an edit would skip review); people can still delete their own posts and stories.
-- -----------------------------------------------------------------------------
drop policy "users and club admins create posts" on public.posts;
drop policy "authors edit posts" on public.posts;
revoke update on public.posts from anon, authenticated;
drop policy "authors add media" on public.post_media;
drop policy "users and club admins create stories" on public.stories;
drop policy "users file reports" on public.reports;

drop policy "users follow" on public.follows;
create policy "users follow" on public.follows
  for insert to authenticated
  with check (follower_id = auth.uid()
    and ((target_type = 'club' and public.club_is_live(target_id))
         or (target_type = 'user' and target_id <> auth.uid() and not public.blocked_with_me(target_id)
             and exists (select 1 from public.profiles p where p.id = target_id and p.username is not null))));

-- -----------------------------------------------------------------------------
-- Who can see posts and stories (friends-only posts, blocks, user stories for followers)
-- -----------------------------------------------------------------------------
drop policy "approved public posts are public" on public.posts;
create policy "visible posts" on public.posts
  for select to anon, authenticated
  using ((moderation_status = 'approved' and (
            (author_type = 'club' and visibility = 'public' and public.club_is_live(author_id))
            or (author_type = 'user'
                and not public.blocked_with_me(author_id)
                and (visibility = 'public'
                     or (visibility = 'friends' and public.is_my_friend(author_id))))))
      or (author_type = 'user' and author_id = auth.uid())
      or (author_type = 'club' and public.is_club_admin(author_id)));

drop policy "live approved stories are public" on public.stories;
create policy "visible stories" on public.stories
  for select to anon, authenticated
  using ((moderation_status = 'approved' and expires_at > now() and (
            (author_type = 'club' and public.club_is_live(author_id))
            or (author_type = 'user'
                and public.i_follow(author_id)
                and not public.blocked_with_me(author_id))))
      or (author_type = 'user' and author_id = auth.uid())
      or (author_type = 'club' and public.is_club_admin(author_id)));

-- -----------------------------------------------------------------------------
-- Follow people, block people
-- -----------------------------------------------------------------------------
create or replace function public.set_follow_user(p_user_id uuid, p_on boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Log in to follow people.' using errcode = '42501';
  end if;
  if p_on then
    if p_user_id = uid then
      raise exception 'You can''t follow yourself.' using errcode = '22023';
    end if;
    if not exists (select 1 from public.profiles p where p.id = p_user_id and p.username is not null)
       or public.blocked_with_me(p_user_id) then
      raise exception 'That person isn''t available.' using errcode = '22023';
    end if;
    insert into public.follows (follower_id, target_type, target_id)
    values (uid, 'user', p_user_id)
    on conflict do nothing;
  else
    delete from public.follows f where f.follower_id = uid and f.target_type = 'user' and f.target_id = p_user_id;
  end if;
end;
$$;

-- Blocking also removes follows both ways (they can't see each other's posts or stories).
create or replace function public.set_block(p_user_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Log in to block people.' using errcode = '42501';
  end if;
  if p_user_id = uid then
    raise exception 'You can''t block yourself.' using errcode = '22023';
  end if;
  if p_on then
    insert into public.blocks (user_id, blocked_user_id) values (uid, p_user_id) on conflict do nothing;
    delete from public.follows f
    where f.target_type = 'user'
      and ((f.follower_id = uid and f.target_id = p_user_id) or (f.follower_id = p_user_id and f.target_id = uid));
  else
    delete from public.blocks b where b.user_id = uid and b.blocked_user_id = p_user_id;
  end if;
end;
$$;

-- A person's public profile, for their profile screen.
create or replace function public.user_profile(p_username text)
returns table (
  user_id       uuid,
  name          text,
  username      text,
  avatar_url    text,
  bio           text,
  area          text,
  followers     integer,
  following     integer,
  is_me         boolean,
  i_follow      boolean,
  follows_me    boolean,
  blocked_by_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.name, p.username, p.avatar_url, p.bio, p.area,
         public.follower_count('user', p.id), public.following_count(p.id),
         coalesce(p.id = auth.uid(), false),
         public.is_follower(auth.uid(), p.id),
         public.is_follower(p.id, auth.uid()),
         exists (select 1 from public.blocks b where b.user_id = auth.uid() and b.blocked_user_id = p.id)
  from public.profiles p
  where lower(p.username) = lower(p_username)
    -- someone who blocked you doesn't show up for you
    and not exists (select 1 from public.blocks b where b.user_id = p.id and b.blocked_user_id = auth.uid());
$$;

-- -----------------------------------------------------------------------------
-- User posts
-- -----------------------------------------------------------------------------
create or replace function public.create_user_post(
  p_media_paths  text[],
  p_caption      text default null,
  p_event_id     uuid default null,
  p_visibility   text default 'public'
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
  if uid is null then
    raise exception 'Log in to post.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = uid and p.username is not null) then
    raise exception 'Set up your profile first.' using errcode = '22023';
  end if;
  if cardinality(paths) < 1 or cardinality(paths) > 5 then
    raise exception 'Add 1 to 5 photos.' using errcode = '22023';
  end if;
  if char_length(caption) > 2200 then
    raise exception 'Keep the caption under 2,200 characters.' using errcode = '22023';
  end if;
  if p_visibility not in ('public', 'friends') then
    raise exception 'Choose who can see this post.' using errcode = '22023';
  end if;
  foreach path in array paths loop
    if not public.valid_media_path(path, uid) then
      raise exception 'Upload the photo again.' using errcode = '22023';
    end if;
  end loop;
  -- Tagging an event: one you saved (booked events join in week 6). Stops tag spam (DEV_PLAN §5.3).
  if p_event_id is not null and not exists (
    select 1 from public.saves s join public.events e on e.id = s.event_id
    where s.user_id = uid and s.event_id = p_event_id and e.status = 'published'
  ) then
    raise exception 'Save the event first to tag it.' using errcode = '22023';
  end if;
  if (select count(*) from public.posts p
      where p.author_type = 'user' and p.author_id = uid and p.created_at > now() - interval '1 day') >= 10 then
    raise exception 'That''s 10 posts today. Try again tomorrow.' using errcode = '54000';
  end if;

  insert into public.posts (author_type, author_id, kind, caption, event_id, moderation_status, visibility, created_by)
  values ('user', uid, 'photo', caption, p_event_id, public.moderation_default(), p_visibility::public.visibility, uid)
  returning id into post_id;
  foreach path in array paths loop
    insert into public.post_media (post_id, url, position) values (post_id, path, i);
    i := i + 1;
  end loop;
  return post_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Stories
-- -----------------------------------------------------------------------------
create or replace function public.create_club_story(p_club_id uuid, p_media_path text default null, p_event_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  story_id uuid;
begin
  if uid is null or not public.is_club_admin(p_club_id) then
    raise exception 'You can only add stories for clubs you manage.' using errcode = '42501';
  end if;
  if p_media_path is null and p_event_id is null then
    raise exception 'Add a photo or pick an event.' using errcode = '22023';
  end if;
  if p_media_path is not null and not public.valid_media_path(p_media_path, uid) then
    raise exception 'Upload the photo again.' using errcode = '22023';
  end if;
  if p_event_id is not null and not exists (
    select 1 from public.events e where e.id = p_event_id and e.club_id = p_club_id and e.status = 'published'
  ) then
    raise exception 'Pick one of your club''s upcoming events.' using errcode = '22023';
  end if;
  if (select count(*) from public.stories s
      where s.author_type = 'club' and s.author_id = p_club_id and s.created_at > now() - interval '1 day') >= 10 then
    raise exception 'That''s 10 stories today. Try again tomorrow.' using errcode = '54000';
  end if;
  -- Club content publishes straight away, like club posts (DECISIONS.md P17).
  insert into public.stories (author_type, author_id, kind, event_id, media_url, template, moderation_status, created_by)
  values ('club', p_club_id, 'custom', p_event_id, p_media_path, '{}'::jsonb, 'approved', uid)
  returning id into story_id;
  return story_id;
end;
$$;

-- "Your plans": share an event you're going to. An event card alone has nothing user-written, so it
-- goes out straight away; a photo or a note follows the moderation switch.
create or replace function public.create_user_story(p_event_id uuid, p_media_path text default null, p_note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid      uuid := auth.uid();
  note     text := nullif(trim(p_note), '');
  story_id uuid;
begin
  if uid is null then
    raise exception 'Log in to share your plans.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = uid and p.username is not null) then
    raise exception 'Set up your profile first.' using errcode = '22023';
  end if;
  if char_length(note) > 100 then
    raise exception 'Keep the note under 100 characters.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.events e
    join public.event_occurrences o on o.event_id = e.id
    where e.id = p_event_id and e.status = 'published' and e.visibility = 'public'
      and public.club_is_live(e.club_id)
      and o.status = 'scheduled' and coalesce(o.ends_at, o.starts_at + interval '2 hours') > now()
  ) then
    raise exception 'Pick an upcoming event.' using errcode = '22023';
  end if;
  if p_media_path is not null and not public.valid_media_path(p_media_path, uid) then
    raise exception 'Upload the photo again.' using errcode = '22023';
  end if;
  if (select count(*) from public.stories s
      where s.author_type = 'user' and s.author_id = uid and s.created_at > now() - interval '1 day') >= 10 then
    raise exception 'That''s 10 stories today. Try again tomorrow.' using errcode = '54000';
  end if;
  insert into public.stories (author_type, author_id, kind, event_id, media_url, template, moderation_status, created_by)
  values ('user', uid, 'your_plan', p_event_id, p_media_path,
          jsonb_strip_nulls(jsonb_build_object('kicker', 'Going', 'note', note)),
          case when p_media_path is null and note is null then 'approved'::public.moderation_status
               else public.moderation_default() end,
          uid)
  returning id into story_id;
  return story_id;
end;
$$;

-- A club publishing an event gets a story for it automatically (DEV_PLAN §5.2), at most one a day.
create or replace function public.event_auto_story()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- First publish only: restoring a cancelled event or re-publishing a draft doesn't repeat it.
  if new.status = 'published' and new.visibility = 'public'
     and (tg_op = 'INSERT' or (old.status is distinct from 'published' and old.published_at is null))
     and not exists (
       select 1 from public.stories s
       where s.event_id = new.id and s.kind = 'event_auto' and s.created_at > now() - interval '20 hours') then
    insert into public.stories (author_type, author_id, kind, event_id, template, moderation_status, created_by)
    values ('club', new.club_id, 'event_auto', new.id, '{"kicker": "New"}'::jsonb, 'approved', null);
  end if;
  return new;
end;
$$;

create trigger events_auto_story
  after insert or update of status on public.events
  for each row execute function public.event_auto_story();

-- Live stories for the stories row and viewer, one row per story, grouped by author:
-- your own first, then people/clubs with stories you haven't seen, then those you follow.
create or replace function public.story_feed()
returns table (
  story_id           uuid,
  author_type        text,
  author_id          uuid,
  author_name        text,
  author_handle      text,
  author_avatar_url  text,
  author_category    text,
  author_verified    boolean,
  kind               text,
  media_path         text,
  template           jsonb,
  created_at         timestamptz,
  expires_at         timestamptz,
  seen               boolean,
  mine               boolean,
  following          boolean,
  under_review       boolean,
  event_id           uuid,
  event_slug         text,
  event_title        text,
  event_category     text,
  poster_url         text,
  starts_at          timestamptz,
  area               text,
  min_price_paise    integer,
  is_free            boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with me as (select auth.uid() as uid),
  next_date as (
    select distinct on (o.event_id) o.event_id, o.id as occurrence_id, o.starts_at
    from public.event_occurrences o
    where o.status = 'scheduled' and coalesce(o.ends_at, o.starts_at + interval '2 hours') > now()
    order by o.event_id, o.starts_at
  ),
  live as (
    select s.id, s.author_type::text as author_type, s.author_id,
           coalesce(c.name, u.name, u.username) as author_name,
           coalesce(c.handle, u.username) as author_handle,
           coalesce(c.logo_url, u.avatar_url) as author_avatar_url,
           c.category as author_category,
           coalesce(c.verified, false) as author_verified,
           s.kind::text as kind, s.media_url as media_path, s.template, s.created_at, s.expires_at,
           exists (select 1 from public.story_views sv where sv.story_id = s.id and sv.user_id = me.uid) as seen,
           (s.author_type = 'user' and s.author_id = me.uid) as mine,
           exists (select 1 from public.follows f
                   where f.follower_id = me.uid and f.target_type::text = s.author_type::text and f.target_id = s.author_id) as following,
           (s.moderation_status <> 'approved') as under_review,
           e.id as event_id, e.slug as event_slug, e.title as event_title, e.category as event_category, e.poster_url,
           nd.starts_at, coalesce(v.area, c.area) as area,
           (select min(t.price_paise) from public.ticket_tiers t where t.occurrence_id = nd.occurrence_id)::integer as min_price_paise,
           (nd.occurrence_id is not null
             and not exists (select 1 from public.ticket_tiers t where t.occurrence_id = nd.occurrence_id and t.price_paise > 0)) as is_free
    from public.stories s
    cross join me
    left join public.clubs c on s.author_type = 'club' and c.id = s.author_id
    left join public.profiles u on s.author_type = 'user' and u.id = s.author_id
    left join public.events e on e.id = s.event_id
    left join next_date nd on nd.event_id = e.id
    left join public.venues v on v.id = e.venue_id
    where s.expires_at > now()
      and s.moderation_status in ('approved', 'pending')
      and ((s.author_type = 'club' and c.review_status = 'approved' and s.moderation_status = 'approved')
           or (s.author_type = 'user' and (s.author_id = me.uid or s.moderation_status = 'approved')))
      -- stories about an event only while it's still on
      and (s.event_id is null or (e.status = 'published' and nd.event_id is not null))
  ),
  grouped as (
    select l.*,
           bool_and(l.seen) over (partition by l.author_type, l.author_id) as all_seen,
           max(l.created_at) over (partition by l.author_type, l.author_id) as latest
    from live l
  )
  select g.id, g.author_type, g.author_id, g.author_name, g.author_handle, g.author_avatar_url, g.author_category,
         g.author_verified, g.kind, g.media_path, g.template, g.created_at, g.expires_at, g.seen, g.mine, g.following,
         g.under_review, g.event_id, g.event_slug, g.event_title, g.event_category, g.poster_url, g.starts_at, g.area,
         g.min_price_paise, g.is_free
  from grouped g
  order by g.mine desc, g.all_seen asc, g.following desc, g.latest desc, g.author_id, g.created_at asc
  limit 300;
$$;

create or replace function public.mark_stories_seen(p_story_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.story_views (story_id, user_id)
  select s.id, auth.uid() from public.stories s where s.id = any (p_story_ids) and auth.uid() is not null
  on conflict do nothing;
$$;

-- -----------------------------------------------------------------------------
-- Home feed v2: club posts as before, plus posts from people you follow and your own
-- (yours show while they are being reviewed). User photo posts stay after their event is over.
-- -----------------------------------------------------------------------------
drop function public.home_feed(integer);
create function public.home_feed(p_limit integer default 40)
returns table (
  post_id            uuid,
  author_type        text,
  kind               text,
  caption            text,
  created_at         timestamptz,
  media_path         text,
  under_review       boolean,
  mine               boolean,
  club_id            uuid,
  club_name          text,
  club_handle        text,
  club_verified      boolean,
  club_category      text,
  club_logo_url      text,
  user_id            uuid,
  user_name          text,
  user_username      text,
  user_avatar_url    text,
  following          boolean,
  suggested          boolean,
  event_id           uuid,
  event_slug         text,
  event_title        text,
  event_category     text,
  poster_url         text,
  starts_at          timestamptz,
  venue_name         text,
  area               text,
  min_price_paise    integer,
  is_free            boolean,
  like_count         integer,
  liked              boolean,
  saved              boolean
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
    select p.id, p.author_type::text as author_type, p.kind::text as kind, p.caption, p.created_at,
           (select m.url from public.post_media m where m.post_id = p.id order by m.position limit 1) as media_path,
           (p.moderation_status <> 'approved') as under_review,
           (p.author_type = 'user' and p.author_id = me.uid) as mine,
           c.id as club_id, c.name as club_name, c.handle as club_handle, c.verified as club_verified,
           c.category as club_category, c.logo_url as club_logo_url,
           u.id as user_id, u.name as user_name, u.username as user_username, u.avatar_url as user_avatar_url,
           (coalesce(fc.follower_id, fu.follower_id) is not null) as following,
           e.id as event_id, e.slug as event_slug, e.title as event_title, e.category as event_category, e.poster_url,
           nd.starts_at, v.name as venue_name, coalesce(v.area, c.area) as area,
           (select min(t.price_paise) from public.ticket_tiers t where t.occurrence_id = nd.occurrence_id)::integer as min_price_paise,
           (nd.occurrence_id is not null
             and not exists (select 1 from public.ticket_tiers t where t.occurrence_id = nd.occurrence_id and t.price_paise > 0)) as is_free,
           public.like_count(p.id) as like_count,
           exists (select 1 from public.likes l where l.post_id = p.id and l.user_id = me.uid) as liked,
           exists (select 1 from public.saves s where s.event_id = e.id and s.user_id = me.uid) as saved,
           me.area as my_area, me.interests as my_interests
    from public.posts p
    cross join me
    left join public.clubs c on p.author_type = 'club' and c.id = p.author_id
    left join public.profiles u on p.author_type = 'user' and u.id = p.author_id
    left join public.follows fc on fc.follower_id = me.uid and fc.target_type = 'club' and fc.target_id = c.id
    left join public.follows fu on fu.follower_id = me.uid and fu.target_type = 'user' and fu.target_id = u.id
    left join public.events e on e.id = p.event_id
    left join next_date nd on nd.event_id = e.id
    left join public.venues v on v.id = e.venue_id
    where p.created_at > now() - interval '30 days'
      and p.visibility in ('public', 'friends')   -- row rules decide friends-only and blocks
      and ((p.author_type = 'club' and c.review_status = 'approved' and p.moderation_status = 'approved'
            -- club posts about an event only while it's still on
            and (p.event_id is null or (e.status = 'published' and nd.event_id is not null)))
           or (p.author_type = 'user'
               and ((p.author_id = me.uid and p.moderation_status in ('approved', 'pending', 'flagged'))
                    or (p.moderation_status = 'approved' and fu.follower_id is not null))))
  ),
  scored as (
    select cand.*,
           ( - extract(epoch from (now() - cand.created_at)) / 172800.0
             + case when cand.mine then 4 when cand.following then 3 else 0 end
             + case when cand.starts_at < now() + interval '72 hours' then 2 else 0 end
             + case when coalesce(cand.event_category, cand.club_category) = any (cand.my_interests) then 1 else 0 end
             + case when cand.area is not null and cand.area = cand.my_area then 1 else 0 end
             + ln(1 + cand.like_count) * 0.5 ) as score
    from candidates cand
  ),
  capped as (
    select s.*, row_number() over (partition by coalesce(s.club_id, s.user_id) order by s.score desc) as author_rank
    from scored s
  )
  select c.id, c.author_type, c.kind, c.caption, c.created_at, c.media_path, c.under_review, c.mine,
         c.club_id, c.club_name, c.club_handle, c.club_verified, c.club_category, c.club_logo_url,
         c.user_id, c.user_name, c.user_username, c.user_avatar_url,
         c.following, ((select follows_any from me) and c.author_type = 'club' and not c.following) as suggested,
         c.event_id, c.event_slug, c.event_title, c.event_category, c.poster_url,
         c.starts_at, c.venue_name, c.area, c.min_price_paise, c.is_free,
         c.like_count, c.liked, c.saved
  from capped c
  where c.author_rank <= 2
  order by c.score desc, c.created_at desc
  limit least(greatest(coalesce(p_limit, 40), 1), 100);
$$;

-- -----------------------------------------------------------------------------
-- Reports and the Nikl admin moderation queue
-- -----------------------------------------------------------------------------
create or replace function public.report_content(
  p_target_type  public.report_target,
  p_target_id    uuid,
  p_reason       text,
  p_details      text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid       uuid := auth.uid();
  reporters integer;
begin
  if uid is null then
    raise exception 'Log in to report.' using errcode = '42501';
  end if;
  if p_reason not in ('spam', 'nudity', 'violence', 'harassment', 'hate', 'scam', 'false_info', 'other') then
    raise exception 'Pick a reason.' using errcode = '22023';
  end if;
  insert into public.reports (reporter_id, target_type, target_id, reason, details)
  values (uid, p_target_type, p_target_id, p_reason, nullif(trim(p_details), ''))
  on conflict (reporter_id, target_type, target_id) where status = 'open'
  do update set reason = excluded.reason, details = excluded.details, updated_at = now();

  -- Three different people reporting a post or story hides it until a Nikl admin looks.
  select count(distinct r.reporter_id) into reporters
  from public.reports r
  where r.target_type = p_target_type and r.target_id = p_target_id and r.status = 'open';
  if reporters >= 3 then
    if p_target_type = 'post' then
      update public.posts set moderation_status = 'flagged' where id = p_target_id and moderation_status = 'approved';
    elsif p_target_type = 'story' then
      update public.stories set moderation_status = 'flagged' where id = p_target_id and moderation_status = 'approved';
    end if;
  end if;
end;
$$;

-- Posts and stories waiting for review (new user content, or hidden by reports). Admins only.
create or replace function public.moderation_queue()
returns table (
  target_type   text,
  target_id     uuid,
  status        text,
  author_type   text,
  author_id     uuid,
  author_name   text,
  author_handle text,
  caption       text,
  media_paths   text[],
  event_title   text,
  created_at    timestamptz,
  report_count  integer,
  reasons       text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only Nikl admins can review content.' using errcode = '42501';
  end if;
  return query
  select 'post'::text, p.id, p.moderation_status::text, p.author_type::text, p.author_id,
         coalesce(c.name, u.name, u.username), coalesce(c.handle, u.username),
         p.caption,
         array(select m.url from public.post_media m where m.post_id = p.id order by m.position),
         e.title, p.created_at,
         (select count(*)::integer from public.reports r where r.target_type = 'post' and r.target_id = p.id and r.status = 'open'),
         array(select distinct r.reason from public.reports r where r.target_type = 'post' and r.target_id = p.id and r.status = 'open')
  from public.posts p
  left join public.clubs c on p.author_type = 'club' and c.id = p.author_id
  left join public.profiles u on p.author_type = 'user' and u.id = p.author_id
  left join public.events e on e.id = p.event_id
  where p.moderation_status in ('pending', 'flagged')
     or exists (select 1 from public.reports r where r.target_type = 'post' and r.target_id = p.id and r.status = 'open')
  union all
  select 'story'::text, s.id, s.moderation_status::text, s.author_type::text, s.author_id,
         coalesce(c.name, u.name, u.username), coalesce(c.handle, u.username),
         s.template ->> 'note',
         case when s.media_url is null then '{}'::text[] else array[s.media_url] end,
         e.title, s.created_at,
         (select count(*)::integer from public.reports r where r.target_type = 'story' and r.target_id = s.id and r.status = 'open'),
         array(select distinct r.reason from public.reports r where r.target_type = 'story' and r.target_id = s.id and r.status = 'open')
  from public.stories s
  left join public.clubs c on s.author_type = 'club' and c.id = s.author_id
  left join public.profiles u on s.author_type = 'user' and u.id = s.author_id
  left join public.events e on e.id = s.event_id
  where s.expires_at > now()
    and (s.moderation_status in ('pending', 'flagged')
         or exists (select 1 from public.reports r where r.target_type = 'story' and r.target_id = s.id and r.status = 'open'))
  order by 11;
end;
$$;

-- Reports about people, clubs and events (posts and stories are in the queue above). Admins only.
create or replace function public.open_reports()
returns table (
  report_id    uuid,
  target_type  text,
  target_id    uuid,
  target_label text,
  reason       text,
  details      text,
  reporter     text,
  created_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only Nikl admins can review reports.' using errcode = '42501';
  end if;
  return query
  select r.id, r.target_type::text, r.target_id,
         case r.target_type
           when 'user'  then (select coalesce(p.username, p.name) from public.profiles p where p.id = r.target_id)
           when 'club'  then (select c.handle from public.clubs c where c.id = r.target_id)
           when 'event' then (select e.title from public.events e where e.id = r.target_id)
         end,
         r.reason, r.details,
         (select coalesce(p.username, p.name, 'someone') from public.profiles p where p.id = r.reporter_id),
         r.created_at
  from public.reports r
  where r.status = 'open' and r.target_type in ('user', 'club', 'event')
  order by r.created_at;
end;
$$;

-- Returns the photo paths of removed content, so the caller can delete the files from storage.
create or replace function public.moderate_content(
  p_target_type  text,
  p_target_id    uuid,
  p_decision     public.moderation_status,
  p_note         text default null
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  author_t  public.author_type;
  author    uuid;
  old_status public.moderation_status;
  note      text := nullif(trim(p_note), '');
  paths     text[] := '{}';
begin
  if not public.is_platform_admin() then
    raise exception 'Only Nikl admins can review content.' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Approve or remove.' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and note is null then
    raise exception 'Add a short reason for the person who posted it.' using errcode = '22023';
  end if;

  if p_target_type = 'post' then
    select p.author_type, p.author_id, p.moderation_status into author_t, author, old_status from public.posts p where p.id = p_target_id;
    if not found then raise exception 'That post is gone.' using errcode = '22023'; end if;
    update public.posts set moderation_status = p_decision,
           moderation_note = case when p_decision = 'rejected' then note end
    where id = p_target_id;
    if p_decision = 'rejected' then
      paths := array(select m.url from public.post_media m where m.post_id = p_target_id);
    end if;
  elsif p_target_type = 'story' then
    select s.author_type, s.author_id, s.moderation_status into author_t, author, old_status from public.stories s where s.id = p_target_id;
    if not found then raise exception 'That story is gone.' using errcode = '22023'; end if;
    update public.stories set moderation_status = p_decision,
           moderation_note = case when p_decision = 'rejected' then note end
    where id = p_target_id;
    if p_decision = 'rejected' then
      paths := array(select s.media_url from public.stories s where s.id = p_target_id and s.media_url is not null);
    end if;
  else
    raise exception 'Unknown content type.' using errcode = '22023';
  end if;

  update public.reports
  set status = case when p_decision = 'rejected' then 'actioned'::public.report_status else 'dismissed'::public.report_status end,
      reviewed_by = auth.uid(), action = p_decision::text, updated_at = now()
  where target_type = p_target_type::public.report_target and target_id = p_target_id and status = 'open';

  insert into public.audit_log (actor_id, action, entity_type, entity_id, before, after)
  values (auth.uid(), 'content.moderate', p_target_type, p_target_id::text,
          jsonb_build_object('moderation_status', old_status),
          jsonb_strip_nulls(jsonb_build_object('moderation_status', p_decision, 'note', note)));

  -- Tell the person, or the club's owners and admins (their activity screen arrives in week 8).
  if old_status is distinct from p_decision then
    insert into public.notifications (user_id, type, target_type, target_id, data)
    select x.user_id, 'moderation', p_target_type, p_target_id,
           jsonb_strip_nulls(jsonb_build_object('decision', p_decision, 'note', note))
    from (
      select author as user_id where author_t = 'user'
      union
      select m.user_id from public.club_members m
      where author_t = 'club' and m.club_id = author and m.role in ('owner', 'admin') and m.status = 'active'
    ) x;
  end if;
  return paths;
end;
$$;

create or replace function public.resolve_report(p_report_id uuid, p_status public.report_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only Nikl admins can review reports.' using errcode = '42501';
  end if;
  if p_status not in ('actioned', 'dismissed') then
    raise exception 'Mark it handled or dismissed.' using errcode = '22023';
  end if;
  update public.reports
  set status = p_status, reviewed_by = auth.uid(), action = nullif(trim(p_note), ''), updated_at = now()
  where id = p_report_id and status = 'open';
  if not found then
    raise exception 'That report was already handled.' using errcode = '22023';
  end if;
  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (auth.uid(), 'report.resolve', 'report', p_report_id::text,
          jsonb_strip_nulls(jsonb_build_object('status', p_status, 'note', nullif(trim(p_note), ''))));
end;
$$;

create or replace function public.set_moderation_mode(p_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Only Nikl admins can change this.' using errcode = '42501';
  end if;
  if p_mode not in ('review', 'publish') then
    raise exception 'Choose review or publish.' using errcode = '22023';
  end if;
  update public.app_settings set value = to_jsonb(p_mode), updated_at = now(), updated_by = auth.uid()
  where key = 'moderation_mode';
  insert into public.audit_log (actor_id, action, entity_type, entity_id, after)
  values (auth.uid(), 'settings.moderation_mode', 'app_settings', 'moderation_mode', jsonb_build_object('value', p_mode));
end;
$$;

-- -----------------------------------------------------------------------------
-- Who can call what
-- -----------------------------------------------------------------------------
revoke execute on function public.moderation_default() from public, anon, authenticated;
revoke execute on function public.valid_media_path(text, uuid) from public, anon, authenticated;
revoke execute on function public.event_auto_story() from public, anon, authenticated;

revoke execute on function public.set_follow_user(uuid, boolean) from public, anon;
revoke execute on function public.set_block(uuid, boolean) from public, anon;
revoke execute on function public.create_user_post(text[], text, uuid, text) from public, anon;
revoke execute on function public.create_club_story(uuid, text, uuid) from public, anon;
revoke execute on function public.create_user_story(uuid, text, text) from public, anon;
revoke execute on function public.mark_stories_seen(uuid[]) from public, anon;
revoke execute on function public.report_content(public.report_target, uuid, text, text) from public, anon;
revoke execute on function public.moderation_queue() from public, anon;
revoke execute on function public.open_reports() from public, anon;
revoke execute on function public.moderate_content(text, uuid, public.moderation_status, text) from public, anon;
revoke execute on function public.resolve_report(uuid, public.report_status, text) from public, anon;
revoke execute on function public.set_moderation_mode(text) from public, anon;
grant execute on function public.set_follow_user(uuid, boolean) to authenticated;
grant execute on function public.set_block(uuid, boolean) to authenticated;
grant execute on function public.create_user_post(text[], text, uuid, text) to authenticated;
grant execute on function public.create_club_story(uuid, text, uuid) to authenticated;
grant execute on function public.create_user_story(uuid, text, text) to authenticated;
grant execute on function public.mark_stories_seen(uuid[]) to authenticated;
grant execute on function public.report_content(public.report_target, uuid, text, text) to authenticated;
grant execute on function public.moderation_queue() to authenticated;
grant execute on function public.open_reports() to authenticated;
grant execute on function public.moderate_content(text, uuid, public.moderation_status, text) to authenticated;
grant execute on function public.resolve_report(uuid, public.report_status, text) to authenticated;
grant execute on function public.set_moderation_mode(text) to authenticated;

revoke execute on function public.home_feed(integer) from public;
revoke execute on function public.story_feed() from public;
revoke execute on function public.user_profile(text) from public;
revoke execute on function public.follower_count(public.follow_target, uuid) from public;
revoke execute on function public.following_count(uuid) from public;
grant execute on function public.home_feed(integer) to anon, authenticated;
grant execute on function public.story_feed() to anon, authenticated;
grant execute on function public.user_profile(text) to anon, authenticated;
grant execute on function public.follower_count(public.follow_target, uuid) to anon, authenticated;
grant execute on function public.following_count(uuid) to anon, authenticated;
