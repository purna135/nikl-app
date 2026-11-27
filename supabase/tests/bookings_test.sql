-- Booking: holds, prices, promo codes, payments, expiry and late payments.
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

insert into auth.users (id, phone, aud, role) values
  ('c1000000-0000-0000-0000-000000000001', '919000000051', 'authenticated', 'authenticated'),  -- organizer
  ('c1000000-0000-0000-0000-000000000002', '919000000052', 'authenticated', 'authenticated'),  -- asha (set up)
  ('c1000000-0000-0000-0000-000000000003', '919000000053', 'authenticated', 'authenticated'),  -- ravi (set up)
  ('c1000000-0000-0000-0000-000000000004', '919000000054', 'authenticated', 'authenticated');  -- new (no profile)
update public.profiles set username = 'asha', name = 'Asha' where id = 'c1000000-0000-0000-0000-000000000002';
update public.profiles set username = 'ravi', name = 'Ravi' where id = 'c1000000-0000-0000-0000-000000000003';
update public.profiles_private set dob_year = 2000
where id in ('c1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003');

-- Organizer: a paid gig (2 Regular at ₹499, capacity 3) and a free run
set local role authenticated;
set local request.jwt.claims to '{"sub": "c1000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select public.create_club('Booking Testers', 'booking.testers', 'music', null, 'Patia', null);
reset role;
update public.clubs set review_status = 'approved' where handle = 'booking.testers';
set local role authenticated;
set local request.jwt.claims to '{"sub": "c1000000-0000-0000-0000-000000000001", "role": "authenticated"}';
select public.create_event((select id from public.clubs where handle = 'booking.testers'), 'Paid Gig', 'music',
  now() + interval '2 days', p_venue_name => 'Rooftop', p_capacity => 3, p_publish => true,
  p_tiers => '[{"name": "Regular", "price_paise": 49900, "quantity": 2}, {"name": "VIP", "price_paise": 99900}]');
select public.create_event((select id from public.clubs where handle = 'booking.testers'), 'Free Run', 'fitness',
  now() + interval '3 days', p_venue_name => 'Track', p_publish => true);
insert into public.promo_codes (club_id, code, percent_off, max_uses)
values ((select id from public.clubs where handle = 'booking.testers'), 'EARLY10', 10, 5);

reset role;
create temp table ids as
select (select o.id from public.event_occurrences o join public.events e on e.id = o.event_id where e.title = 'Paid Gig') as gig,
       (select o.id from public.event_occurrences o join public.events e on e.id = o.event_id where e.title = 'Free Run') as run,
       (select t.id from public.ticket_tiers t join public.event_occurrences o on o.id = t.occurrence_id join public.events e on e.id = o.event_id
         where e.title = 'Paid Gig' and t.name = 'Regular') as regular,
       (select t.id from public.ticket_tiers t join public.event_occurrences o on o.id = t.occurrence_id join public.events e on e.id = o.event_id
         where e.title = 'Paid Gig' and t.name = 'VIP') as vip,
       (select t.id from public.ticket_tiers t join public.event_occurrences o on o.id = t.occurrence_id join public.events e on e.id = o.event_id
         where e.title = 'Free Run') as free_rsvp;
grant select on ids to authenticated, anon;
set local role authenticated;
set local request.jwt.claims to '{"sub": "c1000000-0000-0000-0000-000000000002", "role": "authenticated"}';

-- Prices
select results_eq(
  $$ select subtotal_paise, discount_paise, fee_paise, total_paise
     from public.quote_booking((select gig from ids), jsonb_build_array(jsonb_build_object('tier_id', (select regular from ids), 'qty', 2))) $$,
  $$ values (99800, 0, 4000, 103800) $$,
  '2 × ₹499 = ₹998 + 4% fee rounded to ₹40 = ₹1,038');
select results_eq(
  $$ select discount_paise, fee_paise, total_paise
     from public.quote_booking((select gig from ids), jsonb_build_array(jsonb_build_object('tier_id', (select regular from ids), 'qty', 2)), 'early10') $$,
  $$ values (9980, 3600, 93420) $$,
  'promo codes work in any case and the fee is on the discounted amount');
