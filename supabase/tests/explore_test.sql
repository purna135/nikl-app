-- Explore query and map pins.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, phone, aud, role) values
  ('f0000000-0000-0000-0000-00000000000f', '919000000021', 'authenticated', 'authenticated'),
  ('f0000000-0000-0000-0000-0000000000f2', '919000000022', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims to '{"sub": "f0000000-0000-0000-0000-00000000000f", "role": "authenticated"}';

select public.create_club('Map Testers', 'map.testers', 'games', null, 'Patia', null);

select lives_ok(
  $$ select public.create_event((select id from public.clubs where handle = 'map.testers'),
       'Pinned Game Night', 'games', now() + interval '2 days', now() + interval '2 days 3 hours',
       p_venue_name => 'Dice Cafe', p_venue_area => 'Patia', p_repeat_weeks => 3, p_publish => true,
       p_tiers => '[{"name": "Entry", "price_paise": 24900}]',
       p_venue_lat => 20.3540, p_venue_lng => 85.8190) $$,
  'an event can be created with a map pin');

select throws_ok(
  $$ select public.create_event((select id from public.clubs where handle = 'map.testers'),
       'Bad Pin', 'games', now() + interval '2 days', p_venue_name => 'Somewhere',
       p_venue_lat => 51.5, p_venue_lng => -0.12) $$,
  '22023', 'The map pin has to be in India.', 'pins outside India are rejected');

select throws_ok(
  $$ select public.create_event((select id from public.clubs where handle = 'map.testers'),
       'Half Pin', 'games', now() + interval '2 days', p_venue_name => 'Somewhere', p_venue_lat => 20.3) $$,
  '22023', 'Drop the map pin again.', 'latitude without longitude is rejected');

select is((select round(v.lat::numeric, 3) from public.venues v where v.name = 'Dice Cafe'), 20.354::numeric,
  'the venue stores the pin as lat/lng');

-- Moving the pin later gives the event its own venue copy; other users can't do it
select lives_ok(
  $$ select public.set_event_pin((select id from public.events where title = 'Pinned Game Night'), 20.3, 85.85) $$,
  'an organizer can move the pin later');
select is((select round(v.lng::numeric, 2) from public.events e join public.venues v on v.id = e.venue_id
           where e.title = 'Pinned Game Night'), 85.85::numeric, 'the event now uses the new pin');

-- Pending club: nothing in Explore yet
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select is((select count(*)::int from public.explore_events() where title = 'Pinned Game Night'), 0,
  'events of a pending club are not in Explore');

-- Approve, then it shows with its next date only
reset role;
update public.clubs set review_status = 'approved' where handle = 'map.testers';
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';

select is((select count(*)::int from public.explore_events() where title = 'Pinned Game Night'), 1,
  'a weekly event appears once in Explore');
select is((select more_dates from public.explore_events() where title = 'Pinned Game Night'), 2,
  'with the number of further dates');
select is((select min_price_paise from public.explore_events() where title = 'Pinned Game Night'), 24900,
  'and its lowest ticket price');
select ok((select lng from public.explore_events() where title = 'Pinned Game Night') between 85.84 and 85.86,
  'and its map position');

-- Someone who doesn't manage the club can't move the pin
reset role;
set local role authenticated;
set local request.jwt.claims to '{"sub": "f0000000-0000-0000-0000-0000000000f2", "role": "authenticated"}';
select throws_ok(
  $$ select public.set_event_pin((select id from public.events where title = 'Pinned Game Night'), 20.3, 85.8) $$,
  '42501', 'You can only change events you manage.', 'other users cannot move the pin');

select * from finish();
rollback;
