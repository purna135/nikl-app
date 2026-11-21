# Nikl: Product Plan

> Events, activities & clubs app, launching in Bhubaneswar. Name decided: **Nikl** (see section 14). Status: **planning done; development started** (week 1 complete, see [DEV_PLAN.md](DEV_PLAN.md)).
> Every decision, with the reason and when to revisit it, is in [DECISIONS.md](DECISIONS.md). Who does what next: [NEXT_STEPS.md](NEXT_STEPS.md).
> Last updated: 21 Nov 2026

---

## 1. The problem

- Bhubaneswar has a lot going on: run clubs, art workshops, open mics, gigs, café events, treks, sports meetups, college fests and weekend markets.
- **Finding out about them is hard.** Most of it lives on Instagram, and you only see it if you already follow the right page. Some is in WhatsApp groups, some is on posters in cafés, and some is word of mouth.
- Organizers (clubs, cafés, small collectives) have the opposite problem. They can't reach people outside their followers, they collect payments by hand ("send UPI to this number + screenshot"), and they track RSVPs in Google Forms or DMs.

## 2. The idea in one line

**"Instagram for what's happening in your city."** One place to discover every event, activity and club in Bhubaneswar. You can browse it as a feed or on a map, book and pay by UPI in a few taps, follow the clubs you like, and bring your friends.

Three things go together:

1. **Discover**: a feed, a map, categories and "this weekend".
2. **Do**: RSVP or book, pay by UPI, get a QR ticket.
3. **Belong**: follow organizers and clubs, go with friends, and come back every week.

## 3. Who it's for

| Persona | Who | What they want | Hook for them |
|---|---|---|---|
| **Riya, 21, student** | KIIT/SOA/ITER student, living in Patia | Cheap, fun weekend plans with friends | "What's on this weekend under ₹300", plus squads |
| **Arjun, 26, young professional** | Works in Infocity/Chandrasekharpur, new to the city | Make friends, find hobbies | Recurring clubs (run, board games, books), plus a "going solo? join others" option |
| **Sneha, 29, hobbyist** | Into art, pottery and music | Workshops and classes nearby | Category follow and new-workshop alerts |
| **Organizer (club or café)** | Run club, art studio, café, college society | Reach, easy payments, attendee list | A free page, UPI payouts, QR check-in, and a broadcast to followers |

**Launch focus:** people aged 18–30 in Bhubaneswar, with Android as the priority (most of our users will be on Android).

## 4. Competitive landscape: what to borrow and what to avoid

| App / service | What it does well | Gap we can fill | Borrow |
|---|---|---|---|
| **MigoMap** | A live map of nearby "plans". Tap a bubble to see who's going, join in one tap, and a group chat opens per plan. Shows the attendee list before you join. Self-serve sponsored pins for places. | User-made plans only. No ticketing, payments or club pages. | Map as the hero view, "who's going" before joining, a group chat per event, self-serve promoted pins |
| **District (Zomato) / BookMyShow** | Big ticketed events, reliable checkout | Small local events, clubs and free meetups are missing. Organizer onboarding is heavy. | Clean checkout, ticket wallet |
| **Luma** | A beautiful event page made in 2 minutes, calendar-based communities, follow a calendar | Built for tech/professional events, not local or city-wide discovery | Effortless event creation, "subscribe to an organizer" |
| **Partiful** | Fun, youthful invites, "who's coming" vibes, comment wall | Private invites only, not discovery | Playful tone, RSVP reactions, guest wall |
| **Meetup** | Recurring groups and memberships | Dated UX, low usage in India | Club membership plus recurring events |
| **Eventbrite / Allevents.in** | Wide coverage, search | A cluttered, ad-like feel with lots of stale listings | City aggregation, but curated |
| **Instagram** | Where young people already are. Reels, stories, follows. | Events disappear in the feed. No booking, no calendar, no map. | Organizer profile grid, stories-style highlights, follow model |
| **Strava clubs** | Club pages, weekly recurring runs, kudos | Fitness only | Recurring sessions, streaks and badges |
| **Timeleft / Bumble BFF** | Meeting new people when you come alone | Single-purpose | A "Going solo" tag and "join a group" option |
| **Playo / Hudle** | Sports slot booking with split pay | Sports only | Split payment, "need 2 more players" |

