-- =============================================================================
-- Nikl · local demo data (Bhubaneswar)
-- -----------------------------------------------------------------------------
-- Loaded by `supabase db reset`. Everything here is a FICTIONAL example that
-- matches the prototype: clubs, venues, events, ticket tiers, club posts and
-- auto-stories. No users or profiles: sign up with phone OTP to create one.
-- Fixed UUIDs so the data is stable across resets.
--   venues a0…  clubs c0…  events e0…  occurrences d0…  tiers f0…  posts b0…  stories 50…
-- =============================================================================

-- Venues ----------------------------------------------------------------------
insert into public.venues (id, name, address, area, location) values
  ('a0000000-0000-4000-8000-000000000001', 'Infocity Square',               'Infocity Square, Patia',            'Patia',            'SRID=4326;POINT(85.8186 20.3507)'),
  ('a0000000-0000-4000-8000-000000000002', 'Clay & Chai Studio',            'Saheed Nagar',                      'Saheed Nagar',     'SRID=4326;POINT(85.8440 20.2900)'),
  ('a0000000-0000-4000-8000-000000000003', 'The Courtyard Café',            'Jaydev Vihar',                      'Jaydev Vihar',     'SRID=4326;POINT(85.8220 20.2985)'),
  ('a0000000-0000-4000-8000-000000000004', 'Ekamra Kanan, Gate 1',          'Ekamra Kanan, Nayapalli',           'Nayapalli',        'SRID=4326;POINT(85.8130 20.3025)'),
  ('a0000000-0000-4000-8000-000000000005', 'Dice & Dosa Café',              'Chandrasekharpur',                  'Chandrasekharpur', 'SRID=4326;POINT(85.8190 20.3230)'),
  ('a0000000-0000-4000-8000-000000000006', 'Master Canteen Square',         'Master Canteen Square',             'Kharavel Nagar',   'SRID=4326;POINT(85.8420 20.2700)'),
  ('a0000000-0000-4000-8000-000000000007', 'Studio Nine',                   'Nayapalli',                         'Nayapalli',        'SRID=4326;POINT(85.8090 20.2950)'),
  ('a0000000-0000-4000-8000-000000000008', 'Skyline Terrace',               'Patia',                             'Patia',            'SRID=4326;POINT(85.8230 20.3550)'),
  ('a0000000-0000-4000-8000-000000000009', 'Old Town Grounds',              'Old Town',                          'Old Town',         'SRID=4326;POINT(85.8350 20.2400)'),
  ('a0000000-0000-4000-8000-000000000010', 'Kuakhai riverbank',             'Near the old bridge, Kuakhai',      'Kuakhai',          'SRID=4326;POINT(85.8650 20.2900)'),
  ('a0000000-0000-4000-8000-000000000011', 'Paper Lantern Café',            'Saheed Nagar',                      'Saheed Nagar',     'SRID=4326;POINT(85.8460 20.2930)'),
  ('a0000000-0000-4000-8000-000000000012', 'Infocity Ground',               'Infocity, Patia',                   'Patia',            'SRID=4326;POINT(85.8160 20.3480)')
on conflict (id) do nothing;