select throws_ok(
  $$ select * from public.quote_booking((select gig from ids), jsonb_build_array(jsonb_build_object('tier_id', (select regular from ids), 'qty', 3))) $$,
  '22023', 'Only 2 Regular left.', 'a ticket type can''t be oversold');
select throws_ok(
  $$ select * from public.quote_booking((select gig from ids), jsonb_build_array(jsonb_build_object('tier_id', (select vip from ids), 'qty', 4))) $$,
  '22023', 'Only 3 spots left.', 'the event can''t go over capacity');
select throws_ok(
  $$ select * from public.quote_booking((select gig from ids), jsonb_build_array(jsonb_build_object('tier_id', (select regular from ids), 'qty', 1)), 'NOPE') $$,
  '22023', 'That code doesn''t work for this event.', 'unknown codes are refused');

-- Booking needs a finished profile (P11, P16)
set local request.jwt.claims to '{"sub": "c1000000-0000-0000-0000-000000000004", "role": "authenticated"}';
select throws_ok(
  $$ select * from public.hold_booking((select run from ids), jsonb_build_array(jsonb_build_object('tier_id', (select free_rsvp from ids), 'qty', 1))) $$,
  '22023', 'Finish setting up your profile first.', 'booking needs a finished profile');

-- Free RSVP: confirmed at once with a ticket
set local request.jwt.claims to '{"sub": "c1000000-0000-0000-0000-000000000002", "role": "authenticated"}';
select results_eq(
  $$ select status, total_paise, pay_token is null
     from public.hold_booking((select run from ids), jsonb_build_array(jsonb_build_object('tier_id', (select free_rsvp from ids), 'qty', 1)), null, 'asha-run-1') $$,
  $$ values ('confirmed', 0, true) $$,
  'a free RSVP is confirmed straight away');
select is((select count(*)::int from public.tickets where user_id = 'c1000000-0000-0000-0000-000000000002'), 1, 'and gets a ticket');
select ok((select code ~ '^NKL-[A-Z2-9]{6}$' from public.tickets where user_id = 'c1000000-0000-0000-0000-000000000002'),
  'ticket codes look like NKL-XXXXXX');
select is((select count(*)::int from public.hold_booking((select run from ids),
             jsonb_build_array(jsonb_build_object('tier_id', (select free_rsvp from ids), 'qty', 1)), null, 'asha-run-1')
           where status = 'confirmed'), 1, 'repeating the same request returns the same booking');
select is((select count(*)::int from public.bookings where user_id = 'c1000000-0000-0000-0000-000000000002'), 1, 'and doesn''t book twice');

-- Paid: hold 2 Regular with the promo code
select ok((select status = 'held' and hold_expires_at > now() + interval '9 minutes' and pay_token ~ '^[0-9a-f]{36}$'
           from public.hold_booking((select gig from ids), jsonb_build_array(jsonb_build_object('tier_id', (select regular from ids), 'qty', 2)), 'EARLY10')),
  'a paid booking is held for 10 minutes with a pay link');
select is((select seats_taken from public.event_occurrences where id = (select gig from ids)), 2, 'held seats count as taken');
reset role;
create temp table tok as select pay_token from public.bookings where promo_code_id is not null;
grant select on tok to anon, authenticated;
set local role authenticated;

-- Ravi can't get Regular now
set local request.jwt.claims to '{"sub": "c1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select throws_ok(
  $$ select * from public.hold_booking((select gig from ids), jsonb_build_array(jsonb_build_object('tier_id', (select regular from ids), 'qty', 1))) $$,
  '22023', 'Only 0 Regular left.', 'held tickets can''t be taken by someone else');

-- The pay page, by token, needs no login
set local role anon;
set local request.jwt.claims to '{"role": "anon"}';
select is((select event_title from public.booking_for_payment((select pay_token from tok))),
  'Paid Gig', 'the pay page finds the booking by its link');
reset role;