**Our angle:** *local-first, everything-in-one-place, social.* The big players chase large ticketed shows, and Instagram has the audience but no tools. We sit in between: **every small and medium event in one city, done really well.**

## 5. Categories (taxonomy)

There are about 12 top-level categories, each with sub-tags. Users pick 3–5 when they sign up, and that powers their personalised feed.

| Category | Examples (sub-tags) |
|---|---|
| 🏃 **Fitness & Sports** | Run clubs, cycling, yoga, football/box cricket, badminton, pickleball, Zumba |
| 🎨 **Art & Craft** | Painting, pottery, resin art, sketch walks, workshops |
| 🎵 **Music & Gigs** | Live bands, open mics, DJ nights, jamming sessions, classical/Odissi |
| 🎤 **Comedy & Stage** | Stand-up, theatre, poetry and spoken word, storytelling |
| 🍜 **Food & Drinks** | Food walks, pop-ups, café events, cooking classes, brunches |
| 🥾 **Outdoors & Travel** | Treks, day trips (Chilika, Puri, Konark, Daringbadi), camping, nature walks, birding |
| 🎲 **Games & Hangouts** | Board games, quiz nights, trivia, gaming, karaoke |
| 📚 **Learn & Grow** | Book clubs, talks, language exchange, photography, career/tech meetups |
| 💃 **Dance** | Salsa, Bollywood, hip-hop, Odissi classes |
| 🛍️ **Markets & Fests** | Flea markets, exhibitions, college fests, cultural festivals, melas |
| 🤝 **Social & Volunteering** | Cleanups, NGO drives, animal shelters, blood donation |
| 🧘 **Wellness** | Meditation, sound baths, mental-health circles |

**Filters across all categories:** Today / Tonight / This weekend / Date range · Free / Under ₹300 / Paid · Distance or area (Patia, Saheed Nagar, Jaydev Vihar, Old Town, Nayapalli, Khandagiri, Chandrasekharpur…) · Beginner-friendly · Women-only · Good for going solo · Indoor or outdoor · Recurring.

## 6. Features

Priority labels: **P0** = MVP (launch), **P1** = within about 2 months after launch, **P2** = later.

### 6.1 Attendee (user) side

**Discovery**
- **P0 Home feed**: "This weekend", "Happening today", "Because you like Running", "Popular in Patia", "New clubs". Card-based and image-first.
- **P0 Map view** (inspired by MigoMap):
  - Pins coloured and iconed by category, and they cluster when you zoom out.
  - Time chips sit on top: *Now · Today · Tonight · Weekend*.
  - A "Happening now" pin pulses.
  - A bottom sheet shows the list of events in the visible area, and you drag it up to switch from map to list.
  - Tapping a pin shows a mini card with the title, time, price, friends going and a Book button.
- **P0 Search**: events, clubs, venues and areas.
- **P0 Category pages** with filters.
- **P1 "Surprise me" / swipe mode**: swipe through weekend events Tinder-style. Swiping right saves the event. This is fun for young users and highly shareable.
- **P1 Calendar view**: your saved and booked events by date.
- **P2 AI recommendations** and natural-language search ("something chill on Saturday evening near Patia under ₹500").

**Event page**
- **P0** Poster or carousel, title, organizer (with follow button), date and time, venue with a map and a "Directions" link, price or tiers, description, what to bring, age or gender restrictions, refund policy.
- **P0** **"Who's going"**: attendee avatars, with **friends shown first** ("Ankit + 3 friends going").
- **P0** Save ❤️, Share (WhatsApp, Instagram Story, copy link), Add to calendar.
- **P1** Q&A / comment wall (Partiful style), and a post-event photo wall.
- **P1** Group chat for people attending, created per event (MigoMap style). It is opt-in and auto-archived 48 hours after the event.

