-- Club approval and event creation rules (DECISIONS.md P15).
-- Run with: pnpm db:test   (needs the local database: pnpm db:start)
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

-- Three people: an organizer, someone else, and a Nikl admin
insert into auth.users (id, phone, aud, role) values
  ('a0000000-0000-0000-0000-00000000000a', '919000000001', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-00000000000b', '919000000002', 'authenticated', 'authenticated'),
  ('c0000000-0000-0000-0000-00000000000c', '919000000003', 'authenticated', 'authenticated');
insert into public.platform_admins (user_id) values ('c0000000-0000-0000-0000-00000000000c');

-- ---------------------------------------------------------------- organizer
set local role authenticated;
set local request.jwt.claims to '{"sub": "a0000000-0000-0000-0000-00000000000a", "role": "authenticated"}';

select lives_ok(
  $$ select public.create_club('Test Runners', 'test.runners', 'fitness', 'Run club', 'Patia', 'Easy runs') $$,
  'a signed-in user can create a club page');

select is((select review_status::text from public.clubs where handle = 'test.runners'), 'pending',
  'a new club page starts as pending');

select is((select role::text from public.club_members m join public.clubs c on c.id = m.club_id
           where c.handle = 'test.runners' and m.user_id = auth.uid()), 'owner',
  'the creator becomes the owner');

select throws_ok(
  $$ insert into public.clubs (name, handle, category) values ('Sneaky', 'sneaky.club', 'fitness') $$,
  '42501', null, 'clubs cannot be inserted directly (only through create_club)');

select throws_ok(
  $$ select public.create_club('Dup', 'TEST.runners', 'fitness') $$,
  '23505', 'That handle is taken. Try another one.', 'handles are unique, ignoring case');

select throws_ok(
  $$ select public.create_club('Bad', 'bad.category', 'karaoke-nights') $$,
  '22023', null, 'the category must be one of the 12');

select lives_ok(
  $$ select public.create_event(
       (select id from public.clubs where handle = 'test.runners'),
       'Sunday Long Run', 'fitness', now() + interval '3 days', now() + interval '3 days 1 hour',
       p_venue_name => 'Infocity Square', p_venue_area => 'Patia', p_capacity => 50, p_repeat_weeks => 3,
       p_tiers => '[{"name": "Regular", "price_paise": 19900, "quantity": 50}]', p_publish => true) $$,
  'the owner can create a published weekly event');

select throws_ok(
  $$ select public.create_event((select id from public.clubs where handle = 'test.runners'),
       'Yesterday Run', 'fitness', now() - interval '1 day') $$,
  '22023', 'Pick a date and time in the future.', 'events cannot start in the past');

select throws_ok(
  $$ select public.review_club((select id from public.clubs where handle = 'test.runners'), 'approved') $$,
  '42501', null, 'organizers cannot approve their own club');

-- ----------------------------------------------------------- someone else
set local request.jwt.claims to '{"sub": "b0000000-0000-0000-0000-00000000000b", "role": "authenticated"}';

select is((select count(*)::int from public.clubs where handle = 'test.runners'), 0,
  'other users cannot see a pending club');

select throws_ok(
  $$ select public.create_event('00000000-0000-0000-0000-000000000000', 'Hijack', 'fitness', now() + interval '1 day') $$,
  '42501', null, 'nobody can add events to a club they do not manage');

-- ------------------------------------------------------------- the public
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select is((select count(*)::int from public.events where title = 'Sunday Long Run'), 0,
  'events of a pending club are hidden, even when published');

select ok((select count(*) from public.clubs) >= 11, 'approved sample clubs are visible to everyone');

-- ------------------------------------------------------------ Nikl admin
set local role authenticated;
set local request.jwt.claims to '{"sub": "c0000000-0000-0000-0000-00000000000c", "role": "authenticated"}';

select is((select count(*)::int from public.clubs where handle = 'test.runners'), 1,
  'admins can see pending clubs');

select lives_ok(
  $$ select public.review_club((select id from public.clubs where handle = 'test.runners'), 'approved', 'Looks good') $$,
  'admins can approve a club');

-- ---------------------------------------------- the public, after approval
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select is((select count(*)::int from public.events where title = 'Sunday Long Run'), 1,
  'the event goes live once the club is approved');

select is((select count(*)::int from public.event_occurrences o join public.events e on e.id = o.event_id
           where e.title = 'Sunday Long Run'), 3,
  'weekly repeats create one date per week');

select is((select count(*)::int from public.ticket_tiers t join public.event_occurrences o on o.id = t.occurrence_id
           join public.events e on e.id = o.event_id where e.title = 'Sunday Long Run' and t.price_paise = 19900), 3,
  'each date gets its own ticket tier');

-- ------------------------------------------------------------ audit trail
reset role;
select is((select count(*)::int from public.audit_log where action = 'club.review'
           and entity_id = (select id::text from public.clubs where handle = 'test.runners')), 1,
  'approvals are written to the audit log');

select * from finish();
rollback;