-- Clubs -----------------------------------------------------------------------
insert into public.clubs (id, name, handle, kind, category, bio, area, location, verified, kyc_status, rating_avg, rating_count, created_by) values
  ('c0000000-0000-4000-8000-000000000001', 'Patia Pacers',             'patia.pacers',             'Run club',            'fitness',  'Easy-paced community runs every Sunday at sunrise and track work on Tuesdays. All speeds welcome. Nobody gets left behind.', 'Patia',            'SRID=4326;POINT(85.8186 20.3507)', true,  'verified',    4.9, 212, null),
  ('c0000000-0000-4000-8000-000000000002', 'Clay & Chai Studio',       'clay.and.chai.studio',     'Pottery studio',      'art',      'Wheel-throwing and hand-building classes with endless chai. Small batches of 10.',                                           'Saheed Nagar',     'SRID=4326;POINT(85.8440 20.2900)', true,  'verified',    4.8,  96, null),
  ('c0000000-0000-4000-8000-000000000003', 'Old Town Mic',             'old.town.mic',             'Open mic collective', 'comedy',   'Stand-up, poetry, songs and stories. 5-minute slots, all languages welcome: Odia, Hindi, English or a mix.',               'Jaydev Vihar',     'SRID=4326;POINT(85.8220 20.2985)', true,  'verified',    4.7, 158, null),
  ('c0000000-0000-4000-8000-000000000004', 'Lakeside Sketch Club',     'lakeside.sketch.club',     'Urban sketchers',     'art',      'We draw the city on location, one temple, tree and tea stall at a time. Bring any sketchbook.',                            'Nayapalli',        'SRID=4326;POINT(85.8130 20.3025)', false, 'not_started', 4.9,  41, null),
  ('c0000000-0000-4000-8000-000000000005', 'Board Game Adda',          'board.game.adda',          'Game nights',         'games',    '200+ games, friendly hosts who teach the rules, and tables that mix strangers into friends.',                              'Chandrasekharpur', 'SRID=4326;POINT(85.8190 20.3230)', true,  'verified',    4.8, 120, null),
  ('c0000000-0000-4000-8000-000000000006', 'Kalinga Trekkers',         'kalinga.trekkers',         'Treks & day trips',   'outdoors', 'Weekend treks, day trips and camping across Odisha. Small groups, certified leads.',                                       'Bhubaneswar',      'SRID=4326;POINT(85.8420 20.2700)', true,  'verified',    4.8, 301, null),
  ('c0000000-0000-4000-8000-000000000007', 'Salsa Saturdays BBSR',     'salsa.saturdays.bbsr',     'Dance classes',       'dance',    'Beginner-friendly salsa and bachata. No partner needed, we rotate.',                                                       'Nayapalli',        'SRID=4326;POINT(85.8090 20.2950)', false, 'pending',     4.7,  58, null),
  ('c0000000-0000-4000-8000-000000000008', 'Terrace Sessions',         'terrace.sessions',         'Live indie gigs',     'music',    'Live original music from Odisha''s indie scene, under the sky.',                                                          'Patia',            'SRID=4326;POINT(85.8230 20.3550)', true,  'verified',    4.6, 187, null),
  ('c0000000-0000-4000-8000-000000000009', 'Sunday Flea BBSR',         'sunday.flea.bbsr',         'Weekend market',      'markets',  'Thrift, handmade, vinyl, plants and street food. Every other Sunday.',                                                     'Old Town',         'SRID=4326;POINT(85.8350 20.2400)', true,  'verified',    4.7, 244, null),
  ('c0000000-0000-4000-8000-000000000010', 'Green Kuakhai Collective', 'green.kuakhai.collective', 'Volunteer group',     'social',   'Riverbank cleanups and tree planting. Two hours on a Sunday morning makes a dent.',                                        'Kuakhai',          'SRID=4326;POINT(85.8650 20.2900)', false, 'not_started', 4.9,  37, null),
  ('c0000000-0000-4000-8000-000000000011', 'BBSR Book Circle',         'bbsr.book.circle',         'Book club',           'learn',    'A relaxed monthly book club. Read the book or don''t, the conversation is the point.',                                    'Saheed Nagar',     'SRID=4326;POINT(85.8460 20.2930)', false, 'not_started', 4.8,  63, null)
on conflict (id) do nothing;