**Booking & payment**
- **P0 Free events**: one-tap RSVP with an optional capacity limit and waitlist.
- **P0 Paid events**: choose tickets → pay by **UPI** (GPay / PhonePe / Paytm intent on Android, QR on desktop) or card/netbanking as a fallback → instant **QR ticket** in the "My Tickets" wallet.
- **P0** Ticket tiers (early bird, regular, group of 4), promo codes, capacity and waitlist.
- **P1** Cancellation and refunds according to the organizer's policy.
- **P1** Club memberships and passes, e.g. "Run Club monthly pass ₹499" for recurring sessions.
- **P2** Wallet credits and referral credits.

**Profile & social**
- **P0** Profile: name, photo, interests, area. Upcoming and past events are private by default, and you can choose to show them.
- **P0** Follow organizers and clubs, so their new events and posts appear in your feed and as notifications.
- **P1** Follow friends via phone contacts (opt-in) or username.
- **P1** **Badges / "City Passport"**: "First run", "5 events this month", "Explorer: 6 categories tried". Gamified, without being cringe.

### 6.2 Bringing friends along (key growth engine)

This is what turns a listings app into a social app. Ideas, roughly in priority order:

1. **P0 Smart share**: every event link opens a fast web page with a rich WhatsApp/Instagram preview (poster, date, price) and works **without installing the app**. Instagram Story share comes with a ready-made sticker card.
2. **P0 "Friends going"**: shown on cards, the map and the event page. This is the strongest social proof there is.
3. **P1 Squads (group plans)**:
   - Make a squad (e.g. "Weekend Gang").
   - Drop 2–3 event options and vote with a poll. The winner gets booked.
   - **Pay-your-own-share**: one person books 4 seats and each friend gets a UPI link to pay their share. Unpaid seats get released after a timer. Nobody has to chase friends for money.
4. **P1 "I'm interested, anyone?"**: mark interest and your followers or friends see it, "Riya is interested in Pottery Saturday".
5. **P1 Going solo mode**: tag yourself "going solo, happy to meet people". Organizers can run "solo-friendly" sessions. This is great for people new to the city.
6. **P1 Bring-a-friend offers**: organizers can set "2nd ticket 50% off" or "free entry if you bring a first-timer".
7. **P2 Referral credits**: invite a friend, and when they book, you both get ₹50.
8. **P2 Post-event memories**: a shared album and a "who you met" list, so you can follow people you met at the event.

### 6.3 Organizer / club side

