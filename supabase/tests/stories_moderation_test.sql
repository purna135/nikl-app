-- Stories, user posts, follow privacy, reports, blocks and moderation.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

-- People: organizer, alice, bob, carol, dan (4 reporters need 3 others), admin
insert into auth.users (id, phone, aud, role) values
  ('b1000000-0000-0000-0000-000000000001', '919000000041', 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-000000000002', '919000000042', 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-000000000003', '919000000043', 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-000000000004', '919000000044', 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-000000000005', '919000000045', 'authenticated', 'authenticated'),
  ('b1000000-0000-0000-0000-000000000009', '919000000049', 'authenticated', 'authenticated');
update public.profiles set username = 'org.one', name = 'Org' where id = 'b1000000-0000-0000-0000-000000000001';
update public.profiles set username = 'alice', name = 'Alice' where id = 'b1000000-0000-0000-0000-000000000002';
update public.profiles set username = 'bob', name = 'Bob' where id = 'b1000000-0000-0000-0000-000000000003';
update public.profiles set username = 'carol', name = 'Carol' where id = 'b1000000-0000-0000-0000-000000000004';
update public.profiles set username = 'dan', name = 'Dan' where id = 'b1000000-0000-0000-0000-000000000005';
insert into public.platform_admins (user_id) values ('b1000000-0000-0000-0000-000000000009');
insert into storage.objects (bucket_id, name, owner) values
  ('post-media', 'b1000000-0000-0000-0000-000000000001/21111111-1111-1111-1111-111111111111.jpg', 'b1000000-0000-0000-0000-000000000001'),
  ('post-media', 'b1000000-0000-0000-0000-000000000002/31111111-1111-1111-1111-111111111111.jpg', 'b1000000-0000-0000-0000-000000000002'),
  ('post-media', 'b1000000-0000-0000-0000-000000000002/41111111-1111-1111-1111-111111111111.jpg', 'b1000000-0000-0000-0000-000000000002');

-- Organizer: club + a published event (which creates an automatic story)
set local role authenticated;
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select public.create_club('Story Testers', 'story.testers', 'music', null, 'Patia', null);
reset role;
update public.clubs set review_status = 'approved' where handle = 'story.testers';
set local role authenticated;
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select public.create_event((select id from public.clubs where handle = 'story.testers'),
  'Story Gig', 'music', now() + interval '1 day', p_venue_name => 'Rooftop', p_publish => true);

select is((select count(*)::int from public.stories s join public.events e on e.id = s.event_id
           where e.title = 'Story Gig' and s.kind = 'event_auto'), 1,
  'publishing an event creates an automatic club story');
select lives_ok(
  $$ select public.create_club_story((select id from public.clubs where handle = 'story.testers'),
       'b1000000-0000-0000-0000-000000000001/21111111-1111-1111-1111-111111111111.jpg') $$,
  'a club team can add a photo story');

-- Alice: saves the event, follows nobody yet
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ select public.create_club_story((select id from public.clubs where handle = 'story.testers'), null,
       (select id from public.events where title = 'Story Gig')) $$,
  '42501', 'You can only add stories for clubs you manage.', 'others cannot add club stories');
select is((select count(*)::int from public.story_feed() where author_handle = 'story.testers'), 2,
  'club stories are in everyone''s story feed');
select public.mark_stories_seen(array(select story_id from public.story_feed() where author_handle = 'story.testers'));
select ok((select bool_and(seen) from public.story_feed() where author_handle = 'story.testers'), 'stories can be marked seen');

-- Your plans: an event card alone publishes; a note waits for review (moderation mode "review")
select public.create_user_story((select id from public.events where title = 'Story Gig'));
select public.create_user_story((select id from public.events where title = 'Story Gig'), null, 'Who''s coming?');
select results_eq(
  $$ select under_review from public.story_feed() where mine order by created_at $$,
  $$ values (false), (true) $$,
  'Your plans: card-only story is live, a story with a note waits for review');

-- Alice's photo post needs the tagged event saved first
select throws_ok(
  $$ select public.create_user_post(array['b1000000-0000-0000-0000-000000000002/31111111-1111-1111-1111-111111111111.jpg'],
       'See you there', (select id from public.events where title = 'Story Gig')) $$,
  '22023', 'Save the event first to tag it.', 'tagging needs a saved event');