-- Events ----------------------------------------------------------------------
insert into public.events (id, club_id, title, slug, category, description, venue_id, status, visibility, recurrence_rule, tags, refund_policy, age_limit, published_at, created_by) values
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Sunrise 5K Social Run', 'sunrise-5k-social-run', 'fitness',
   'A relaxed 5K loop around Infocity with pacers at 6, 7 and 8 min/km. Stay back for filter coffee and a group stretch.',
   'a0000000-0000-4000-8000-000000000001', 'published', 'public', 'FREQ=WEEKLY;BYDAY=SU', '{beginner-friendly,solo-friendly}', 'Free event', null, '2026-11-15 10:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'Pottery & Chai: Wheel Basics', 'pottery-and-chai-wheel-basics', 'art',
   'Your first time at the wheel. Centre, open and pull a cup with a patient instructor. Fired pieces are ready in 2 weeks.',
   'a0000000-0000-4000-8000-000000000002', 'published', 'public', null, '{beginner-friendly,small-batch}', 'Full refund up to 24 hours before the start', 14, '2026-11-10 12:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'Open Mic Night Vol. 14', 'open-mic-night-vol-14', 'comedy',
   '14 performers, 5 minutes each. Stand-up, poetry, music and the odd magic trick. Sign up at the door to perform, or just come and cheer.',
   'a0000000-0000-4000-8000-000000000003', 'published', 'public', null, '{solo-friendly}', 'Full refund up to 24 hours before the start', 18, '2026-11-12 18:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'Ekamra Kanan Sketch Walk', 'ekamra-kanan-sketch-walk', 'art',
   'Sketch the gardens in the soft morning light. A quick warm-up demo, then an hour of drawing and a show-and-tell.',
   'a0000000-0000-4000-8000-000000000004', 'published', 'public', null, '{beginner-friendly,outdoor}', 'Free event', null, '2026-11-14 09:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', 'Board Game Night', 'board-game-night-21-nov', 'games',
   'Party games, strategy games and everything between. Hosts teach every game, and solo players get matched to a table.',
   'a0000000-0000-4000-8000-000000000005', 'published', 'public', null, '{solo-friendly,indoor}', 'Full refund up to 24 hours before the start', null, '2026-11-13 11:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000006', 'Chilika Day Trip & Dolphin Spotting', 'chilika-day-trip-dolphin-spotting', 'outdoors',
   'AC bus to Satapada, a boat ride to spot Irrawaddy dolphins, lunch and sunset at the sea mouth.',
   'a0000000-0000-4000-8000-000000000006', 'published', 'public', null, '{transport-included,lunch-included}', 'Full refund up to 72 hours before the start', null, '2026-11-08 10:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000007', 'Salsa for Absolute Beginners', 'salsa-for-absolute-beginners', 'dance',
   'Basic steps, a first turn and a full song by the end. No partner needed, we rotate every few minutes.',
   'a0000000-0000-4000-8000-000000000007', 'published', 'public', null, '{beginner-friendly,solo-friendly}', 'Full refund up to 24 hours before the start', null, '2026-11-16 10:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000008', 'Indie Night on the Terrace', 'indie-night-on-the-terrace', 'music',
   'Three local bands, original songs only. Rooftop seating, fairy lights and a late kitchen.',
   'a0000000-0000-4000-8000-000000000008', 'published', 'public', null, '{live-band}', 'No refunds within 48 hours of the start', 21, '2026-11-11 19:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000009', 'Sunday Flea Market', 'sunday-flea-market-22-nov', 'markets',
   '60+ stalls of thrift, handloom, vinyl, plants and street food, with live music from 4 PM.',
   'a0000000-0000-4000-8000-000000000009', 'published', 'public', null, '{free-entry,pet-friendly}', 'Free event', null, '2026-11-09 10:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000010', 'c0000000-0000-4000-8000-000000000010', 'Kuakhai Riverbank Cleanup', 'kuakhai-riverbank-cleanup', 'social',
   'Two hours, one riverbank, lots of hands. Gloves, bags and breakfast provided. Certificates for students.',
   'a0000000-0000-4000-8000-000000000010', 'published', 'public', null, '{volunteer,solo-friendly}', 'Free event', null, '2026-11-15 08:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-000000000011', 'Book Circle: Odia Short Stories', 'book-circle-odia-short-stories', 'learn',
   'This month: three classic Odia short stories, read in Odia or in translation.',
   'a0000000-0000-4000-8000-000000000011', 'published', 'public', null, '{beginner-friendly,indoor}', 'Free event', null, '2026-11-12 10:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000012', 'c0000000-0000-4000-8000-000000000001', 'Tuesday Track Intervals', 'tuesday-track-intervals', 'fitness',
   'Structured intervals with a coach. 400m repeats this week. A good next step after your first 5K.',
   'a0000000-0000-4000-8000-000000000012', 'published', 'public', 'FREQ=WEEKLY;BYDAY=TU', '{intermediate}', 'Free event', null, '2026-11-17 10:00+05:30', null),
  ('e0000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-000000000001', 'Full Moon 10K Night Run', 'full-moon-10k-night-run', 'fitness',
   'A 10K loop under the full moon with glow bands, two water stops and a finisher tee. Pacers for 55, 60 and 70 minutes.',
   'a0000000-0000-4000-8000-000000000001', 'published', 'public', null, '{intermediate,finisher-tee}', 'Full refund up to 48 hours before the start', null, '2026-11-18 10:00+05:30', null)