- **P0 Organizer page** (the "Instagram profile" for clubs): logo, cover, bio, category, links, followers, upcoming events, past events grid, **posts/updates** (photos plus text), verified badge.
- **P0 Create event in under 2 minutes**: poster upload, details, location pin, tickets, capacity, recurring option (e.g. "every Sunday 6 AM").
- **P0 AI poster-to-event**: upload your Instagram poster and we auto-fill the title, date, time, venue and price for you to confirm. This removes the biggest barrier for organizers.
- **P0 Attendee list**, plus **QR check-in** from the organizer's phone.
- **P0 Payouts**: UPI or bank settlement, with a clear dashboard of sales, fees and payouts.
- **P0 Web dashboard** (organizers prefer a laptop for setup) plus core actions in the app.
- **P1 Broadcast to followers**: push notification and in-app message when a new event goes live (rate-limited so it doesn't become spam).
- **P1** Promo codes, early-bird pricing, group tickets, memberships and passes, waitlist.
- **P1 Analytics**: views → saves → bookings, where traffic came from, repeat attendees.
- **P1 Co-hosts / team members** (for college societies).
- **P2 Promoted listings / boosted pins** (self-serve, MigoMap style): this is a revenue stream.
- **P2** Collaborations (two clubs co-hosting), venue partner pages (cafés that host many events).

### 6.4 Trust, safety & quality

- Verified organizers (KYC is needed for payouts anyway).
- Report event or user, with human review.
- Women-only event filter and option, organizer ratings, and clear refund policies.
- Stale-event cleanup: no expired events in the feed, ever. This is a big complaint about competitors.
- Reviews and ratings after attendance (P1). Only people who checked in can review.

### 6.5 Internal admin (P0, simple)

- Approve organizers, feature events on the home screen, moderate reports, manage categories, refunds and disputes.

### 6.6 Social layer (from the chosen social-feed direction)

| Feature | Priority | Notes |
|---|---|---|
| Club post feed, with an event strip and Book/RSVP button under every post | **P0** | The core of the app. Posts come from the clubs you follow, plus suggested ones. |
| Like (incl. double-tap), Save, Send/Share | **P0** | Send uses WhatsApp/Instagram/link at first. In-app sending comes with squad chat. |
| Club stories (24h) with a Book sticker | **P0** | Every new event **auto-creates a story from its poster**, so clubs get stories without extra work. Clubs can also post their own. |
| Club profile: posts grid, upcoming events, highlights, follow | **P0** | The club's "Instagram page", already in 6.3 |
| Activity notifications (friends going, new events, reminders) | **P0** | Also drives retention (see section 12) |
| **User posts:** photo posts tagged to an event, club and friends, with an optional "Join me" button | **P0** | Gets users engaging, not just browsing. Friends can book the same event from the post. Automated image/text checks run before a post goes public, plus a report button. |
| **"Your plans" stories:** share an event you're going to (photo or event card) for 24h | **P0** | The easiest way for users to post. It's offered right after booking. |
| Squad chat: group chat with shared event cards, polls, pay-your-share | **P1** | Replaces the separate squad screen from 6.2 |
| Comments on posts/events | **P1** | Needs moderation tools and a report button |
| Moments (short vertical videos) | **P1** | Needs video upload, compression, storage and moderation, so it's the biggest cost item. Launch it once enough clubs are active. |
| Tagged attendee photos on club profiles, attendee albums on event pages | **P1** | User-generated content, so it needs moderation |
| 1:1 messages, attendee-made Moments | **P2** | Only if users ask for them |

**Watch-outs:** a feed only works if clubs post regularly. Keep posting effortless (poster import, auto-stories, scheduling). Moderate everything user-generated from day one.

## 7. Core user flows (for the prototype)

1. **First open** → choose interests (tap category chips) → allow location (optional) → home feed. *Phone OTP is only needed when you book or follow, so browsing works without signing up.*
2. **Discover → book**: Home → event card → event page → "Book" → ticket qty → UPI app opens → back → 🎉 QR ticket plus a "Share with friends" prompt.
3. **Map browse**: Map tab → "This weekend" chip → tap pin → mini card → event page.
4. **Squad plan**: Event → "Plan with friends" → choose squad / WhatsApp friends → they vote or join → each pays their share.
5. **Follow a club**: Club page → Follow → get new events in feed and as notifications.
6. **Organizer creates event**: Dashboard → "New event" → upload poster (AI fills details) → set tickets → publish → share link to Instagram bio / WhatsApp.

## 8. Experience & UI direction

**Principles:** simple, fresh, polished, fast.
- **Image-first**: posters and photos do the selling, just as on Instagram.
- **Thumb-friendly**: 5 labelled tabs at the bottom: **Home · Explore · Moments · Tickets · You**. The map sits inside Explore as a toggle. Activity (heart) and Messages/Squads (paper plane) are in the top bar. Organizers get a "Create" switch in their profile.
- **Booking in 3 taps max** for the common case.
- **No clutter**: no banner ads in the feed, and promoted items are clearly labelled.
- **Personality**: friendly copy ("Kya scene hai this weekend?" / a few Odia touches), playful micro-animations (confetti on booking, a pulsing "live now" pin).
- **Light and dark mode**, with a vibrant accent colour and soft rounded cards.
- **Fast on cheap Android phones and patchy 4G**: small images, skeleton loading, offline ticket access.

**Screens for the prototype (next step):**
1. Onboarding (interests + location)
2. Home feed
3. Map view (with bottom sheet)
4. Category / search results with filters
5. Event detail
6. Booking + UPI payment + success ticket
7. My Tickets wallet
8. Organizer / club page
9. Squad plan (poll + split pay)
10. Organizer: create event (with poster auto-fill) and a dashboard overview

## 9. Mobile app or website? → ✅ **Decided: mobile apps + a full web app** (see [DEV_PLAN.md](DEV_PLAN.md))

> Decision (21 Nov 2026): mobile apps (Android first, iOS soon after) plus a web app that covers browsing, event/club pages, booking with UPI and the organizer dashboard, for people who don't install. The analysis below is why.

| Option | Pros | Cons |
|---|---|---|
| Mobile app only | Push notifications, location and map, ticket wallet, feels premium | A shared link that forces an install kills conversions. Organizers hate creating events on a phone. |
| Website only (PWA) | No install, easy sharing, cheapest | Weak push notifications (especially iOS), feels less "real", weaker habit and retention |
| **App + light web (recommended)** | The app is for the habit (feed, map, notifications, friends). The web covers **shareable event and club pages** that open from WhatsApp/Instagram without installing, plus the **organizer dashboard**. | Slightly more scope, which we keep small by sharing one codebase |

**How to keep it to one codebase:** build with **React Native + Expo** (Android and iOS from one codebase, and Expo can also render web), or use a React Native app plus a small Next.js site for SEO-friendly event pages and the organizer dashboard. We'll finalise the stack before development.

**Rollout:** Android first (most of our audience), then iOS soon after (the same code, mainly a store-review effort). Web event pages are live from day one because that's how links spread.

## 10. Payments (UPI) & money flow

- Use a **payment gateway with marketplace/split settlement**, for example Razorpay Route, Cashfree Easy Split, or PhonePe PG, so attendee money goes to the organizer's account automatically and **we never hold organizers' money ourselves**. This keeps us out of complex licensing.
- UPI **intent flow** on Android (opens GPay/PhonePe directly) and UPI QR on desktop. Cards and netbanking are fallbacks.
- **Organizer KYC** (PAN + bank account) is handled by the gateway's onboarding before the first payout.
- Free events need no gateway at all, so organizers can start using the app before KYC.
- **To confirm with a CA before launch:** GST on our platform fee, whether e-commerce TCS rules apply to us, invoicing, and the refund/chargeback policy.

## 11. Business model

| Stream | When | Notes |
|---|---|---|
| **Free for free events** | Day 1 | Gets every club on board with no friction |
| **Booking fee on paid tickets** | Day 1 | ~3–5% per ticket, paid by the attendee or absorbed by the organizer (their choice). Keep it lower than District/BMS. |
| **Promoted events / boosted map pins** | ~Month 3+ | Self-serve, budget-based, clearly labelled |
| **Organizer Pro plan** | Later | Advanced analytics, memberships, custom branding, more broadcasts |
| **Brand & venue partnerships** | Later | Cafés and brands sponsoring categories ("Weekend Runs powered by X") |
| **Own curated events** | Optional | Signature community events that also market the app |

## 12. Go-to-market & marketing (Bhubaneswar launch)

### Phase 0: build the audience *before* the app (⏸️ postponed by decision on 21 Nov 2026; organizer sign-ups still go ahead)
- Launch an **Instagram page + WhatsApp Channel**: **"What's happening in BBSR this weekend"**. Post a weekly carousel or reel every Thursday evening.
- This validates demand, builds followers and gives us our first organizer relationships, all for free.
- We collect events manually by DMing organizers and asking permission to feature them. This becomes our seed data.

### Supply first: organizers (the chicken-and-egg problem)
- Sign **30–50 launch partners** before launch: run clubs, art studios, cafés that host events, comedy/open-mic collectives, trekking groups, and college clubs.
- Offer: **0% fee for the first 3 months**, a free verified page, a featured slot at launch, and we set up their first event for them.
- The **AI poster-to-event** feature plus a WhatsApp number where organizers can just forward a poster makes listing effortless.
- **Goal at launch: 100+ upcoming events visible, so the app never feels empty.**

### Demand: young people
- **Campus ambassadors** at KIIT, SOA (ITER), XIMB, IIT Bhubaneswar, NISER, CV Raman, Utkal University and others, with incentives tied to sign-ups and bookings.
- **Reels-first content**: "₹0 things to do in BBSR this weekend", "Joined a run club alone — here's what happened", event recap videos.
- **Micro-influencers** in the BBSR food, lifestyle and fitness space. Pay per event or in kind.
- **Signature launch event**: e.g. a launch-week "City Hop", a series of events across categories with a passport stamp at each. Complete 3 and you win something.
- **QR posters** at partner cafés, gyms and colleges: "Scan to see what's on this weekend."
- **Referral loop**: the squad and pay-your-share features naturally pull friends in.
- **Local PR**: Odisha news outlets and city pages love a local startup story.

### Retention
- **Thursday evening "Your weekend" push**: 3 personalised picks.
- New events from clubs you follow.
- "Friends going" notifications.
- Badges, streaks and the monthly "City Passport" recap (very shareable on Stories).

### Expansion later
Bhubaneswar → Cuttack + Puri (the twin city plus a weekend getaway) → other tier-2 cities (Vizag, Raipur, Ranchi, Guwahati…). Most of the playbook stays the same; each city needs its own organizer partners.

## 13. Success metrics

| Metric | 3-month target (BBSR) |
|---|---|
| Upcoming events listed at any time | 150+ |
| Active organizers (posted in the last 30 days) | 80+ |
| Monthly active users | 10,000 |
| RSVPs + bookings per month | 3,000+ |
| % of bookings that came from a share link | 30%+ (shows viral spread) |
| Organizer repeat-listing rate | 60%+ |
| Week-4 user retention | 25%+ |

These are rough starting targets, to be revisited after Phase 0.

## 14. Name options

We want something short, easy to say in English, Hindi and Odia, fun for young people, and able to grow beyond Bhubaneswar.

| Name | Meaning / vibe | Pros | Cons |
|---|---|---|---|
| **Nikl** | Hindi slang "nikal": *head out*. "Nikl this weekend?" | Punchy, youthful, works as a verb, pan-India | Hindi rather than Odia |
| **Jatra** | Odia *jatra*: folk theatre, festival, journey (as in Rath Jatra) | Deep local pride for the Odisha launch, and the meaning "journey" works everywhere | Can feel traditional or religious to some |
| **LoopIn** | "Be in the loop" | Clear meaning, English, works globally | Less distinctive, and similar names exist |
| **Scenee / KyaScene** | "Kya scene hai?", the classic Indian youth question | Very relatable, great for marketing copy | "SortMyScene" already exists in Indian ticketing, so there's a confusion risk |
| **Hopin** | Hop in / city hopping | Friendly, active | Similar to the existing "Hopin" (virtual events) |
| **Adda** | Hangout spot / chit-chat (Bengali/Hindi/Odia-friendly) | Warm and social | Generic, and many businesses use it |
| **Kahan** | "Where?", as in "Kahan chalein?" | Short, a natural question | Harder to brand |
| **Plaan** | "Plan" with a desi stretch | Obvious meaning, fun | Spelling confusion |

### ✅ Decision: **Nikl** (chosen 21 Nov 2026, confirmed again after considering "Khati")

> **Khati was considered and dropped.** The Odia word for a hangout is warm and local, but an existing "Khati" ride app creates trademark and Play Store risk, the word is also a community/caste name elsewhere in India, and it's harder to take beyond Odisha.

- **Tagline options:** *"What's happening in your city. Nikl."* · *"Stop scrolling. Start Nikl-ing."* · *"Plans? Nikl."*
- **Used as a verb in copy and marketing:** "Nikl this weekend?", "3 friends are Nikl-ing to Pottery Saturday", "Where are you Nikl-ing tonight?"
- **Launch series:** we can keep **Jatra** for our signature launch event series ("Nikl Jatra: City Hop"), which adds an Odisha touch.
- **Pronunciation:** "nikal". The app's splash screen and Instagram bio can say "Nikl (nikal): to head out" so nobody reads it as "nickel".

**Availability check:**
- [x] Quick web search (21 Nov 2026): no existing events, social or app brand called "Nikl" turned up in India or globally. The closest matches were unrelated (NICPL, Niki.ai, Klickn).
- [ ] Domain: try nikl.app, nikl.in, getnikl.com, nikl.city
- [ ] Instagram / X / YouTube handle: @nikl, @nikl.app, @niklbbsr
- [ ] Search the Play Store and App Store for "Nikl"
- [ ] IP India trademark search, classes 9 (software), 41 (events/entertainment), 42 (SaaS). File a trademark application once we're sure.

## 15. Phased roadmap

| Phase | Duration | Output |
|---|---|---|
| **0. Plan + audience** | Now → ~4–6 wks | This plan finalised, name and brand, Instagram/WhatsApp channel live, 30+ organizer partners signed |
| **1. Prototype** | ~1–2 wks | Clickable UI prototype of the 10 screens; test with 10–15 students and 5 organizers |
| **2. MVP build** | ~8–10 wks | All P0 features: club post feed + stories, explore (grid + map), categories, event page, RSVP + UPI booking, tickets, club profiles + follow, activity notifications, organizer dashboard, share pages |
| **3. Launch (BBSR)** | Launch month | Android (+ iOS shortly after), launch event, campus ambassadors |
| **4. Social layer** | +2 months | P1 features: squad chat with split pay, comments, Moments, memberships, badges, broadcasts, reviews |
| **5. Grow & monetise** | +3–6 months | Promoted pins, Pro plan, AI recommendations, Cuttack/Puri expansion |

## 16. Key risks & how we handle them

| Risk | Mitigation |
|---|---|
| **The app feels empty** (no events) | Phase 0 curation, 100+ events before launch, AI poster import, a WhatsApp forward-to-list option |
| **Organizers won't switch** from Instagram DMs and Google Forms | Free, faster than what they do now, automatic UPI payouts, we set it up for them, it works alongside Instagram (link in bio) |
| **Users won't install yet another app** | Web event pages work without an install, and the value (friends, tickets, weekend picks) drives the install later |
| **Low-quality or fake events, safety** | Verified organizers, reporting, reviews only after check-in, women-only options |
| **Payments and compliance** | Split-settlement gateway (we don't hold funds), CA review of GST/TCS |
| **Big players copy us** | Win on local depth, community, and small and recurring events that they ignore |

## 17. Decisions needed from you

1. ~~**App name**~~: ✅ **Nikl** (decided). Pending domain, handle and trademark checks.
2. ~~**Platform**~~: ✅ **Mobile apps (Android first, then iOS) + a full web app** for people who don't install: browse, event and club pages, booking with UPI, and the organizer dashboard. Details are in [DEV_PLAN.md](DEV_PLAN.md).
3. ~~**MVP scope**~~: ✅ P0 as in sections 6 and 6.6, **plus user posts** (see 6.6).
4. ~~**Team & budget**~~: ✅ Confirmed as fine. Roles and timeline are in [DEV_PLAN.md](DEV_PLAN.md).
5. ~~**Phase 0 channel**~~: ⏸️ **Later.** The "This weekend in BBSR" Instagram/WhatsApp channel is postponed. Organizer sign-ups (30–50 launch partners) still need to happen before launch.
7. ✅ **Explore opens on the map** by default, with a card rail along the bottom and a Map/Grid switch.
8. ✅ **UI polish rule:** calm and clean. Mostly white/black (with dark mode), one accent colour (Nikl pink), soft tints for artwork. Colour comes from real event photos and posters.
6. ~~**Brand feel & UX direction**~~: ✅ **Social feed version** (decided 21 Nov 2026), i.e. `prototype/nikl-social.html`. Nikl works like a familiar social app (club stories, a post feed, Moments, profile grids, squad chat), with booking built into every post. Its styling (white/black UI, Nikl pink accent, the pink→violet→sky story ring, bright event posters) is the base for the design system. The bold and minimal prototypes stay as references.

## 18. Prototype v1 (21 Nov 2026)

- File: `prototype/nikl-prototype.html` (open it in any browser). It's also published as a private page: https://claude.ai/artifact/MBWgDhiNQXSFx15YnBUwDC
- It covers all 10 screens from section 8: onboarding, home feed, map, search & filters, event page, booking with UPI, My Tickets, club page, squad plan with pay-your-own-share, and organizer tools (dashboard plus poster-to-event creation).
- It has a **style switch** with two looks: Bold & playful (the default) and Clean & minimal. The link ending in `#minimal` opens the minimal one directly.
- Everything in it is example data. Payments, sharing and notifications are simulated.

**Social version** (`prototype/nikl-social.html`, also published privately at https://claude.ai/artifact/UbPm4BPf2FcFVg8JyzELv9)
- Uses Instagram-style patterns with Nikl's own branding: a stories row from clubs (with a LIVE badge), square post cards with an event strip and a Book button under every post, double-tap to like, Save and Send.
- **Moments:** short, full-screen vertical event teasers with a Book bar.
- **Explore:** a mosaic grid with a map toggle.
- **Club profiles:** stats, highlights, and Posts / Upcoming / Tagged grids.
- **Squad chat:** a DM-style chat with shared event cards, a vote, and pay-your-share messages.
- **Your profile:** a memories grid and City Passport badges.
- 5 labelled tabs: Home, Explore, Moments, Tickets, You.

**Organizer mode** (in the same social prototype, added 21 Nov 2026)
- You reach it by **switching account** (tap `riya.nikls ▾` on your profile, or "You manage patia.pacers"), the same way people switch accounts on Instagram. Organizer mode has its own 5 tabs: **Home · Events · Create · Check-in · Payouts**.
- **Dashboard:** next event card (going, spots left, questions) with Check-in / Guest list, 7-day stats with a follower trend, quick actions, a to-do list, and upcoming events with sales bars.
- **New event from poster:** upload a poster (or use the sample) → it gets "read" → the form is filled with fields marked "From poster". Choose Free or Paid tickets, weekly repeat, and what happens on publish (post to feed, auto-story, push to followers). Publishing ends on a "Your event is live" screen with a share link, a feed preview and "See it as attendees do".
- **Post / story as the club:** reuses the user composer, posting as `patia.pacers`. Every club post and story gets a Book button.
- **Manage event:** views, saves, sold, revenue, a ticket tier table, actions (edit, guest list, check-in, message, duplicate, cancel) and a guest preview.
- **Guest list:** search, filters (checked in, not yet, solo, first-timers), manual check-in. No phone numbers are shown.
- **Check-in scanner:** camera frame with simulated valid, repeat and wrong-event scans, entry by code (try `NKL-R5K2`, Riya's own ticket), a live count and recent scans.
- **Notify followers:** pick an audience (all, past attendees, members), link an event, write the message and see a live push preview. Limited to 2 a week.
- **Payouts:** next payout, a November ledger (sales + memberships − refunds = earnings) and payout history with UTRs. KYC is verified, and Nikl never holds the money.
- **Next:** test it with 10–15 students and 5 organizers, collect feedback, then revise.
