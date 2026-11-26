-- Follow, like, save, club posts and the home feed.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, phone, aud, role) values
  ('a1000000-0000-0000-0000-000000000001', '919000000031', 'authenticated', 'authenticated'),  -- organizer
  ('a1000000-0000-0000-0000-000000000002', '919000000032', 'authenticated', 'authenticated');  -- fan

-- Organizer: club + a published event + a past event
set local role authenticated;
set local request.jwt.claims to '{"sub": "a1000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select public.create_club('Feed Testers', 'feed.testers', 'music', null, 'Patia', null);
select public.create_event((select id from public.clubs where handle = 'feed.testers'),
  'Feed Gig', 'music', now() + interval '1 day', p_venue_name => 'Rooftop', p_venue_area => 'Patia', p_publish => true);
select public.create_event((select id from public.clubs where handle = 'feed.testers'),
  'Old Gig', 'music', now() - interval '30 minutes', now() - interval '10 minutes', p_venue_name => 'Rooftop', p_publish => true);

select lives_ok(
  $$ select public.create_club_post((select id from public.clubs where handle = 'feed.testers'),
       'Tonight! Doors at 8.', (select id from public.events where title = 'Feed Gig')) $$,
  'a club admin can post about their event');
select public.create_club_post((select id from public.clubs where handle = 'feed.testers'),
  'That was fun.', (select id from public.events where title = 'Old Gig'));

select throws_ok(
  $$ select public.create_club_post((select id from public.clubs where handle = 'feed.testers'), null, null, '{}') $$,
  '22023', 'Add a photo, an event or a caption.', 'an empty post is refused');
select throws_ok(
  $$ select public.create_club_post((select id from public.clubs where handle = 'feed.testers'), 'Look',
       null, array['a1000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000000.jpg']) $$,
  '22023', 'Upload the photo again.', 'photos must exist in Nikl storage');

-- A real upload in the organizer's own folder works
reset role;
insert into storage.objects (bucket_id, name, owner)
values ('post-media', 'a1000000-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111.jpg',
        'a1000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claims to '{"sub": "a1000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$ select public.create_club_post((select id from public.clubs where handle = 'feed.testers'), 'Soundcheck',
       null, array['a1000000-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111.jpg']) $$,
  'a photo post with an uploaded photo works');

-- Pending club: its posts are not in anyone else's feed, and it can't be followed
set local request.jwt.claims to '{"sub": "a1000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select is((select count(*)::int from public.home_feed() where club_handle = 'feed.testers'), 0,
  'posts of a club waiting for approval stay hidden');
select throws_ok(
  $$ select public.set_follow_club((select id from public.clubs where handle = 'feed.testers'), true) $$,
  '22023', 'That club isn''t on Nikl right now.', 'a pending club cannot be followed');
select throws_ok(
  $$ select public.create_club_post((select id from public.clubs where handle = 'feed.testers'), 'Hi') $$,
  '42501', 'You can only post for clubs you manage.', 'only the club team can post');

reset role;
update public.clubs set review_status = 'approved' where handle = 'feed.testers';
set local role authenticated;
set local request.jwt.claims to '{"sub": "a1000000-0000-0000-0000-000000000002", "role": "authenticated"}';

select is((select count(*)::int from public.home_feed() where club_handle = 'feed.testers'), 2,
  'after approval: the event post and the photo post show');
select is((select count(*)::int from public.home_feed() where caption = 'That was fun.'), 0,
  'a post about an event that is over is hidden');
select is((select media_path from public.home_feed() where caption = 'Soundcheck'),
  'a1000000-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111.jpg',
  'the photo comes back as a storage path');

-- Follow, like, save (set twice to show it is safe to repeat)
select public.set_follow_club((select id from public.clubs where handle = 'feed.testers'), true);
select public.set_follow_club((select id from public.clubs where handle = 'feed.testers'), true);
select public.set_like((select id from public.posts where caption = 'Tonight! Doors at 8.'), true);
select public.set_like((select id from public.posts where caption = 'Tonight! Doors at 8.'), true);
select public.set_save((select id from public.events where title = 'Feed Gig'), true);

select results_eq(
  $$ select following, liked, like_count, saved from public.home_feed() where caption = 'Tonight! Doors at 8.' $$,
  $$ values (true, true, 1, true) $$,
  'the feed shows follow, like (counted once) and save');
select is((select count(*)::int from public.follows where follower_id = 'a1000000-0000-0000-0000-000000000002'), 1,
  'following twice keeps one follow');
select is((select count(*)::int from public.suggested_clubs(30) where handle = 'feed.testers'), 0,
  'a followed club is not suggested again');

select public.set_like((select id from public.posts where caption = 'Tonight! Doors at 8.'), false);
select public.set_follow_club((select id from public.clubs where handle = 'feed.testers'), false);
select results_eq(
  $$ select following, liked, like_count from public.home_feed() where caption = 'Tonight! Doors at 8.' $$,
  $$ values (false, false, 0) $$,
  'unlike and unfollow work');

-- Logged out
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select ok((select count(*) from public.home_feed() where club_handle = 'feed.testers') = 2,
  'people who are not logged in see the feed too');
select throws_ok(
  $$ select public.set_save((select id from public.events where title = 'Feed Gig'), true) $$,
  '42501', null, 'but cannot save');

select * from finish();
rollback;
