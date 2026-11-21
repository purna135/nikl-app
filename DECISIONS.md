# Nikl: Decision Log

> Every product, design, technical and business decision so far: what we chose, why, what else we considered, and when to look at it again.
> Companion to [PLAN.md](PLAN.md) (product) and [DEV_PLAN.md](DEV_PLAN.md) (engineering). Last updated: **21 Nov 2026**.

**How to use this file**
- Each decision has an ID: **P** product · **D** design · **T** tech · **S** data, privacy & security · **B** business & payments · **G** go-to-market.
- **Changing a decision:** don't delete the old row. Move it to [Replaced or rejected](#replaced-or-rejected) with the reason, add the new decision, and add a line to [Change history](#change-history).
- **Status:** ✅ decided · 🔁 decided, but revisit soon · ❓ open (see [Open questions](#open-questions)).

---

## Product (P)

| ID | Decision | Why, and what else we considered | Revisit when |
|---|---|---|---|
| P1 ✅ | Launch in **Bhubaneswar** for **18–30-year-olds**, **Android first**. | Lots of events in the city but no single place to find them. Most of the audience uses Android. | After ~3 months live, before expanding to Cuttack and Puri. |
| P2 ✅ | Positioning: **"Instagram for what's happening in your city"**. Every small and medium event, club and activity in one place. | District/BookMyShow chase big ticketed shows. Instagram has the audience but no booking, map or calendar. | If a big player moves into small local events. |
| P3 🔁 | Name: **Nikl** ("nikal", to head out). | Short, youthful, works across India; a quick web search found no clashing app or brand. Considered: Jatra, LoopIn, Scenee, Hopin, Adda, Kahan, Plaan, **Khati** (dropped: an existing "Khati" ride app, a community/caste name elsewhere in India, harder to take beyond Odisha). | **Before spending on branding:** domain, social handles, Play Store and IP India trademark checks are still to do. |
| P4 ✅ | Product direction: the **social-feed app** (`prototype/nikl-social.html`). | Familiar to 18–25s, and stories plus Moments bring them back. The bold & playful and clean & minimal prototypes are kept as references. | After testing the prototype with 10–15 students and 5 organizers. |
| P5 ✅ | **Booking is built into every post, story, Moment and map pin.** Booking takes at most 3 taps. | This is the main difference from Instagram: you can act on what you see. | – |
| P6 ✅ | **Users can post** at launch: photo posts tagged to an event, club and friends (with an optional "Join me" button), and **"Your plans"** stories. | More engagement than browse-only, and friends' posts drive bookings. Needs moderation from day one (S6). | If moderation load is too high or post quality is poor. |
| P7 ✅ | Users can only **tag an event they booked or RSVP'd**. | Stops spam on event pages. | – |
| P8 ✅ | **Organizer mode lives in the same app**, reached by switching account (like Instagram). The full organizer dashboard is also on the web. | Organizers are often attendees too. Heavy setup is easier on a laptop. | After organizer interviews. |
| P9 ✅ | Every new event **automatically creates a club story** from its poster, rendered from data (not a stored image). | Clubs get stories without extra work, and price and spots left are always current. | – |
| P10 ✅ | Organizers can **push to followers at most 2 times a week**. | Stops followers from muting clubs. | After launch, using mute/unfollow rates. |
| P11 ✅ | Accounts are **18+ at launch**. | Avoids the DPDP Act's verifiable-parental-consent rules for minors. | When we build a proper under-18 consent flow. |
| P12 ✅ | **Priorities.** **P0 (launch):** feed, club + "Your plans" stories, user posts, Explore (map), event page, booking + UPI, tickets, club profiles, activity, organizer tools. **P1 (~2 months after):** squad chat with pay-your-own-share, comments, **Moments** (video), memberships, reviews. **P2:** 1:1 messages, attendee-made Moments. | Keeps launch at ~12 weeks. Video is the biggest cost item. | After launch metrics. |
| P13 ✅ | The group feature is called **"Squads"**. | "Khati" was suggested for it and dropped along with the name. | – |
| P15 🔁 | **Anyone can create a club page, but it stays hidden until a Nikl admin approves it** (founder's decision, 21 Nov 2026). Until approval, the club, its events, posts and stories are visible only to its own team and Nikl admins. Organizers can still prepare and "publish" events, which go live the moment the club is approved. Approval is separate from the **verified** badge, which needs KYC. | Keeps beta quality high and blocks fake pages, without making organizers wait to set things up. Considered: live instantly; invite-only. | After the beta: consider auto-approving clubs that pass KYC. |
| P16 🔁 | **After the first login, people set up a profile before anything else:** name, username, area, at least 3 interests and **birth year** (18+ check, P11). Birth year is private. | Interests power the feed; the 18+ rule needs an age. Birth year alone means someone turning 18 later this year passes a few months early. | If we need exact age checks (e.g. for 18+ events): ask for full date of birth. |
| P14 ✅ | **Pay-your-own-share** (P1): a squad holds seats for 2 hours and each member pays their own share through a payment link. Nikl never pools money. | Nobody chases friends for money, and no money is held by Nikl. | When building squads (P1). |

## Experience & design (D)

| ID | Decision | Why, and what else we considered | Revisit when |
|---|---|---|---|
| D1 ✅ | **Calm, clean look:** mostly white/black (with dark mode), **one accent** (Nikl pink `#D81B60`, `#E91E63` in dark mode), soft tints only for placeholders, avatars and tags. Colour comes from real posters and photos. | You asked for less colour, simple and clean. Bold & playful was tried first, clean & minimal second. | After user testing. |
| D2 🔁 | **Type:** Inter (text), Inter Tight (headings), Bricolage Grotesque (wordmark only), JetBrains Mono (ticket codes). The mobile app uses the system font for now. | Readable, neutral, good number shapes. | At design sign-off: load the fonts in the mobile app. |
| D3 ✅ | **Navigation:** 5 labelled tabs, **Home · Explore · Moments · Tickets · You**. Launch has 4 (Moments arrives in P1). Activity (heart) and Messages/Squads sit in the top bar. **Organizer tabs:** Home · Events · Create · Check-in · Payouts. | Text labels make it easier than Instagram's icon-only tabs. | After user testing. |
| D4 ✅ | **Explore opens on the map** by default, with a row of event cards and a Map/Grid switch. | Your decision: "what's near me" is the key question. | After launch analytics. |
| D5 ✅ | Every tappable thing is at least **44 px**, and screens must be readable on cheap Android phones in sunlight, with Odia/Hindi text rendering correctly. | Our audience's phones. | During QA (week 10). |
| D6 ✅ | Copy is plain and friendly. **English first**, Odia and Hindi later. | Fastest path to launch. | After launch. |
| D7 ✅ | **Explore filters:** Any time · Happening now · Today · Tonight (from 5 PM) · This weekend · Next 7 days, plus Free and the 12 categories, and a search box (event, club, venue, area). All times are India time. **Map pins** show the category emoji; events at the same venue fan out so each can be tapped; events without a pin still appear in the list. Hovering a list card only highlights its pin (the map moves only when you tap a pin). | Matches the prototype; keeps the map calm. | After launch analytics (which filters get used). |
| D8 🔁 | **Organizers set the venue pin by tapping a map** (optional, India only), on the new-event form or later on the manage-event page. Moving a pin gives that event its own copy of the venue, so a venue shared with other events never moves. | Works today with only Mapbox. Google Places venue search (T7) needs a paid Google key. | When the Google Places key exists (NEXT_STEPS §3): add venue search on top of the pin. |

## Platform & tech (T)

| ID | Decision | Why, and what else we considered | Revisit when |
|---|---|---|---|
| T1 ✅ | **Mobile apps (Android first, iOS 2–4 weeks later) + a full web app** (browse, event/club pages, UPI booking, organizer dashboard). | Shared links must work without installing. Organizers prefer laptops. The app builds the habit (push, tickets, map). Considered: app only, web only (PWA). | – |
| T2 ✅ | **React Native + Expo** (SDK 58, Expo Router, native tabs). | One TypeScript codebase for Android + iOS, over-the-air fixes. Considered: Flutter (no code sharing with the web). | – |
| T3 ✅ | **Next.js 16.4** with Cache Components, hosted on **Vercel**. | Fast server-rendered pages for WhatsApp links and Google. Considered: Remix, Astro. | – |
| T4 ✅ | **Monorepo: Turborepo + pnpm 12** (isolated installs). Shared packages are TypeScript source: `tokens`, `utils`, `validation`, `supabase`. | Web and mobile share rules, so they can't drift apart. DEV_PLAN listed 5 packages; `types` and `api-client` were folded into `supabase` and `utils` for now. Considered: Nx. | If the packages grow large. |
| T5 ✅ | **Backend: Supabase** (Postgres + PostGIS, Auth, Storage, Realtime) in the **Mumbai** region. Money logic runs in server functions. | A small team gets database, auth, storage and realtime on day one. Considered: a custom NestJS API on AWS (+3–4 weeks of setup). It's plain Postgres, so we can move later. | If scale or compliance needs it. |
| T6 ✅ | **Phone OTP login only** (no passwords, no email). SMS via **MSG91**, **Gupshup** as fallback (also offers WhatsApp OTP). Local development uses test numbers. | Matches how people in India sign up. Phone-only means "Sign in with Apple" isn't required. | If OTP costs or delivery become a problem. |
| T7 ✅ | **Maps: Mapbox** for the map, **Google Places** only for organizers' venue search. | Calm custom map style, generous free tier; Google has the best Indian place data. Considered: Ola Maps (cheaper), Google Maps for everything. | If map costs grow. |
| T8 ✅ | **AI:** Claude Haiku reads posters and checks text, Claude Sonnet handles hard posters. The organizer always confirms. **Images:** AWS Rekognition. | Cheap and fast for most posters. Considered: Google Document AI; Google Vision or Hive for images. | After measuring accuracy on real posters. |
| T9 ✅ | **Other services:** Expo Notifications (push), Postgres full-text search + `pg_trgm`, PostHog (analytics + feature flags), Sentry (crashes), Supabase Realtime for squad chat (P1). | Fewest extra services for one city. Considered: Typesense/Meilisearch, Stream Chat, OneSignal. | When expanding to more cities. |
| T10 🔁 | **Web session is read in the browser** for week 1. | Next 16 Cache Components needs server-side session reads inside `<Suspense>`. Kept simple for the shell. | **Week 2**, when the organizer dashboard needs server-side checks. |
| T11 🔁 | **Mobile stores the login session with `expo-sqlite` localStorage**, as Expo's Supabase guide recommends. | Official, simple. Considered: SecureStore (encrypted). | **Before launch:** consider moving the refresh token to SecureStore. |
| T12 ✅ | The public Supabase key uses the new **"publishable key"** naming (`*_SUPABASE_PUBLISHABLE_KEY`). | Supabase's current naming. | – |
| T13 🔁 | **Database types are a placeholder** until the local database runs. | Needs Docker to generate them. | **Week 2:** run `pnpm db:types`. |
| T14 🔁 | **Supabase CLI stays on 2.x** (3.x is out). | 2.x works. Upgrading is better done with a running database to test against. | Once the local database runs. |
| T15 ✅ | **Feed ranking v1 is simple rules**, no machine learning (DEV_PLAN §5.6). | Enough for one city; weights tunable remotely. | After 4 weeks of real data. |
| T16 ✅ | **Check-in QR codes are signed tokens**, so scanning works offline. | Venues often have poor signal. | – |
| T17 ✅ | **Shared links are real web URLs** (e.g. `nikl.app/e/open-mic-14`). They open the app if it's installed, otherwise the web page. | No extra service needed. Considered: Branch.io (paid). | If we need install attribution. |
| T18 ✅ | **Day-to-day development runs Supabase locally in Docker** (analytics services switched off to save memory). The hosted **`nikl-dev`** project (ref `ypnbsmlvcrbzqpomqlwd`) is for shared and real-phone testing. | Local is free, works offline, has test login numbers and can be reset anytime. | When a second developer joins. |
| T23 🔁 | **AI poster reading is on hold** (founder, 21 Nov 2026). The "Fill in details from poster" button is hidden unless `NEXT_PUBLIC_POSTER_AI_ENABLED=true`. The `extract-event` function stays deployed and answers "not configured" until a key is stored. | No Anthropic spend yet; organizers type details by hand. | When the founder stores the Anthropic key (NEXT_STEPS 1.6): flip the flag and test on real posters. |
| T24 ✅ | **Public pages (home, Explore, event pages, club pages) are cached and shared by everyone**, refreshed within about a minute, and **immediately** when an organizer or Nikl admin changes an event or club (cache tags `events` / `clubs`). They read with the publishable key only, so database rules decide what's public. | Shared WhatsApp links open instantly; the database isn't hit on every view. Considered: rendering every request (slower, costlier). | If we need personalised public pages (e.g. "friends going"): load that part separately. |
| T25 🔁 | **The mobile Explore tab is a list for now** (search, the same filters, event screen with "Open in Maps"); the map comes next. | The best map library needs a decision (see open questions). Expo Go can't run Mapbox's native map. | When the mobile map library is chosen. |
| T19 ✅ | **Schema changes reach hosted projects only through versioned migrations** (`supabase db push`), after the founder links the project with their own Supabase login and database password. Secret keys are never shared in chat. | One source of truth for the database; no manual edits; no secrets passed around. | – |
| T20 ✅ | **Work is committed in small commits on `main` as it's done** (founder's go-ahead, 21 Nov 2026) and pushed to GitHub. LF line endings everywhere (`.gitattributes`). | Simple while one person builds. | When a second developer joins: switch to branches + pull requests. |
| T22 ✅ | **Every chunk of work gets an independent code review before it's committed**, and the findings are fixed first (founder's rule, 21 Nov 2026). Order: build → typecheck, lint, tests → independent review → fix → re-check → commit and push. | Catches bugs and security slips a single pass misses, especially with a public repo. | When a second developer joins: reviews move into pull requests. |
| T21 🔁 | **Code lives at [github.com/purna135/nikl-app](https://github.com/purna135/nikl-app), public for now** (founder's choice). No keys or passwords are in the repo, but the plans, decisions and prototypes are readable by anyone. | Free CI and easy sharing. Considered: private repo, a GitHub organization. | **Before sharing sensitive business details, and before launch:** make it private and consider moving it to an organization. |

## Data, privacy & security (S)

| ID | Decision | Why | Revisit when |
|---|---|---|---|
| S1 ✅ | **Money is integer paise** (`19900` = ₹199), never decimals. | No rounding errors. | – |
| S2 ✅ | **Times are stored in UTC and shown in IST**, whatever the phone's timezone. | One source of truth; correct for every user. | When expanding outside India. |
| S3 ✅ | **Phone numbers are stored as `+91XXXXXXXXXX`.** Supabase Auth keeps them without the `+`, so the signup trigger adds it, and a database check rejects any other format in `profiles_private`. | One format everywhere. | – |
| S4 ✅ | **Phone number and year of birth live in an owner-only `profiles_private` table.** The public `profiles` table has no phone. **Razorpay account details** live in an admin-only `club_payout_settings` table. | Profiles are publicly readable, so a phone column there would expose every user's number. | – |
| S5 ✅ | **The apps can't write bookings, payments, refunds, payouts, tickets, the waitlist or the audit log.** Only server functions can. Row-level security is on all 30 tables. Column rules stop the apps changing seats taken, tickets sold, verified status, KYC status, ratings or moderation status. | Money and seats must change only in one trusted place. Tested: a signed-in user is blocked from all of these. | – |
| S6 ✅ | **User posts start as "pending"** and go through automated checks. Report and block exist from day one. | Safety; also an App Store requirement for apps with user posts. | When moderation volume grows. |
| S7 ✅ | **Data stays in India** (Mumbai region). Card/UPI details never touch our servers. | DPDP Act; Razorpay checkout handles payment data. | – |
| S8 ✅ | **Organizers never see attendees' phone numbers.** | Privacy; organizers message attendees through the app. | – |
| S10 ✅ | **AI features need a verified login and have a daily limit per person** (poster reading: 30 a day, changeable with `POSTER_AI_DAILY_LIMIT`). The count is kept server-side, so apps can't raise it. | Claude calls cost money; a public endpoint could be abused. | When usage data shows a better limit. |
| S12 ✅ | **The Mapbox token in the apps is a public `pk.` token**, which is meant to be visible in web pages. The founder restricts it to Nikl's web addresses in the Mapbox dashboard. Secret `sk.` tokens never go in the apps or the repo. If the token is rejected, the map shows a short message and the list still works. | Standard Mapbox setup; restricting stops other sites using our quota. | When the domain is bought: add it to the token's allowed URLs. |
| S11 ✅ | **Posters must be uploads in Nikl's own storage** (each person's own folder). Event pages never show images from other websites. | Stops tracking pixels and unmoderated images. | When we add image moderation (week 5). |
| S9 ✅ | **Secrets never go in `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` variables or in git.** `.env` files are ignored by git. | Anything public is visible to everyone. | – |

## Business & payments (B)

| ID | Decision | Why, and what else we considered | Revisit when |
|---|---|---|---|
| B1 ✅ | **Listing free events is free.** | Gets every club on board with no friction. | – |
| B2 🔁 | **Paid tickets: 4% booking fee, paid by the attendee** by default (organizers can choose to absorb it). Organizers receive the full ticket price. | Below District/BookMyShow. PLAN suggested 3–5%. | After the closed beta. |
| B3 ✅ | **Launch partners:** 0% fee for their first 3 months, a free verified page and a featured slot at launch. | Supply first: the app must open with 100+ events. | – |
| B4 ✅ | **Payments: Razorpay Route** (split settlements). Cashfree is the second quote. **Nikl never holds organizers' money.** UPI intent on Android, UPI QR on desktop web, no UPI "collect" requests. | Keeps us out of complex licensing. NPCI is phasing out collect requests. | If Cashfree quotes much lower fees. |
| B5 ✅ | **Later revenue:** promoted listings / boosted map pins (from ~month 3), an organizer Pro plan, brand partnerships. | Don't charge before there's value. | Month 3. |
| B6 ✅ | **Memberships** (e.g. a club's monthly pass) renew by **UPI AutoPay** (P1). | Recurring clubs like run clubs need it. | When building memberships. |

## Go-to-market (G)

| ID | Decision | Why | Revisit when |
|---|---|---|---|
| G1 🔁 | The **"This weekend in BBSR" Instagram/WhatsApp channel is postponed.** | Your decision. | About 6 weeks before launch. |
| G2 ✅ | **Sign 30–50 organizers before launch**, so the app opens with 100+ upcoming events. | An empty app kills retention. | – |
| G3 ✅ | **Launch tactics:** campus ambassadors, Reels, micro-influencers, a launch event series, QR posters at cafés and colleges (PLAN §12). | Where 18–30s in Bhubaneswar are. | 2 months before launch. |
| G4 ✅ | **Expansion order:** Bhubaneswar → Cuttack + Puri → other tier-2 cities. | Same region first; each city needs its own organizers. | After 3 months in Bhubaneswar. |

---

## Open questions

| Question | Options | Decide by |
|---|---|---|
| **Payout timing** | The prototype shows weekly payouts every Tuesday. DEV_PLAN §5.1 holds each event's money until the event ends + 24h, which makes refunds for cancelled events easy. | Before week 7 (payouts). |
| **Booking fee level and who pays by default** | 3–5%, attendee or organizer by default. | After the closed beta. |
| **Company structure** | Private Limited or LLP. Needed for Razorpay Route, the Google Play organisation account, SMS (DLT) registration and GST invoices. | **Now:** it has the longest lead time. |
| **Nikl trademark, domain and handles** | `nikl.app`, `nikl.in`, `getnikl.com`; `@nikl` handles; IP India classes 9, 41, 42. | Before branding spend. |
| **When Moments launches** | P1 as planned, or later if video costs or moderation are too heavy. | After launch. |
| **Under-18 users** | Stay 18+, or build a parental-consent flow. | After launch. |
| **Who builds** | A hired team as in DEV_PLAN §7, or mostly Claude with a smaller team. | Before week 2. |
| Open technical questions | See DEV_PLAN §10. | Week 2. |
| **Mobile map library** | **(a) `@rnmapbox/maps`**: same Mapbox style as the web, best performance, but needs our own development build (EAS), so no more Expo Go. **(b) `react-native-maps`**: works in Expo Go, Google map on Android / Apple map on iOS, so it looks different from the web. **(c) Mapbox GL inside a WebView**: same look, works in Expo Go, slower on cheap phones. Claude recommends **(a)**: we'll need our own build before launch anyway (push notifications, UPI apps). | Before week 4 ends. |
| **Explore and repeating events** | Filters only look at each event's *next* date, so a weekly event whose next date is today doesn't show under "This weekend" even if it also runs Saturday. Fix: let the database pick the next date inside the chosen window. | When weekly events become common in the beta. |
| **Email sign-up on hosted projects** | Supabase turns email login on by default; Nikl is phone-only (T6). Switch it off when phone login is enabled there. | When MSG91 is ready. |

## Replaced or rejected

| Earlier decision or idea | What happened | Why |
|---|---|---|
| Name candidates (Jatra, LoopIn, Scenee, Hopin, Adda, Kahan, Plaan) | Replaced by **Nikl** (P3). | Nikl was short, youthful and pan-India. |
| **Khati** as the app name | Rejected (P3). | Existing Khati app, community/caste meaning elsewhere, harder outside Odisha. |
| **Khati** as the name for squads | Rejected; stays "Squads" (P13). | You chose to leave Khati entirely. |
| **Bold & playful** style (first prototype) | Replaced by the calm look (D1). | You compared styles and chose the social direction with less colour. |
| **Clean & minimal** as its own direction | Folded into the social direction's calm look (D1). | – |
| 4-tab navigation **Home · Map · Tickets · Profile** (PLAN v1) | Replaced by D3. | The social direction needs Explore and Moments. |
| **Map as its own tab** | Moved inside Explore as the default view (D4). | One place for discovery. |
| "Mobile app first + lightweight web pages" | Replaced by **mobile + full web app** (T1). | People without the app must be able to book too. |
| Phase 0 channel "start now" | Postponed (G1). | Your decision. |
| "Your plans" stories as P1 | Moved to P0 with user posts (P6). | You wanted users to post so they engage more. |
| Separate squad screen | Replaced by **squad chat** (P1). | Feels like the messaging people already use. |

## Change history

- **21 Nov 2026 (week 3):** Added D7 (Explore filters and map pins), D8 (organizers tap a map to set the venue pin), T23 (AI poster reading on hold), T24 (cached public pages with instant refresh), T25 (mobile Explore is a list for now), S12 (public Mapbox token, restricted by URL). New open questions: mobile map library, repeating events in Explore filters. T7 in practice: Mapbox is in; Google Places waits for a Google key (D8).
- **21 Nov 2026:** Added T22 (independent review before every commit), P16 (profile set-up after first login), S10 (verified login + daily limit for AI), S11 (posters only from our storage). T8 in practice: poster reading uses Claude Haiku 5.5 by default, switchable with `POSTER_AI_MODEL`.
- **21 Nov 2026:** Decided P15 (anyone can create a club page; hidden until Nikl approves). Removed it from open questions.
- **21 Nov 2026:** Added T21 (GitHub repo `purna135/nikl-app`, public for now).
- **21 Nov 2026:** S3 now enforced in the database (migration `20261121010000_phone_e164`). Added the open question about who can create club pages during the beta.
- **21 Nov 2026:** Added T18–T20 (local Supabase in Docker, migrations-only changes to hosted projects, commit-as-you-go). Added the open question about email sign-up on hosted projects.
- **21 Nov 2026:** Log created with every decision from planning, the three prototypes, organizer mode and week-1 setup.