on conflict (id) do nothing;

-- Occurrences (times in IST) ------------------------------------------------------
insert into public.event_occurrences (id, event_id, starts_at, ends_at, capacity, seats_taken) values
  ('d0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', '2026-11-22 06:00+05:30', '2026-11-22 07:30+05:30', 150,  86),
  ('d0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', '2026-11-21 16:00+05:30', '2026-11-21 18:30+05:30',  10,   9),
  ('d0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003', '2026-11-21 19:30+05:30', '2026-11-21 22:00+05:30',  80,  64),
  ('d0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004', '2026-11-22 07:30+05:30', '2026-11-22 09:30+05:30',  40,  32),
  ('d0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000005', '2026-11-21 18:00+05:30', '2026-11-21 22:00+05:30',  36,  27),
  ('d0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000006', '2026-11-29 05:00+05:30', '2026-11-29 20:00+05:30',  30,  22),
  ('d0000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000007', '2026-11-27 19:00+05:30', '2026-11-27 20:30+05:30',  24,  18),
  ('d0000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000008', '2026-11-21 20:30+05:30', '2026-11-21 23:30+05:30', 200, 140),
  ('d0000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000009', '2026-11-22 11:00+05:30', '2026-11-22 19:00+05:30', null, 410),
  ('d0000000-0000-4000-8000-000000000010', 'e0000000-0000-4000-8000-000000000010', '2026-11-22 07:00+05:30', '2026-11-22 09:30+05:30',  80,  54),
  ('d0000000-0000-4000-8000-000000000011', 'e0000000-0000-4000-8000-000000000011', '2026-11-22 17:00+05:30', '2026-11-22 19:00+05:30',  25,  19),
  ('d0000000-0000-4000-8000-000000000012', 'e0000000-0000-4000-8000-000000000012', '2026-11-24 06:00+05:30', '2026-11-24 07:00+05:30',  60,  41),
  ('d0000000-0000-4000-8000-000000000013', 'e0000000-0000-4000-8000-000000000013', '2026-12-05 19:00+05:30', '2026-12-05 21:00+05:30', 200, 128)
on conflict (id) do nothing;