-- Payment (as the server would): start, then captured twice
select public.start_payment((select pay_token from tok), 'mock', 'order_test_1');
select is(public.payment_captured('order_test_1', 'pay_test_1', 'upi', 93420), 'confirmed', 'a captured payment confirms the booking');
select is(public.payment_captured('order_test_1', 'pay_test_1', 'upi', 93420), 'confirmed', 'and a repeat (webhook + checkout) is harmless');
select is((select count(*)::int from public.tickets t join public.bookings b on b.id = t.booking_id where b.promo_code_id is not null), 2,
  'two tickets, issued once');
select is((select used from public.promo_codes where code = 'EARLY10' and club_id = (select id from public.clubs where handle = 'booking.testers')), 1, 'the code counts one use');
select throws_ok($$ select public.payment_captured('order_test_1', 'pay_x', 'upi', 100) $$, '22023', null, 'a wrong amount is refused');

-- Expiry: Ravi holds a VIP, the hold runs out, the seat comes back
set local role authenticated;
set local request.jwt.claims to '{"sub": "c1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select * from public.hold_booking((select gig from ids), jsonb_build_array(jsonb_build_object('tier_id', (select vip from ids), 'qty', 1)));
reset role;
update public.bookings set hold_expires_at = now() - interval '1 minute' where user_id = 'c1000000-0000-0000-0000-000000000003';
select is(public.expire_holds(), 1, 'expired holds are released');
select is((select seats_taken from public.event_occurrences where id = (select gig from ids)), 2, 'and their seats come back');

-- Ravi pays after expiry: the seat is still free, so he gets it
-- start_payment refuses expired holds, so record the order as one that was already open before expiry
insert into public.payments (booking_id, provider, provider_order_id, amount_paise, status)
select id, 'mock', 'order_late', total_paise, 'created' from public.bookings where user_id = 'c1000000-0000-0000-0000-000000000003';
select is(public.payment_captured('order_late', 'pay_late', 'upi',
            (select total_paise from public.bookings where user_id = 'c1000000-0000-0000-0000-000000000003')),
  'confirmed', 'a late payment still gets the seat when one is free');

-- Someone else's late payment when the event is full: a refund is queued
reset role;
update public.event_occurrences set capacity = 3 where id = (select gig from ids);
insert into public.bookings (user_id, occurrence_id, status, subtotal_paise, fee_paise, total_paise, idempotency_key)
values ('c1000000-0000-0000-0000-000000000002', (select gig from ids), 'expired', 99900, 4000, 103900, 'late-full');
insert into public.booking_items (booking_id, tier_id, qty, unit_price_paise)
select id, (select vip from ids), 1, 99900 from public.bookings where idempotency_key = 'late-full';
insert into public.payments (booking_id, provider, provider_order_id, amount_paise, status)
select id, 'mock', 'order_full', 103900, 'created' from public.bookings where idempotency_key = 'late-full';
select is(public.payment_captured('order_full', 'pay_full', 'upi', 103900), 'refund_pending',
  'a late payment for a full event queues a refund');

-- Pressing Pay again doesn't keep extending the hold
reset role;
update public.event_occurrences set capacity = 10 where id = (select gig from ids);
set local role authenticated;
set local request.jwt.claims to '{"sub": "c1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
create temp table again as
select * from public.hold_booking((select gig from ids), jsonb_build_array(jsonb_build_object('tier_id', (select vip from ids), 'qty', 1)), null, 'ravi-key');
reset role;
update public.bookings set created_at = now() - interval '15 minutes' where idempotency_key = 'ravi-key';
select public.start_payment((select pay_token from again), 'mock', 'order_again_1');
select public.start_payment((select pay_token from again), 'mock', 'order_again_2');
select ok((select hold_expires_at <= created_at + interval '20 minutes' from public.bookings where idempotency_key = 'ravi-key'),
  'a hold is never extended past 20 minutes');

-- After a hold is cancelled, the same key starts a new booking
set local role authenticated;
set local request.jwt.claims to '{"sub": "c1000000-0000-0000-0000-000000000003", "role": "authenticated"}';
select public.cancel_hold((select booking_id from again));
select isnt((select booking_id from public.hold_booking((select gig from ids),
               jsonb_build_array(jsonb_build_object('tier_id', (select vip from ids), 'qty', 1)), null, 'ravi-key')),
            (select booking_id from again),
  'the same key after a cancelled hold gives a new booking');

select * from finish();
rollback;