select public.set_save((select id from public.events where title = 'Story Gig'), true);
select lives_ok(
  $$ select public.create_user_post(array['b1000000-0000-0000-0000-000000000002/31111111-1111-1111-1111-111111111111.jpg'],
       'See you there', (select id from public.events where title = 'Story Gig')) $$,
  'a user photo post with a saved event works');
select throws_ok(
  $$ select public.create_user_post(array['b1000000-0000-0000-0000-000000000001/21111111-1111-1111-1111-111111111111.jpg'], 'stolen') $$,
  '22023', 'Upload the photo again.', 'someone else''s photo can''t be used');
select ok((select under_review from public.home_feed() where caption = 'See you there'),
  'your own post shows in your feed while it is reviewed');

-- Bob follows Alice: sees her live story but not the post under review
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select public.set_follow_user('b1000000-0000-0000-0000-000000000002', true);
select is((select count(*)::int from public.story_feed() where author_handle = 'alice'), 1,
  'followers see a person''s live stories (not the one under review)');
select is((select count(*)::int from public.home_feed() where caption = 'See you there'), 0,
  'followers don''t see a post under review');

-- Carol doesn't follow Alice: no stories
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select is((select count(*)::int from public.story_feed() where author_handle = 'alice'), 0,
  'people who don''t follow someone don''t see their stories');
select is((select count(*)::int from public.follows where follower_id = 'b1000000-0000-0000-0000-000000000003'), 0,
  'follow lists are private');
select is(public.follower_count('user', 'b1000000-0000-0000-0000-000000000002'), 1, 'follower counts are public');

-- Moderation queue: admins only
select throws_ok($$ select * from public.moderation_queue() $$, '42501', null, 'only admins see the queue');
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000009", "role": "authenticated"}';
select ok((select count(*) from public.moderation_queue() where caption = 'See you there') = 1, 'the post is in the admin queue');
select throws_ok(
  $$ select public.moderate_content('post', (select target_id from public.moderation_queue() where caption = 'See you there'), 'rejected') $$,
  '22023', 'Add a short reason for the person who posted it.', 'removing needs a reason');
-- the admin page takes ids from the queue (admins can't read other people's posts under review directly)
select public.moderate_content('post', (select target_id from public.moderation_queue() where caption = 'See you there'), 'approved');
select is((select count(*)::int from public.notifications where user_id = 'b1000000-0000-0000-0000-000000000002' and type = 'moderation'), 0,
  'admins cannot read other people''s notifications');

-- Bob now sees it
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is((select count(*)::int from public.home_feed() where caption = 'See you there'), 1, 'after approval followers see the post');

-- Alice is told
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select is((select data ->> 'decision' from public.notifications where type = 'moderation'), 'approved',
  'the author gets a notification');

-- Friends-only post: Bob follows Alice but she doesn't follow back → not friends yet
select lives_ok(
  $$ select public.create_user_post(array['b1000000-0000-0000-0000-000000000002/41111111-1111-1111-1111-111111111111.jpg'],
       'Friends only', null, 'friends') $$,
  'friends-only posts can be created');
reset role;
update public.posts set moderation_status = 'approved' where caption = 'Friends only';
set local role authenticated;
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is((select count(*)::int from public.posts where caption = 'Friends only'), 0, 'a one-way follower can''t see friends-only posts');
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select public.set_follow_user('b1000000-0000-0000-0000-000000000003', true);
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select is((select count(*)::int from public.posts where caption = 'Friends only'), 1, 'friends (following each other) can');

-- Reports: three different people hide a post
select public.report_content('post', (select id from public.posts where caption = 'See you there'), 'spam');
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select public.report_content('post', (select id from public.posts where caption = 'See you there'), 'spam');
select public.report_content('post', (select id from public.posts where caption = 'See you there'), 'scam');
select is((select moderation_status::text from public.posts where caption = 'See you there'), 'approved',
  'one person reporting twice counts once');
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000005", "role": "authenticated"}';
select public.report_content('post', (select id from public.posts where caption = 'See you there'), 'spam');
reset role;
select is((select moderation_status::text from public.posts where caption = 'See you there'), 'flagged',
  'three different reporters hide the post until review');

