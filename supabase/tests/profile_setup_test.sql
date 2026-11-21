-- Profile set-up rules (18+, unique usernames, private year of birth).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, phone, aud, role) values
  ('d0000000-0000-0000-0000-00000000000d', '919000000011', 'authenticated', 'authenticated'),
  ('e0000000-0000-0000-0000-00000000000e', '919000000012', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims to '{"sub": "d0000000-0000-0000-0000-00000000000d", "role": "authenticated"}';

select lives_ok(
  $$ select public.complete_profile('Riya Mohanty', 'Riya.Nikls', 'Patia', array['fitness', 'comedy', 'games'], 2001) $$,
  'a person can complete their profile');

select is((select username from public.profiles where id = auth.uid()), 'riya.nikls', 'usernames are stored in lowercase');

select is((select dob_year::int from public.profiles_private where id = auth.uid()), 2001,
  'the year of birth is saved privately');

select throws_ok(
  $$ select public.complete_profile('Kid', 'young.one', 'Patia', array['fitness', 'comedy', 'games'],
       extract(year from now())::int - 15) $$,
  '22023', 'You need to be 18 or older to use Nikl.', 'under-18s are turned away');

select throws_ok(
  $$ update public.profiles_private set dob_year = 1990 where id = auth.uid() $$,
  '42501', null, 'the private table cannot be written directly');

select throws_ok(
  $$ select public.complete_profile('Riya', 'riya.nikls', 'Patia', array['fitness'], 2001) $$,
  '22023', 'Pick at least 3 things you''re into.', 'at least 3 interests are required');

select throws_ok(
  $$ select public.complete_profile('Riya', 'riya.nikls', 'Patia', array['fitness', 'fitness', 'fitness'], 2001) $$,
  '22023', 'Pick at least 3 things you''re into.', 'repeating one interest does not count as 3');

set local request.jwt.claims to '{"sub": "e0000000-0000-0000-0000-00000000000e", "role": "authenticated"}';
select throws_ok(
  $$ select public.complete_profile('Someone Else', 'RIYA.nikls', 'Old Town', array['art', 'music', 'food'], 1995) $$,
  '23505', 'That username is taken. Try another one.', 'usernames are unique, ignoring case');

select * from finish();
rollback;