-- Ticket tiers (prices in paise; seats_taken above = sum of sold × seats_per_ticket) --
insert into public.ticket_tiers (id, occurrence_id, name, price_paise, quantity, sold, seats_per_ticket, position) values
  ('f0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Free RSVP',   0,      150,  86, 1, 0),
  ('f0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'Regular',     89900,   10,   9, 1, 0),
  ('f0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'Early bird',  14900,   20,  20, 1, 0),
  ('f0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000003', 'Regular',     19900,   56,  40, 1, 1),
  ('f0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003', 'Squad of 4',  69900,    6,   1, 4, 2),
  ('f0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000004', 'Free RSVP',   0,       40,  32, 1, 0),
  ('f0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000005', 'Regular',     24900,   36,  27, 1, 0),
  ('f0000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000006', 'Regular',     149900,  30,  22, 1, 0),
  ('f0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000007', 'Regular',     35000,   24,  18, 1, 0),
  ('f0000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000008', 'Regular',     49900,  200, 140, 1, 0),
  ('f0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000009', 'Free RSVP',   0,     null, 410, 1, 0),
  ('f0000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000010', 'Free RSVP',   0,       80,  54, 1, 0),
  ('f0000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000011', 'Free RSVP',   0,       25,  19, 1, 0),
  ('f0000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000012', 'Free RSVP',   0,       60,  41, 1, 0),
  ('f0000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000013', 'Early bird',  29900,   50,  50, 1, 0),
  ('f0000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000013', 'Regular',     34900,  150,  78, 1, 1)
on conflict (id) do nothing;

-- Club posts (already approved) -------------------------------------------------
insert into public.posts (id, author_type, author_id, kind, caption, event_id, club_id, moderation_status, visibility, created_by, created_at) values
  ('b0000000-0000-4000-8000-000000000001', 'club', 'c0000000-0000-4000-8000-000000000003', 'event',
   'Vol. 14 is here 🎤 14 performers, 5 minutes each, one very loud courtyard. Sign-ups open at the door.',
   'e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'approved', 'public', null, now() - interval '2 hours'),
  ('b0000000-0000-4000-8000-000000000002', 'club', 'c0000000-0000-4000-8000-000000000001', 'event',
   'Sunday sunrise crew 🌅 5K, three pace groups, filter coffee after. First-timers, this one is for you.',
   'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'approved', 'public', null, now() - interval '5 hours'),
  ('b0000000-0000-4000-8000-000000000003', 'club', 'c0000000-0000-4000-8000-000000000002', 'event',
   'Happening right now ☕ wheel basics with chai. One spot left for next Saturday''s batch.',
   'e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'approved', 'public', null, now() - interval '1 hour'),
  ('b0000000-0000-4000-8000-000000000004', 'club', 'c0000000-0000-4000-8000-000000000008', 'event',
   'Lineup drop 🎸 three bands, one rooftop, zero covers.',
   'e0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000008', 'approved', 'public', null, now() - interval '8 hours'),
  ('b0000000-0000-4000-8000-000000000005', 'club', 'c0000000-0000-4000-8000-000000000006', 'event',
   'Dolphins, sunsets and seafood 🐬 Chilika day trip next Sunday. 8 seats left.',
   'e0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000006', 'approved', 'public', null, now() - interval '1 day'),
  ('b0000000-0000-4000-8000-000000000006', 'club', 'c0000000-0000-4000-8000-000000000009', 'event',
   '60+ stalls this Sunday 🛍️ thrift, handloom, vinyl, plants and street food. Free entry.',
   'e0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000009', 'approved', 'public', null, now() - interval '1 day')
on conflict (id) do nothing;

-- Auto-stories from events (rendered from data, live for 24h after each reset) -----
insert into public.stories (id, author_type, author_id, kind, event_id, template, moderation_status, expires_at, created_by) values
  ('50000000-0000-4000-8000-000000000001', 'club', 'c0000000-0000-4000-8000-000000000002', 'event_auto', 'e0000000-0000-4000-8000-000000000002', '{"kicker": "Happening now"}', 'approved', now() + interval '24 hours', null),
  ('50000000-0000-4000-8000-000000000002', 'club', 'c0000000-0000-4000-8000-000000000001', 'event_auto', 'e0000000-0000-4000-8000-000000000001', '{"kicker": "This Sunday"}',   'approved', now() + interval '24 hours', null),
  ('50000000-0000-4000-8000-000000000003', 'club', 'c0000000-0000-4000-8000-000000000003', 'event_auto', 'e0000000-0000-4000-8000-000000000003', '{"kicker": "Tonight"}',       'approved', now() + interval '24 hours', null),
  ('50000000-0000-4000-8000-000000000004', 'club', 'c0000000-0000-4000-8000-000000000008', 'event_auto', 'e0000000-0000-4000-8000-000000000008', '{"kicker": "Tonight"}',       'approved', now() + interval '24 hours', null),
  ('50000000-0000-4000-8000-000000000005', 'club', 'c0000000-0000-4000-8000-000000000006', 'event_auto', 'e0000000-0000-4000-8000-000000000006', '{"kicker": "Next Sunday"}',   'approved', now() + interval '24 hours', null),
  ('50000000-0000-4000-8000-000000000006', 'club', 'c0000000-0000-4000-8000-000000000009', 'event_auto', 'e0000000-0000-4000-8000-000000000009', '{"kicker": "This Sunday"}',   'approved', now() + interval '24 hours', null),
  ('50000000-0000-4000-8000-000000000007', 'club', 'c0000000-0000-4000-8000-000000000011', 'event_auto', 'e0000000-0000-4000-8000-000000000011', '{"kicker": "Sunday 5 PM"}',   'approved', now() + interval '24 hours', null)
on conflict (id) do nothing;

-- City Passport badges ------------------------------------------------------------
insert into public.badges (id, name, description, icon) values
  ('first_nikl',  'First Nikl',  'Booked your first plan',          '🎟️'),
  ('early_bird',  'Early Bird',  'Went to 3 sunrise events',        '🌅'),
  ('explorer',    'Explorer',    'Tried 6 different categories',    '🧭'),
  ('squad_goals', 'Squad Goals', 'Planned 3 outings with friends',  '👯')
on conflict (id) do nothing;

-- Sample clubs were set up by Nikl, so they start approved (DECISIONS.md P15)
update public.clubs set review_status = 'approved', reviewed_at = now() where review_status = 'pending';