-- Blocks: Bob blocks Alice → follows both ways go, her posts disappear for him
set local role authenticated;
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select public.set_block('b1000000-0000-0000-0000-000000000002', true);
select is(public.follower_count('user', 'b1000000-0000-0000-0000-000000000002'), 0, 'blocking removes the follow');
select is((select count(*)::int from public.posts where author_id = 'b1000000-0000-0000-0000-000000000002'), 0,
  'a blocked person''s posts are hidden');
select throws_ok($$ select public.set_follow_user('b1000000-0000-0000-0000-000000000002', true) $$,
  '22023', 'That person isn''t available.', 'and you can''t follow them while blocked');

-- Moderation switch: "publish" sends new user posts out straight away
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000009", "role": "authenticated"}';
select public.set_moderation_mode('publish');
reset role;
insert into storage.objects (bucket_id, name, owner) values
  ('post-media', 'b1000000-0000-0000-0000-000000000004/51111111-1111-1111-1111-111111111111.jpg', 'b1000000-0000-0000-0000-000000000004');
set local role authenticated;
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select public.create_user_post(array['b1000000-0000-0000-0000-000000000004/51111111-1111-1111-1111-111111111111.jpg'], 'Straight out');
select is((select moderation_status::text from public.posts where caption = 'Straight out'), 'approved',
  'in publish mode user posts go out straight away');

-- Likes are private, counts public
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000005", "role": "authenticated"}';
select public.set_like((select id from public.posts where caption = 'Straight out'), true);
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select is((select count(*)::int from public.likes where post_id = (select id from public.posts where caption = 'Straight out')), 0,
  'who liked a post is private');
select is(public.like_count((select id from public.posts where caption = 'Straight out')), 1, 'like counts are public');

-- Removing a photo post hands back its photo so the files can be deleted
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000009", "role": "authenticated"}';
select set_eq(
  $$ select unnest(public.moderate_content('post', (select target_id from public.moderation_queue() where caption = 'Straight out' union
       select p.id from public.posts p where p.caption = 'Straight out' limit 1), 'rejected', 'Test removal')) $$,
  array['b1000000-0000-0000-0000-000000000004/51111111-1111-1111-1111-111111111111.jpg'],
  'removing a post returns its photo paths');

-- Club teams hear about removals of their content
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select public.create_club_post((select id from public.clubs where handle = 'story.testers'), 'Club post to remove');
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000009", "role": "authenticated"}';
select public.moderate_content('post', (select id from public.posts where caption = 'Club post to remove'), 'rejected', 'Wrong photo');
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select is((select data ->> 'note' from public.notifications where type = 'moderation'), 'Wrong photo',
  'the club''s team is told why');

-- Restoring an event doesn't create another "New" story
reset role;
update public.events set status = 'cancelled' where title = 'Story Gig';
update public.events set status = 'published' where title = 'Story Gig';
select is((select count(*)::int from public.stories s join public.events e on e.id = s.event_id
           where e.title = 'Story Gig' and s.kind = 'event_auto'), 1,
  'restoring a cancelled event keeps its single automatic story');

-- Hardening: nobody can probe other people's follows or blocks, or skip the rules by writing tables directly
set local role authenticated;
set local request.jwt.claims to '{"sub": "b1000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select throws_ok($$ select public.is_follower('b1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000003') $$,
  '42501', null, 'the general follow check is not callable by apps');
select throws_ok($$ insert into public.reports (reporter_id, target_type, target_id, reason)
                    values ('b1000000-0000-0000-0000-000000000004', 'post', gen_random_uuid(), 'spam') $$,
  '42501', null, 'reports go through report_content only');
select throws_ok($$ insert into public.posts (author_type, author_id, kind, caption, moderation_status, created_by)
                    values ('user', 'b1000000-0000-0000-0000-000000000004', 'photo', 'sneaky', 'pending', 'b1000000-0000-0000-0000-000000000004') $$,
  '42501', null, 'posts are created through the post functions only');
select throws_ok($$ update public.posts set caption = 'edited after approval' where caption = 'Straight out' $$,
  '42501', null, 'approved posts can''t be edited (that would skip review)');
reset role;
select is((select moderation_note from public.posts where caption = 'See you there'), null,
  'a note typed while approving isn''t kept on the (public) post');

select * from finish();
rollback;
