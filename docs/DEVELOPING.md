# Developing Nikl

> For a developer joining the project. Matches the code at the end of **week 6 (28 Nov 2026)**.
> What the product does, in plain words: [FEATURES.md](FEATURES.md). Why things are the way they are: [DECISIONS.md](../DECISIONS.md) (IDs like `T24` below point there).

## 1. Quick start

Setup steps live in [README.md](../README.md#setup), so they aren't repeated here. In short: Node 20+ (24 recommended), Docker Desktop, `corepack enable`, `pnpm install`, `pnpm db:start`, then copy the values you need from [`.env.example`](../.env.example) into `apps/web/.env.local` and `apps/mobile/.env`.

**Read these two files before writing code.** Both frameworks are newer than most tutorials:

- [`apps/web/AGENTS.md`](../apps/web/AGENTS.md): this is Next.js 16 with Cache Components. APIs differ from older versions; read the matching guide in `apps/web/node_modules/next/dist/docs/` first.
- [`apps/mobile/AGENTS.md`](../apps/mobile/AGENTS.md): Expo SDK 58. Check the versioned Expo docs, and add packages with `npx expo install`.

### Most-used commands (from the repo root)

| Command | What it does |
|---|---|
| `pnpm dev:web` | Website at http://localhost:3000 |
| `pnpm dev:mobile` | Expo dev server for Nikl's development build (has the map) |
| `pnpm dev:mobile:go` | Same, for Expo Go (no native map: Explore shows the list) |
| `pnpm db:start` / `pnpm db:stop` | Start / stop local Supabase in Docker. Start applies migrations and `seed.sql`. |
| `pnpm db:reset` | Rebuild the local database from migrations and seed |
| `pnpm db:types` | Regenerate `packages/supabase/src/database.types.ts` from the local database |
| `pnpm db:test` | pgTAP database tests in `supabase/tests` |
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Every workspace, through Turborepo |
| `pnpm build` | Production build of the website |
| `pnpm exec supabase functions serve --env-file supabase/functions/.env` | Run Edge Functions locally (needed for paying; see "Testing payments locally") |

Supabase Studio (table viewer and SQL editor) runs at http://127.0.0.1:54323 while the database is up.

### Environment variables (names only; never commit values)

| File (git-ignored) | Variables |
|---|---|
| `apps/web/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN` (public `pk.` token), `NEXT_PUBLIC_POSTER_AI_ENABLED` |
| `apps/mobile/.env` | `EXPO_PUBLIC_SUPABASE_URL` (on a phone, your PC's LAN IP), `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_MAPBOX_TOKEN`, `EXPO_PUBLIC_SITE_URL` (leave empty until the domain is live), `EXPO_PUBLIC_WEB_URL` (the website that hosts the pay page; locally `http://<PC's LAN IP>:3000`) |
| `supabase/functions/.env` | `ANTHROPIC_API_KEY`, or `POSTER_AI_MOCK=true` for sample answers; optional `POSTER_AI_MODEL`, `POSTER_AI_DAILY_LIMIT`. Payments: `PAYMENTS_MODE` (`mock` locally; unset = off), and for `razorpay` mode `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (on hosted projects these are Supabase secrets) |

Missing values (or the `replace-with-…` placeholders) count as "not connected": public pages and app screens show an empty state, and the login screens say which file to fill in.

### Test logins and admin rights (local only)

- Test numbers come from `supabase/config.toml` (`[auth.sms.test_otp]`): **98765 43210** or **99999 99999**, code **123456**. No SMS is sent. Use both to test following, friends-only posts and "Your plans" from two sides.
- `seed.sql` creates no users and no Nikl admins. To reach `/admin/clubs` and `/admin/moderation`, log in once, then run this in Studio's SQL editor (Auth stores phones without the `+`). Repeat after every `pnpm db:reset`:

```sql
insert into public.platform_admins (user_id)
select id from auth.users where phone = '919876543210';
```

- The review switch (`app_settings.moderation_mode`) starts as `review` after every reset, so people's photo posts wait in `/admin/moderation` until you approve them.

## 2. Repo map

```
apps/web/            Next.js 16 website, organizer dashboard and Nikl admin
apps/mobile/         Expo SDK 58 app (Expo Router), Android first
packages/tokens/     Colours, type, spacing; one accent (Nikl pink)
packages/utils/      Money, IST dates, phones, categories and areas, Explore time windows, map, story-viewer and booking helpers (+ Vitest)
packages/validation/ Zod schemas for forms (+ Vitest)
packages/supabase/   Client factory, phone-OTP helpers, generated database types
supabase/            config.toml, migrations/, tests/, functions/, seed.sql
prototype/           Clickable HTML prototypes (nikl-social.html is the chosen direction)
docs/                FEATURES.md and DEVELOPING.md (these guides)
.github/workflows/   ci.yml
PLAN.md  DEV_PLAN.md  DECISIONS.md  NEXT_STEPS.md  README.md
```

Shared packages ship TypeScript source with no build step. The web app compiles them (`transpilePackages` in `next.config.ts`); Metro does it for the app. Keep them free of React, Next and Expo imports.

### `apps/web`

`next.config.ts` turns on `cacheComponents` and `partialPrefetching`. `src/proxy.ts` is Next 16's renamed middleware: it only refreshes the Supabase session cookie on `/organizer`, `/admin` and `/account` (and everything under them), `/tickets` and `/e/<slug>/book`. It is not an auth gate; pages check the user themselves.

| Route | Files in `src/app/` | Notes |
|---|---|---|
| `/` | `page.tsx` | Weekend picks (cached) and category tiles |
| `/explore` | `explore/page.tsx`, `explore-view.tsx` | Server passes cached rows; the client filters, searches and switches Map/Grid |
| `/e/[slug]` | `e/[slug]/page.tsx` | Cached event; `generateStaticParams` prerenders up to 20; Open Graph metadata; Book / RSVP link |
| `/e/[slug]/book` | `e/[slug]/book/page.tsx`, `book-form.tsx` | `requireUser`; no username or birth year → `/account/setup?next=…`. Client form: date chips, ± per tier, promo, live price (`quote_booking`, debounced), then `hold_booking` with a fresh idempotency key → `/tickets?booked=1` (free) or `/pay/<token>` |
| `/pay/[token]` | `pay/[token]/page.tsx`, `pay-view.tsx` | No login (P25). Reads `booking_for_payment`, calls the `payments` function (`start`, then Razorpay Checkout + `verify`, or the mock buttons + `mock_pay`). `?return=` accepts only `nikl://` / `exp(s)://` links (back to the app) |
| `/tickets` | `tickets/page.tsx` | `my_bookings`: waiting for payment, upcoming with codes, past |
| `/c/[handle]` | `c/[handle]/page.tsx` | Cached club, its upcoming events and approved posts |
| `/login` | `login/login-form.tsx` | Phone OTP in the browser; `?next=` only accepts same-site paths |
| `/account` | `account/account-view.tsx` | Still reads the session in the browser (T10); links to Tickets and profile set-up |
| `/account/setup` | `account/setup/page.tsx`, `setup-form.tsx` | Web profile set-up: `profileSetupSchema`, then `complete_profile`; `?next=` same-site paths only |
| `/organizer` | `organizer/page.tsx`, `create-club-form.tsx` | Dashboard: club status, events, live stories, posts; admin banners (club reviews, moderation queue count) |
| `/organizer/events/new` | `organizer/events/new/event-form.tsx` | New event (poster, dates, repeats, venue pin, tickets) |
| `/organizer/events/[id]` | `page.tsx`, `edit-event-form.tsx`, `event-pin-form.tsx`, `promo-form.tsx` | Manage one event; Promo codes panel for owners and admins |
| `/organizer/posts/new` | `organizer/posts/new/post-form.tsx` | New club post |
| `/organizer/stories/new` | `organizer/stories/new/page.tsx`, `story-form.tsx` | New club story: photo to `post-media`, optional event (club's upcoming published events) |
| `/admin/clubs` | `admin/clubs/page.tsx`, `review-club-form.tsx` | Nikl admin review queue for club pages |
| `/admin/moderation` | `admin/moderation/page.tsx`, `moderate-form.tsx` | Review switch, posts and stories to check (with photos), reports about people, clubs and events |

Both admin pages share a small nav ("Club pages" · "Moderation").

Key modules:

- **`src/lib/public-data.ts`**: server-only, cached public reads with the publishable key and **no cookies**, so the result is the same for everyone. `getUpcomingEvents` (`explore_events`), `getWeekendPicks`, `getEventBySlug`, `getClubByHandle`, plus the prerender lists. Each uses `"use cache"`, `cacheLife("minutes")` and `cacheTag(...)` with the tags `events`, `clubs`, `posts`, `event:<slug>` and `club:<handle>`. Time checks happen inside the cached function, so pages don't read the clock while prerendering.
- **`src/lib/auth.ts`**: `getCurrentUser()` (calls `connection()`, verifies with `auth.getUser()`; call it inside `<Suspense>`), `requireUser(returnTo)` (redirects to `/login?next=…`), `isPlatformAdmin()`.
- **`src/lib/supabase/server.ts`** (cookie-based client for Server Components and actions) and **`client.ts`** (browser client; `null` when env values are missing).
- **`src/app/organizer/actions.ts`**: server actions. `createClubAction` → `create_club`; `createEventAction` (Zod `eventFormSchema`) → `create_event`; `updateEventAction`; `setEventStatusAction` (publish / draft / cancel / restore, cascading to dates; publishing sets `published_at`); `setOccurrenceStatusAction`; `deleteDraftAction`; `setEventPinAction` → `set_event_pin`; `createPostAction` → `create_club_post`; `deletePostAction` (also removes the photo files); `createStoryAction` → `create_club_story` (checks the photo path is in the caller's folder first); `deleteStoryAction` (table delete under RLS, then removes the photo); `createPromoAction` (insert into `promo_codes` under RLS; ₹ → paise, end date = 23:59:59 IST) and `setPromoActiveAction` (update `active`). Post and event actions finish with `updateTag("events")` or `updateTag("posts")`, plus `refresh()` where the page stays open. Story actions redirect back to the dashboard (no public web page shows stories).
- **`src/app/admin/actions.ts`**: `reviewClubAction` → `review_club`, then `updateTag("clubs")` and `updateTag("events")`. `moderateAction` → `moderate_content`, then deletes the returned photo paths from `post-media` and calls `updateTag("posts")`. `resolveReportAction` → `resolve_report`. `setModerationModeAction` → `set_moderation_mode`.
- **`src/lib/errors.ts`** (`dbErrorMessage`, `fieldErrorsFrom`, `ActionResult`) and **`src/lib/media.ts`** (`postMediaUrl`, `POST_MEDIA_PATH`).
- **Counts:** follow and like rows are private (P19), so the dashboard and Follow button read `follower_count` and `like_count` instead of counting rows.
- **Components:** `events-map.tsx` (mapbox-gl; pins are real buttons), `pin-picker.tsx`, `poster-picker.tsx` (uploads to `posters` or `post-media` as `<user id>/<uuid>.<ext>`; used for posters, post photos and story photos), `social-buttons.tsx` (Follow and Save load the viewer's own state and the follower count in the browser, on top of the cached page), `share-button.tsx`, `event-card.tsx`, `organizer-ui.tsx`, `site-header.tsx`, `form-field.tsx`.
- **`src/app/globals.css`**: colour values are copied from `packages/tokens` by hand. Change both together.

### `apps/mobile`

`app.json` sets the scheme `nikl`, the Android package `app.nikl`, the config plugins (`expo-router`, `expo-splash-screen`, `expo-sqlite`, `@rnmapbox/maps`, `expo-image-picker` with the photo-permission text and camera and microphone off), typed routes, the React Compiler and the EAS project ID. `eas.json` has the **development**, **preview** and **production** build profiles (T26).

Week 5 added three native libraries: `expo-image-picker`, `expo-image-manipulator` and `expo-crypto`. Expo Go already contains them. A development build made before week 5 doesn't, so it must be rebuilt (T26).

Package age rule: pnpm refuses package versions younger than about two weeks (supply-chain safety), so `expo-doctor` may flag fresh Expo patch releases (e.g. expo 58.1.0, expo-crypto 58.0.9 in late Nov 2026). Update them with `npx expo install --fix` once they're old enough; never add `minimumReleaseAgeExclude` entries to get around it.

| Screen | File in `src/app/` | Notes |
|---|---|---|
| Tab bar | `(tabs)/_layout.tsx` → `components/app-tabs.tsx` | Native tabs; `app-tabs.web.tsx` is the web-preview version |
| Home | `(tabs)/index.tsx` | `home_feed`, `story_feed` (stories row), `suggested_clubs`; "+" sheet (New post, Share your plans); ⋯ menu on posts |
| Explore | `(tabs)/explore.tsx` | Map/List; reads `?category=` and `?when=` |
| Tickets | `(tabs)/tickets.tsx` | `my_bookings` via `useFocusData` (`bookings:<user id>`): In progress (countdown, Finish paying, Cancel → `cancel_hold`), Upcoming with codes, Refunds and cancellations, Past |
| You | `(tabs)/profile.tsx` | Login prompt, profile header with counts (`user_profile`), your posts grid with Under review / Removed, Saved, log out |
| Log in | `login.tsx` | Modal; sends new users to profile set-up |
| Profile set-up | `profile-setup.tsx` | `complete_profile`; swipe-back disabled |
| Event | `event/[slug].tsx` | Dates, venue, Open in Maps, Share, Share to your plans, Save; Book / RSVP (login first) |
| Book | `book/[slug].tsx` | Date, ± per tier (`tierAvailability`, `stepQuantity`), promo, live quote, `hold_booking`; free → Tickets, paid → `openPayPage`. Shows an existing hold for the event |
| Club | `club/[handle].tsx` | Stats (`follower_count`), Follow, Posts / Upcoming tabs |
| Person | `u/[username].tsx` | `user_profile`, Follow, "Follows you", posts grid; ⋯ report / block; blocked state with Unblock |
| Post | `post/[id].tsx` | One post (from a profile grid): photos, likes (`like_count`), caption, tagged event |
| Stories | `stories.tsx` | Full-screen viewer; `?author=club:<id>` or `user:<id>` picks the starting group |
| New post | `create/post.tsx` | 1–5 photos, caption, saved event, Public / Friends → `create_user_post` |
| Share your plans | `create/plan.tsx` | Event (saved, or `?event=<id>`), optional photo and note → `create_user_story` |

`src/app/_layout.tsx` wraps everything in `AuthProvider` and the theme, registers the stack screens (`(tabs)`, `login`, `profile-setup`, `event/[slug]`, `club/[handle]`, `u/[username]`, `post/[id]`, `book/[slug]` sliding up, `stories` as a full-screen fade modal without gestures, and `create/post` / `create/plan` sliding up with swipe-back off so drafts aren't lost), and draws `FlashBanner` above the stack.

Key modules in `src/lib/` and `src/components/`:

- **`lib/supabase.ts`**: the app's client (from `@nikl/supabase`). The session is stored with `expo-sqlite` localStorage (T11) and only auto-refreshes while the app is in the foreground. `null` when `.env` is missing.
- **`lib/auth.tsx`**: `AuthProvider` / `useAuth()` keep the session in React state.
- **`lib/focus-data.ts`**: `useFocusData(key, load)` loads a screen's data whenever it comes into focus (skipping reloads under 30 seconds old), keeps the last data when a reload fails, and ignores late answers. Put the signed-in user's ID in `key`, so one person never sees another's likes. `invalidate(...prefixes)` makes every screen whose key starts with a prefix reload on its next focus, however fresh; keys in use start with `home:`, `user:` and `post:`.
- **`lib/social.ts`**: `useSocial()` for optimistic follow (clubs and people), like and save (P18). Taps go into a small module-level store, so every screen agrees; the database function is called with the state the person wants; on failure the tap is undone and an alert shown. The store resets when the user changes. Also `forgetFollowUser` (after a block), `adjustCount`, `useSavedEventIds`, `postPhotoUrl` (accepts storage paths only), `personPhotoUrl` (Nikl storage only), `friendlyMessage` / `OFFLINE` (shared error text) and `shareEvent` (adds a link only when `EXPO_PUBLIC_SITE_URL` is an `https://` address).
- **`lib/feed.ts`**: `useHomeFeed` loads `home_feed`, the story groups, `suggested_clubs`, your own profile basics and every photo of people's posts (from `post_media`; the feed row carries only the first). Only the feed must load; the rest fails quietly. `postAuthor()` turns a row into a club or person author.
- **`lib/stories.ts`**: `story_feed` rows grouped per author (`groupStories`) and a module store shared by the row and the viewer (`setStoryGroups`, `useStoryState`). `markSeen` greys a story on the phone at once; `sendSeen` sends them in one `mark_stories_seen` call when a group ends or the viewer closes, and keeps them for the next try on failure. Also `ringFor`, `useViewerGroups` (loads its own groups when the viewer opens before Home), `visibleStoryGroups`, `storyTemplate`. Resets when the user changes.
- **`lib/people.ts`**: `usePersonProfile` (`user_profile`, then the person's posts read from `posts` under RLS) and `usePost` (one post, its author, `like_count` and whether you liked it).
- **`lib/safety.ts`**: `REPORT_REASONS`, `reportContent` → `report_content`, `setBlock` → `set_block`, `deleteMyPost` / `deleteMyStory` (table deletes under RLS; photos are removed only once the row is really gone). A "hidden" store (`useHidden`) makes deleted posts and stories and blocked people vanish from every loaded screen at once.
- **`lib/media.ts`**: `pickPhotos` (system picker; asks for permission only if the phone needs it), `uploadPhoto` (shrinks to 1,080 px wide, JPEG at 0.8, uploads to `post-media/<user id>/<uuid>.jpg`, returns the path), `removePhotos` (own folder only), `explainPickProblem`.
- **`lib/flash.ts`**: `showFlash(text)` for a short message over any screen ("Posted …").
- **`lib/booking.ts`**: `fetchMyBookings`, `quoteBooking`, `holdBooking`, `cancelHold`, `useQuote`, `useNow`, `bookingMessage`. `openPayPage(token)` opens `EXPO_PUBLIC_WEB_URL/pay/<token>?return=<app link to tickets>` with `expo-web-browser`'s `openAuthSessionAsync`; without that variable, `paymentsConfigured` is false and paid bookings say so (free RSVPs still work).
- **`lib/explore.ts`** (`useExploreEvents`, `matchesQuery`, `categoryLook`, and the `Nullable` helper, because generated RPC types mark every column non-null), **`lib/event-detail.ts`**, **`lib/club.ts`**, **`lib/profile.ts`** (a profile counts as set up once it has a username).
- **`components/events-map*.tsx`**: `events-map.tsx` checks for Mapbox's native module (`NativeModules.RNMBXModule`) and only then `require`s `events-map-native.tsx` (`@rnmapbox/maps`). In Expo Go it exports `null`, and Explore falls back to the list. `events-map.web.tsx` is always `null`; `events-map-types.ts` holds the shared props.
- **Components:** `feed.tsx` (StoriesRow with 74 px circles and the "Your plans" bubble, PostCard for clubs and people, PhotoCarousel, ReviewPill, SuggestedClubs, CaughtUp, `openClub` / `openPerson` / `openEvent` / `openStories`), `story-card.tsx` (StoryCard drawn from data, P9; `storySticker`, `storyAction`), `composer.tsx` (ComposerGate: login and username needed; ComposerFrame: asks before throwing away a draft, Android back too; EventChoice, Segmented), `people.tsx` (ProfileHeader, PersonPostGrid), `safety.tsx` (ContentMenu / `useContentMenu`: the ⋯ sheet), `sheet.tsx` (bottom sheet), `flash.tsx` (FlashBanner), `social.tsx` (IconButton, ClubAvatar, PersonAvatar, `StoryRing` = `'unseen' | 'seen'`, FollowButton, SmallButton, VerifiedTick), `event-card.tsx`, `chip.tsx`, `ui.tsx` (Screen, T, Button, EmptyState, Wordmark). `src/theme.ts` gives `useNiklTheme()` from the tokens.

### `packages`

| Package | What's in it |
|---|---|
| `@nikl/tokens` | Light and dark palettes, fonts, font sizes, spacing, radius, `touchTarget` (44) |
| `@nikl/utils` | `money.ts` (`formatPaise`, `priceSummary`, `BOOKING_FEE_BPS` = 4%, `cartTotals`), `phone.ts` (`normalizeIndianPhone`, `formatIndianPhone`), `dates.ts` (`formatEventDay/Time/When` in IST, `formatTimeAgo`), `categories.ts` (`CATEGORIES`, `BBSR_AREAS`, map centres), `windows.ts` (`TIME_FILTERS`, `inTimeWindow`), `geo.ts` (`stackBySpot`, `stackOffsetPx`), `stories.ts` (`groupInOrder`, `nextStory`, `previousStory`, `firstUnseen`, `shrinkWidth`), `booking.ts` (`MAX_TICKETS_PER_BOOKING`, `MAX_PER_TIER`, `tierAvailability`, `stepQuantity`, `formatCountdown`, `bookingSection`), `slugify`. Tests: `utils.test.ts`, `booking.test.ts` |
| `@nikl/validation` | Zod: `phoneSchema`, `otpSchema`, `usernameSchema`, `profileSetupSchema`, `clubFormSchema`, `eventFormSchema`, `ticketTierSchema`. Tests: `validation.test.ts` |
| `@nikl/supabase` | `createNiklClient`, `isConfigured`, `sendPhoneOtp` / `verifyPhoneOtp`, `friendlyAuthError`, and `database.types.ts` (generated: never edit by hand) |

### `supabase`

- `config.toml`: local settings (phone sign-up on, test OTP numbers, analytics off).
- `config.toml` also sets `[functions.payments] verify_jwt = false` (the pay token and Razorpay signatures prove requests instead).
- `migrations/`: applied in filename order (9 files).

| Migration | What it adds |
|---|---|
| `20261121000000_schema_v1.sql` | 30 tables, enums, row-level security and policies, permission helpers, column-level grants |
| `20261121010000_phone_e164.sql` | Phones stored as `+91…`, with a check (S3) |
| `20261121020000_club_approval_and_events.sql` | Category check, `platform_admins`, club review status and visibility, `create_club`, `review_club`, `create_event` v1, `posters` bucket |
| `20261121030000_profile_setup.sql` | `complete_profile` (18+) |
| `20261121040000_poster_ai_usage.sql` | `poster_ai_usage` table and `bump_poster_ai_usage` |
| `20261121050000_explore_and_venue_locations.sql` | `venues.lat/lng`, `create_event` v2 (map pin), `explore_events`, `set_event_pin` |
| `20261127000000_social_feed.sql` | `post-media` bucket, `set_follow_club`, `set_like`, `set_save`, `create_club_post`, `home_feed` v1, `suggested_clubs` |
| `20261127010000_stories_user_posts_moderation.sql` | `app_settings` and the review switch; private follow and like lists with count functions; following and blocking people; `user_profile`; people's posts; club and "Your plans" stories; the automatic event story trigger; `story_feed`; `home_feed` v2; reports and the admin moderation functions; admin storage rules on `post-media` |
| `20261128000000_bookings.sql` | `promo_codes`; booking columns (`subtotal_paise`, `discount_paise`, `promo_code_id`, `pay_token`, `confirmed_at`), `tickets.admits`, `payment_events`; pricing, hold, confirm, expiry and payment functions; `my_bookings`; the `nikl-expire-holds` pg_cron job |

- `tests/`: pgTAP, 121 tests (`club_approval_test.sql` 19, `explore_test.sql` 12, `profile_setup_test.sql` 8, `social_test.sql` 16, `stories_moderation_test.sql` 40, `bookings_test.sql` 26).
- `functions/extract-event/index.ts`: poster reading; `functions/payments/index.ts`: payments (both Deno Edge Functions).
- `seed.sql`: fictional Bhubaneswar clubs, venues, events, tiers, posts and stories with fixed IDs. On every reset the sample week moves to the coming Saturday (IST), and the sample stories, plus the automatic ones the trigger makes for sample events, last 14 days.

## 3. How data flows

```
Phone app ─┐                                   ┌─ tables, all with row-level security
           ├─ publishable key + user session ─▶│  database functions (trusted rules)
Website  ──┘                                   └─ Storage: posters, post-media (post and story photos)
  ├─ cached public reads: publishable key, no cookies (lib/public-data.ts)
  └─ server actions: user's cookies → RPC / table update → updateTag(...)
Edge Function extract-event: service role (inside Supabase only) → Claude
Edge Function payments: pay token or Razorpay signature → service role → payment functions → Razorpay
```

1. **Row-level security (RLS) on every table.** The apps only ever hold the publishable key. Policies decide which rows a request can see or change; column grants decide which columns. The service-role key exists only inside Edge Functions, where Supabase provides it.
2. **Rules live in database functions.** Creating clubs, events, posts and stories, approvals and moderation, profile set-up, follow, like, save, block and report all go through functions in `supabase/migrations`, called with `supabase.rpc(...)`. Simple edits (event details, status, single dates, deleting your own posts and stories) are plain table updates or deletes guarded by RLS.
3. **Money and seats are server-only** (S5). Bookings are made only by `hold_booking`; payments are recorded only by the `payments` Edge Function. Apps can't write bookings, payments, refunds, payouts, tickets, the waitlist or the audit log. Seat counters and trust fields (`verified`, `kyc_status`, ratings, `moderation_status`, `moderation_note`) are left out of the column grants; on `posts`, authors may update only `caption` and `visibility`, and stories have no update policy at all.
4. **Visibility follows club approval** (P15). `club_is_live()` and `event_visible()` hide a pending club's events, posts and stories from everyone except its team and Nikl admins. Drafts are visible only to the team.
5. **Private data sits in its own tables** (S4): `profiles_private` (phone, birth year; owner-only) and `club_payout_settings` (admin-only). `profiles` is public.
6. **People's content follows people rules** (P19–P23). The "visible posts" and "visible stories" policies check the moderation status, blocks (`blocked_with_me`), friends (`is_my_friend`, for friends-only posts) and followers (`i_follow`, for people's stories). These viewer-only helpers answer only about the signed-in person; the general `is_follower` / `are_friends` / `is_blocked_between` can't be called by apps. Posts, stories, reports and follows are created only through definer functions (no insert policies for apps, except follows, whose insert policy re-checks blocks and approved clubs); approved posts can't be edited. Follow and like rows are visible only to the people involved; everyone else gets counts from definer functions.

**Security definer or invoker.** Most functions run as the caller (`security invoker`), so RLS still applies. A few run with the owner's rights (`security definer`) because they must do something the caller can't, like insert a club (no insert grant), write `profiles_private`, publish a post or story with a status, count private follow and like rows, write notifications or the audit log. Those functions do every check themselves.

**Errors.** Functions raise short, human messages with these codes: `42501` not allowed, `22023` invalid input, `23505` already taken, `P0001` limit reached, `P0002` not found, `54000` too many today. The web shows them through `dbErrorMessage`; the app through `friendlyMessage` in `lib/social.ts` (used by taps, composers and the ⋯ menu; inline on profile set-up).

### Database functions

"Default" means the migration adds no grant of its own, so Supabase's default applies and anyone, logged out too, can call it. Policies call these helpers, so callers need that right. Most only answer questions about the caller or about public data. The general relationship helpers (`is_follower`, `are_friends`, `is_blocked_between`) take any two user IDs, so execute on them is revoked from apps; row rules use the viewer-only versions (`i_follow`, `is_my_friend`, `blocked_with_me`). "Nobody" means execute is revoked from every app role; only other functions and triggers use it.

| Function | Runs as | Who can call | What it does, and notable checks |
|---|---|---|---|
| `is_club_admin(club)` | definer | default | Caller is an active owner or admin of the club. Used by policies. |
| `is_club_owner(club)` | definer | default | Caller is the club's active owner (manages the team). |
| `is_club_staff(club)` | definer | default | Caller is any active member, including check-in staff. |
| `can_manage_event(ev)` | definer | default | Caller is an admin of the event's club. |
| `event_visible(ev)` | definer | default | Not a draft, public or unlisted, and the club is approved; or the caller manages it; or the caller is a Nikl admin. |
| `occurrence_visible(occ)` / `can_manage_occurrence(occ)` / `can_staff_occurrence(occ)` | definer | default | The same questions for one date of an event. |
| `can_edit_post(p)` | definer | default | Caller wrote the post, or is an admin of the club that posted it. |
| `is_valid_category(c)` | invoker | default | One of the 12 category IDs. Used by check constraints on `clubs` and `events` and by functions. |
| `is_platform_admin()` | definer | default | Caller is in `platform_admins` (a Nikl admin). |
| `club_is_live(club)` | definer | default | The club's review status is `approved`. |
| `is_follower(follower, target_user)` | definer | nobody | `follower` follows the person `target_user`. Used inside definer functions (e.g. `user_profile`). |
| `i_follow(target)` / `is_my_friend(other)` / `blocked_with_me(other)` | definer | anon, authenticated | Viewer-only versions used by the posts and stories policies and `set_follow_user`: they only answer about the signed-in person. |
| `are_friends(a, b)` | definer | nobody | They follow each other. Behind `is_my_friend`. |
| `is_blocked_between(a, b)` | definer | nobody | Either one has blocked the other. Behind `blocked_with_me`. |
| `moderation_default()` | definer | nobody | `approved` when `app_settings.moderation_mode` is `publish`, otherwise `pending`. |
| `valid_media_path(path, owner)` | definer | nobody | `<owner>/<uuid>.(jpg\|png\|webp)` and the file exists in `post-media` (S13). |
| `create_club(name, handle, category, kind, area, bio)` | definer | authenticated | Creates a club page as `pending`; the creator becomes owner (trigger). Checks: logged in, valid category, at most 3 pending pages per person, handle unique ignoring case (stored lowercase). |
| `review_club(club_id, decision, note)` | definer | authenticated | Nikl admins only. Sets `approved`, `rejected` or `suspended` (never `pending`) with a note, and writes `audit_log`. |
| `create_event(club_id, title, category, starts_at, … , venue_lat, venue_lng)` | invoker | authenticated | Event, weekly dates and ticket tiers in one transaction. Checks: club admin, valid category, 1 to 12 weekly repeats, start no more than 1 hour in the past, end after start, capacity at least 1, up to 6 named tiers, pin both-or-neither and inside India. Creates the venue from the typed name; slug = title words + 6 random characters; no tiers means one "Free RSVP" tier per date. |
| `set_event_pin(event_id, lat, lng)` | invoker | authenticated | Club admins add, move or remove a pin. Same pin checks; needs a venue name. Gives the event its own copy of the venue, so shared venues never move. |
| `explore_events(from, to)` | invoker | anon, authenticated | One row per published, public event of an approved club, at its next scheduled date in the window (default: now to 60 days; events in progress count, no end time means 2 hours). Includes more-dates count, venue and pin, cheapest price, free flag, spots left, club. Soonest first, at most 500. |
| `complete_profile(name, username, area, interests, dob_year)` | definer | authenticated | Profile set-up. Name 2 to 60 characters; username 3 to 24 of `a-z 0-9 . _` with no leading, trailing or double dots, unique ignoring case; 18 to 100 by birth year (IST year); 3 to 12 distinct valid interests. Writes `profiles` and the private birth year. |
| `bump_poster_ai_usage(user_id, limit)` | definer | service_role only | Counts one poster read for today (IST). Returns false, without counting, once the daily limit is reached (S10). |
| `follower_count(target_type, target_id)` / `following_count(user_id)` | definer | anon, authenticated | Public counts for clubs and people, since follow rows are private (P19). |
| `like_count(post_id)` | definer | anon, authenticated | Public like count, since like rows are private (P19). |
| `set_follow_club(club_id, on)` | invoker | authenticated | Sets the follow to the wanted state, so retries are safe. Following needs an approved club. |
| `set_follow_user(user_id, on)` | invoker | authenticated | Same pattern for people. Not yourself; the person needs a username; refused while either has blocked the other. |
| `set_block(user_id, on)` | definer | authenticated | Blocks or unblocks; blocking also deletes follows both ways (P23). Not yourself. |
| `set_like(post_id, on)` | invoker | authenticated | Same pattern; only approved posts the caller can see. |
| `set_save(event_id, on)` | invoker | authenticated | Same pattern; only events the caller can see that aren't drafts. |
| `user_profile(username)` | definer | anon, authenticated | A person's public profile, follower and following counts, and `is_me`, `i_follow`, `follows_me`, `blocked_by_me`. Returns nothing if that person blocked the caller. |
| `create_club_post(club_id, caption, event_id, media_paths)` | definer | authenticated | Club admins only. Needs a photo, an event or a caption; caption up to 2,200 characters; up to 5 photos; the event must be this club's and published; each photo must be `<caller id>/<uuid>.(jpg\|png\|webp)` and exist in `post-media` (S13); at most 20 posts per club per 24 hours. Publishes straight away as approved and public (P17). |
| `create_user_post(media_paths, caption, event_id, visibility)` | definer | authenticated | Needs a username; 1 to 5 photos (`valid_media_path`); caption up to 2,200; `public` or `friends`; the event must be one the caller saved and published; at most 10 posts per 24 hours. Status from `moderation_default()` (P20, P21). |
| `create_club_story(club_id, media_path, event_id)` | definer | authenticated | Club admins only. A photo, an event or both; the event must be this club's and published; at most 10 per club per 24 hours. Kind `custom`, approved straight away (P17). Lasts 24 hours (column default). |
| `create_user_story(event_id, media_path, note)` | definer | authenticated | "Your plans". Needs a username; note up to 100 characters; a published, public event of an approved club with a scheduled date that hasn't ended; at most 10 per 24 hours. Kind `your_plan`, template `{"kicker": "Going", "note": …}`. Card only: approved; with a photo or note: `moderation_default()`. |
| `story_feed()` | invoker | anon, authenticated | Live stories, one row per story, ordered by group: your own first, then authors with unseen stories, then followed ones, then newest. Your own show while under review. Event stories only while the event is published and has a scheduled date that hasn't ended. Flags `seen`, `mine`, `following`, `under_review`, plus event card data. At most 300 rows. |
| `mark_stories_seen(story_ids)` | invoker | authenticated | Inserts `story_views` rows for the caller; repeats are ignored. |
| `home_feed(limit)` | invoker | anon, authenticated | The ranked feed, v2 (T28, T29): approved club posts, plus approved posts by people the caller follows and the caller's own (pending or flagged too, as `under_review`). Recency (about 1 point per 2 days), own +4, followed +3, event within 72 hours +2, interests +1, area +1, a little for likes; at most 2 per club or person; last 30 days; club posts about events that are over are hidden, people's posts stay. Limit capped at 100. Returns `author_type`, club or user columns, `mine`, `under_review`, the first photo path, event strip data, like count and liked/saved/following flags. |
| `suggested_clubs(limit)` | invoker | anon, authenticated | Approved clubs the caller doesn't follow or manage, ordered by interest match, area, verified, rating count; follower count from `follower_count`. Limit capped at 30. |
| `report_content(target_type, target_id, reason, details)` | definer | authenticated | Reasons: `spam`, `nudity`, `violence`, `harassment`, `hate`, `scam`, `false_info`, `other`. One open report per person per item (a repeat updates it). When 3 different people have open reports on an approved post or story, it becomes `flagged` (hidden). |
| `moderation_queue()` | definer | authenticated | Nikl admins only. Posts that are pending, flagged or have open reports, and live stories in the same state, with photo paths, caption or note, event title, open report count and reasons. Oldest first. |
| `open_reports()` | definer | authenticated | Nikl admins only. Open reports about people, clubs and events, with a label and the reporter's username. |
| `moderate_content(target_type, target_id, decision, note)` | definer | authenticated | Nikl admins only. `approved` or `rejected` (a note is required to reject). Sets status and `moderation_note`, closes open reports (`actioned` or `dismissed`), writes `audit_log`, notifies the person or the club's owners and admins when the status changes, and returns the photo paths of removed content so the caller deletes the files. |
| `resolve_report(report_id, status, note)` | definer | authenticated | Nikl admins only. Marks an open report `actioned` or `dismissed`; writes `audit_log`. |
| `set_moderation_mode(mode)` | definer | authenticated | Nikl admins only. `review` or `publish`; updates `app_settings` and writes `audit_log`. |
| `booking_fee_paise(amount)` | invoker | default | 4% of the amount after discounts, rounded to the nearest rupee; 0 for 0 or less. Mirrors `bookingFeePaise` in `packages/utils` (S1, P26). |
| `price_selection(occurrence, items, promo, user)` | definer | nobody | Validates and prices a selection (`[{tier_id, qty}]`): published, visible event of a live club; scheduled date not over; age limit; 1 to 10 per tier, each tier once, up to 10 tickets; sale window, tier quantity and date capacity; promo active, in its dates, for this club and event, not used up (counting others' live holds), once per person. Returns subtotal, discount, fee, total, seats, tickets, promo ID. |
| `quote_booking(occurrence, items, promo)` | definer | anon, authenticated | The live price for the booking screens; holds nothing. |
| `ticket_code()` | invoker | nobody | `NKL-` + 6 characters from a 32-letter alphabet (no 0/O, 1/I), from `gen_random_bytes`; retries on a clash. |
| `confirm_booking(booking)` | definer | nobody | Sets `confirmed` and `confirmed_at`, clears the hold, issues one ticket per ticket bought (`admits` = the tier's `seats_per_ticket`), bumps the promo's `used`. Repeats do nothing. |
| `release_booking(booking, status)` | definer | nobody | Gives back `sold` and `seats_taken` of an unpaid booking (`held`, `payment_pending`, `failed`) and sets the status. |
| `hold_booking(occurrence, items, promo, idempotency_key)` | definer | authenticated | P24. Needs a username and a birth year (18+). A known key returns the same booking (not someone else's, not an expired one). Locks the date, then its tiers; releases expired holds on that date and the caller's own unpaid hold; prices with `price_selection`; inserts the booking and items and takes the seats. Paid: `held` for 10 minutes with a 36-hex `pay_token`. Free: confirmed at once, no token. |
| `cancel_hold(booking)` | definer | authenticated | Your own unpaid booking only; releases it as `expired`. |
| `expire_holds()` | definer | nobody | Releases unpaid holds past `hold_expires_at` (skips locked rows). Run every minute by the pg_cron job `nikl-expire-holds` (T31). |
| `booking_for_payment(token)` | definer | anon, authenticated | The pay page's booking by token: event, items, prices, hold time and a ticket **count** (never codes). |
| `start_payment(token, provider, order_id)` | definer | service_role only | Records the provider order (`payments`, `created`) and sets `payment_pending`; the first time, extends the hold to 10 minutes from now but never past 20 minutes from creation. Refuses expired holds. |
| `open_order_for(token)` | definer | service_role only | The booking's latest `created` or `failed` order, so a retry reuses it. |
| `payment_captured(order, payment, method, amount, raw)` | definer | service_role only | Amount must match. Idempotent (an already captured payment returns the booking status). Unpaid hold: `paid`, then confirmed. Expired: re-takes the seats if they fit (`late_paid`, confirmed), else `late_paid` plus a full `pending` refund (P27). |
| `payment_failed(order, payment, raw)` | definer | service_role only | Marks the payment `failed` and a `payment_pending` booking `failed`; the hold stays until it runs out. |
| `claim_payment_event(event_id, type)` | definer | service_role only | Inserts into `payment_events`; false if the webhook was seen before. |
| `my_bookings()` | definer | authenticated | The caller's bookings with event, club, venue, items and tickets (codes, admits, status); live unpaid holds with their `pay_token`; expired holds left out. Soonest first. |

Triggers:

| Trigger | Function | What it does |
|---|---|---|
| `on_auth_user_created` (after insert on `auth.users`) | `handle_new_user()` | Creates the `profiles` and `profiles_private` rows; adds `+` to the phone (S3) |
| `on_club_created` (after insert on `clubs`) | `handle_new_club()` | Makes the creator the club's owner in `club_members` |
| `on_rejected_club_edited` (before update on `clubs`) | `resubmit_rejected_club()` | When the team edits a rejected club, it goes back to `pending` |
| `events_auto_story` (after insert or update of `status` on `events`) | `event_auto_story()` | The first time a public event is published (inserted as published, or updated while `published_at` was still empty), adds an approved club story of kind `event_auto`, template `{"kicker": "New"}`. Skipped if one was made in the last 20 hours. Restoring or re-publishing doesn't repeat it. |
| `set_updated_at` (before update, 15 tables) | `set_updated_at()` | Keeps `updated_at` current |

### Policies changed in week 5

| Table | Policy | Who sees which rows |
|---|---|---|
| `follows` | "people see their own follows and followers" (replaces "follows are public") | Logged in only: rows where you are the follower, where you are the person followed, or where the club is one you admin |
| `likes` | "people see their own likes" (replaces "likes are public") | Your own likes only |
| `posts` | "visible posts" (replaces "approved public posts are public") | Approved club posts of live clubs (public visibility); approved people's posts when neither has blocked the other and the post is public, or friends-only and you are friends; your own posts in any status; your club's posts |
| `stories` | "visible stories" (replaces "live approved stories are public") | Approved, unexpired club stories of live clubs; approved, unexpired people's stories if you follow them and there is no block; your own and your club's in any status |
| `app_settings` | "admins read settings" | Nikl admins read; no write policies (only `set_moderation_mode` writes) |

The schema v1 policies for inserting pending posts and stories, deleting your own (or your club's) posts and stories, filing reports and blocking still apply.

### Policies added in week 6

| Table | Policy | Who |
|---|---|---|
| `promo_codes` | "club admins see / add / change their promo codes" | Owners and admins of that club; inserts need `used = 0`; updates only `active`, `max_uses`, `valid_until` (column grant) |
| `payment_events` | none (RLS on) | Server only |

### Storage buckets

| Bucket | Reading | Limits | Who can write | How it is stored |
|---|---|---|---|---|
| `posters` | Public URL | 5 MB; JPEG, PNG, WebP | Logged-in users upload, replace and delete only inside their own folder, `<user id>/` | Full public URL in `events.poster_url`. The web server actions accept only `…/storage/v1/object/public/posters/<uuid>/<uuid>.(jpg\|png\|webp)` (S11) |
| `post-media` | Public URL | 5 MB; JPEG, PNG, WebP | Same folder rule; owners can also list their own folder (needed to delete). Nikl admins can read and delete any file, so removing content deletes its photos | A path, `<user id>/<uuid>.<ext>`, in `post_media.url` (posts) and `stories.media_url` (stories). The create functions check the shape, the folder and that the file exists (S13). Apps build the public URL (`postMediaUrl`, `postPhotoUrl`) |

Note the difference: post and story photos are checked by the database, posters only by the web app's server actions.

### Edge Function `extract-event`

Reads a poster and returns event fields for the new-event form (on hold, T23).

- `POST { posterPath }`. The caller is verified with Supabase Auth; the path must sit in the caller's own `posters` folder.
- Without `ANTHROPIC_API_KEY` it answers "not configured", or returns sample fields when `POSTER_AI_MOCK=true`.
- Daily limit through `bump_poster_ai_usage` (`POSTER_AI_DAILY_LIMIT`, default 30). Posters over 5 MB are refused.
- Calls Claude (`POSTER_AI_MODEL`, default `claude-haiku-5-5`) with a Zod structured-output schema. Unknown values come back empty, never guessed.
- Errors return HTTP 200 with `{ error, message }` so the form can show the message (401 for no login).
- The web button is hidden unless `NEXT_PUBLIC_POSTER_AI_ENABLED=true`. The category and area lists are copied in the function: keep them in sync with `packages/utils`.

### Edge Function `payments`

All money steps (T30). Runs with `verify_jwt = false`: the pay token (`^[0-9a-f]{36}$`) and Razorpay's signatures prove requests.

- `POST { action: "start", token }`: reuses the open order or creates one (Razorpay `/v1/orders`, or `order_mock_…`), then `start_payment`. Returns `{ mode, orderId, keyId?, amount, currency, title }`, or `{ status: "confirmed" }` if already paid.
- `POST { action: "verify", token, razorpay_order_id, razorpay_payment_id, razorpay_signature }`: Razorpay mode only. Uses the order from `open_order_for`, never the browser's; HMAC-SHA256 of `order|payment` with the key secret, compared in constant time; then `payment_captured`.
- `POST { action: "mock_pay", token, outcome }`: mock mode only; `success` → `payment_captured`, `failure` → `payment_failed`.
- **Webhooks** (header `X-Razorpay-Signature`): HMAC of the raw body with `RAZORPAY_WEBHOOK_SECRET`, de-duplicated by `X-Razorpay-Event-Id` through `claim_payment_event`. `payment.captured` / `order.paid` → `payment_captured`; `payment.failed` → `payment_failed`. Only a small summary goes in `raw_webhook`, never card or bank details. Unknown orders and wrong amounts are acknowledged and logged as "PAYMENT NEEDS A LOOK".
- `PAYMENTS_MODE`: `mock` or `razorpay`; anything else or unset = off ("Payments aren't switched on yet"). Friendly database errors (`22023`) go to the payer; others are logged and answered vaguely (HTTP 500).

### Tables at a glance

35 tables in `public`. Several exist ahead of their features (`payouts`, `waitlist`, `post_tags`, badges; `refunds` only gets queued rows). `notifications` gets moderation messages but has no screen yet (week 8).

- **People:** `profiles` (public), `profiles_private` (owner-only), `platform_admins`.
- **Clubs and places:** `clubs`, `club_members` (`owner` / `admin` / `checkin`), `club_payout_settings`, `venues` (PostGIS `location`, plus generated `lat` / `lng`).
- **Events:** `events` (the series; `published_at` is set on publish), `event_occurrences` (one row per date), `ticket_tiers` (per date).
- **Money, server-only:** `bookings` (status, prices in paise, `promo_code_id`, `hold_expires_at`, unique `idempotency_key` and `pay_token`, `confirmed_at`), `booking_items`, `payments` (unique `provider_order_id`), `refunds`, `payouts`, `tickets` (`code`, `admits`), `waitlist`, `payment_events` (webhook IDs). Plus `promo_codes` (club admins, under RLS).
- **Social:** `follows` (clubs and people), `posts` (`author_type` club or user; `visibility` public or friends; `moderation_status`; `moderation_note`, up to 300 characters, the reason shown to the author), `post_media`, `post_tags`, `likes`, `saves`, `stories` (`kind` `event_auto` / `custom` / `your_plan`; `template` jsonb with `kicker` and `note`; `expires_at` 24 hours; `moderation_note`), `story_views`, `notifications`.
- **Safety, passport, system:** `reports` (unique index `reports_one_open_per_target` on reporter, target type and target ID while `status = 'open'`), `blocks`, `badges`, `user_badges`, `audit_log`, `poster_ai_usage`, `app_settings` (key/value jsonb; `moderation_mode` = `"review"` or `"publish"`; Nikl admins read it).

## 4. Rules and conventions

| Rule | In practice | Decision |
|---|---|---|
| Money is integer paise | `19900` = ₹199. Never floats. Format with `formatPaise` / `priceSummary`. The booking fee is 4% of the amount after discounts, rounded to the nearest rupee: `bookingFeePaise` in utils and `booking_fee_paise` in SQL must match. Prices in the apps are previews; `quote_booking` / `hold_booking` decide. | S1, P26 |
| Seats are held, then released | Only `hold_booking` takes seats (10 minutes, row locks, idempotency key; one fresh 10 minutes when paying starts, 20 at most). `expire_holds` (pg_cron, every minute) and each new hold on the date give unpaid seats back. Never change `sold` / `seats_taken` anywhere else. | P24, T31 |
| Payments only through the `payments` function | Apps never call the payment functions (service_role only) or Razorpay's API; the pay page calls the function, which calls the database. The result comes from `payment_captured`, safe to repeat. | P25, T30 |
| Mock payments never on a real server | `PAYMENTS_MODE=mock` gives free tickets. Use it only in `supabase/functions/.env` on your computer; hosted projects set `razorpay` (test keys, then live) or leave it unset (off). | T30 |
| Times stored in UTC, shown in IST | `timestamptz` columns; `formatEvent*` and `inTimeWindow` work in `Asia/Kolkata`; forms send times with `+05:30`. | S2 |
| Phones are `+91` E.164 | `normalizeIndianPhone`; the signup trigger adds the `+`; a check rejects other formats. The phone lives only in `profiles_private`; organizers never see it. | S3, S4, S8 |
| One categories list | `CATEGORIES` in `packages/utils`, `is_valid_category()` in the database and the copy in `extract-event` must match. Change all three together (the database part through a new migration). | D7, PLAN.md §5 |
| Images only from Nikl storage | Posters: uploads in the `posters` bucket (checked in web actions). Post and story photos: storage paths `<user id>/<uuid>.(jpg\|png\|webp)` in `post-media`, checked by the database. The app shrinks photos and uploads them with `lib/media.ts`; the web uses `poster-picker.tsx`. | S11, S13, T29 |
| Clubs are hidden until approved | Every public read relies on `club_is_live()`; don't bypass it. | P15 |
| Club content publishes straight away | Club posts only through `create_club_post`, club stories through `create_club_story` (plus the automatic event story). | P17, P22 |
| People's content is moderated | Create only through `create_user_post` / `create_user_story`, which take their status from `moderation_default()`. Review and removal only through `moderate_content`; delete the photo paths it returns. Show your own unchecked content as "Under review"; never show it to others. | P20 |
| Follow and like lists are private | Read counts with `follower_count`, `following_count` and `like_count`; never count `follows` or `likes` rows (RLS shows only your own, so the count comes out wrong). Read the viewer's own state by filtering on their user ID. | P19 |
| Blocks hide both ways | The posts and stories policies and `user_profile` handle it; any new read of people's content must check `blocked_with_me` too. In the app, `useHidden()` removes what was blocked or deleted since the screen loaded. | P23 |
| One-tap social | Optimistic UI with rollback; functions take the wanted state (`p_on`), never "toggle". | P18 |
| Public pages are cached | Public reads go in `lib/public-data.ts` with `"use cache"`, `cacheLife` and `cacheTag`, using the publishable key and no cookies. Anything that changes public data calls `updateTag("events" \| "clubs" \| "posts")`. | T24 |
| Schema changes only through migrations | Add a new file; never edit one that has been pushed. Hosted projects get them with `supabase db push`, from a CLI the founder linked with their own login. | T19 |
| No secrets in the repo (it's public) | `.env*` files are git-ignored; only the publishable key and the `pk.` Mapbox token go in `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`. Never paste secret keys in chat. | T21, S9, S12 |
| AI needs login and a daily limit | Counted server-side. | S10 |
| Keep Expo Go working | Guard native-only libraries the way `events-map.tsx` does (libraries already inside Expo Go, like the week-5 photo ones, need no guard). A new native library means a new development build, made by the founder with EAS. Test locally against the PC before any store build. | T25, T26, T27 |
| Calm, accessible UI | One accent colour, tokens only, every tap target at least 44 px, plain friendly English. | D1, D5, D6 |

## 5. How to add things

### A database change

1. `pnpm exec supabase migration new <short_name>` creates `supabase/migrations/<timestamp>_<short_name>.sql`.
2. Write the SQL. Checklist:
   - New table: `enable row level security`, policies for each role, and `revoke` / `grant` for the columns apps may write.
   - New function: `set search_path = ''` and fully qualified names (`public.`, `extensions.`); `security invoker` unless it truly needs definer rights; `revoke execute … from public, anon` and `grant execute … to authenticated` (or `anon` too, for public reads); raise friendly messages with the codes in section 3. Internal helpers that no policy calls: revoke from `public, anon, authenticated` (policies run as the caller, so helpers they use must stay callable).
   - Changing a function's arguments or return columns: `drop function` the old signature first (see `create_event` v2 and `home_feed` v2).
3. `pnpm db:reset` to apply it with the seed. Update `seed.sql` if sample data should show the feature.
4. Add a pgTAP test in `supabase/tests/<area>_test.sql`. Copy an existing file: `begin;`, `create extension if not exists pgtap with schema extensions;`, `select plan(n);`, insert test `auth.users`, `set local role authenticated;` and `set local request.jwt.claims …` to act as a user, then `lives_ok` / `throws_ok` / `is`, and finally `select * from finish(); rollback;`. Run `pnpm db:test`.
5. Run `pnpm db:types` and commit the regenerated `database.types.ts`.
6. Run the same lint as CI: `pnpm exec supabase db lint --schema public --level warning`.
7. Hosted `nikl-dev` gets it through `supabase db push` (T19).

### A web page

1. Read the relevant guide in `apps/web/node_modules/next/dist/docs/` first.
2. Add `src/app/<route>/page.tsx`. Keep the static shell (header, headings) in the page, and put anything per-request inside `<Suspense>` in an async child: cookies (`requireUser` / `getCurrentUser`), awaited `params` and `searchParams`, the current time. `organizer/page.tsx` is the pattern.
3. Public data: add a function to `lib/public-data.ts` with `"use cache"`, `cacheLife("minutes")` and the right `cacheTag`s. A dynamic route needs `generateStaticParams` returning at least one param (see the placeholder in `e/[slug]/page.tsx`).
4. Changes: a server action in an `actions.ts` with `"use server"`. Validate with `@nikl/validation`, call the database, map errors with `dbErrorMessage`, then `updateTag(...)` for anything public and `refresh()` for the current page.
5. A new signed-in area: add its path to the `proxy.ts` matcher so the session cookie stays fresh.
6. Use `"use client"` only for interactive parts; they get the browser client from `getSupabase()`. Styles go in `globals.css` with the CSS variables.

### An app screen

1. Check the SDK 58 docs (see `apps/mobile/AGENTS.md`).
2. Add a file under `src/app/`. A tab: `(tabs)/<name>.tsx` plus a trigger in `components/app-tabs.tsx` and `app-tabs.web.tsx`. A stack screen: `src/app/<name>.tsx` or `src/app/<folder>/[param].tsx`, then register `<Stack.Screen name="…" />` in `src/app/_layout.tsx` (with `presentation: 'modal'` or other options if needed).
3. Navigate with typed routes, e.g. `router.push({ pathname: '/event/[slug]', params: { slug } })`.
4. Data: a hook in `src/lib/` built on `useFocusData`, with the user ID in its key. Follow, like and save go through `useSocial()`. After a change other screens should see, call `invalidate('<key prefix>')`; confirm it with `showFlash(...)`.
5. Photos: `pickPhotos` and `uploadPhoto` from `lib/media.ts`, then pass the returned path to the database function; on failure, `removePhotos`.
6. UI: `Screen`, `T`, `Button`, `EmptyState` from `components/ui.tsx`, `Sheet` for bottom sheets, colours from `useNiklTheme()`, `touchTarget` for anything tappable. Platform-only files use the `.web.tsx` suffix.
7. Libraries: `npx expo install <pkg>` inside `apps/mobile`. If it has native code and isn't in Expo Go, guard it, and tell the founder a new development build is needed either way.
8. Check: `pnpm typecheck`, `pnpm lint`, and `npx expo-doctor` in `apps/mobile`.

### A shared helper

1. Add it to `packages/utils/src/` (or a schema to `packages/validation/src/index.ts`) and export it from `index.ts`.
2. Add Vitest cases to `utils.test.ts` or `validation.test.ts`; run `pnpm test`.
3. If the database has the same rule (categories, handles, usernames, pin limits), keep both in step and say so in a comment.

## 6. Testing and CI

| What | Tool | Where | Run |
|---|---|---|---|
| Unit tests | Vitest | `packages/utils`, `packages/validation` | `pnpm test` |
| Database rules | pgTAP | `supabase/tests` (121 tests) | `pnpm db:test` (database running) |
| Types and lint | tsc, ESLint | every workspace | `pnpm typecheck`, `pnpm lint` |
| Web build | `next build` | `apps/web` | `pnpm build` |
| App health | Expo Doctor, Android bundle | `apps/mobile` | `npx expo-doctor`, `npx expo export --platform android` |
| By hand | Browser; phone via Expo Go or the development build | | `pnpm dev:web`, `pnpm dev:mobile(:go)` |

There are no end-to-end tests yet (Maestro and Playwright are planned in DEV_PLAN §8).

### Testing payments locally

1. Put `PAYMENTS_MODE=mock` in `supabase/functions/.env` (git-ignored).
2. With the database up, run `pnpm exec supabase functions serve --env-file supabase/functions/.env` and `pnpm dev:web`.
3. Book a paid event. The pay page shows "Test mode" with **Pretend it worked** / **Pretend it failed**. Check `/tickets` for the codes.
4. App: set `EXPO_PUBLIC_WEB_URL` in `apps/mobile/.env` to `http://<PC's LAN IP>:3000` so the phone can open the pay page.
5. Expiry without waiting: set a booking's `hold_expires_at` in the past in Studio, then `select public.expire_holds();`.

Razorpay test mode needs the founder's test keys ([NEXT_STEPS.md](../NEXT_STEPS.md) 2.4): `PAYMENTS_MODE=razorpay` plus the three `RAZORPAY_*` values.

**CI** ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs on every pull request and every push to `main`:

- **Typecheck, lint, test, build:** `pnpm install --frozen-lockfile`, `pnpm turbo run typecheck lint test`, then `pnpm --filter @nikl/web build`.
- **Migrations apply cleanly:** `supabase db start` (migrations and seed), `supabase db lint --schema public --level warning`, `supabase test db`.

CI does not run Expo Doctor or the Android bundle. Run them yourself when you touch `apps/mobile`.

## 7. Team routine

Every chunk of work follows the same order (T20, T22):

1. **Build** the change.
2. **Check:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, plus `pnpm db:test` for database work, `pnpm build` for web work, and `npx expo-doctor` for app work. Try it in the browser or on a phone.
3. **Independent code review:** someone (or an agent) that didn't write the change reviews the diff.
4. **Fix** the findings, or write down why one is left.
5. **Re-check** everything from step 2.
6. **Update the docs:** [DECISIONS.md](../DECISIONS.md) for any new or changed decision (never delete a row: move it to "Replaced or rejected" and add a change-history line), the week status table in [DEV_PLAN.md](../DEV_PLAN.md) §7, **[FEATURES.md](FEATURES.md) and this guide**, plus [NEXT_STEPS.md](../NEXT_STEPS.md) and [README.md](../README.md) when founder steps or setup change.
7. **Commit and push to `main`** in small commits. Never commit `.env` files or keys. When a second developer joins, this moves to branches and pull requests (T20, T22).

## 8. Where to look next

- [PLAN.md](../PLAN.md): the product plan (problem, audience, features, go-to-market).
- [DEV_PLAN.md](../DEV_PLAN.md): stack, architecture, data model, key flows, the 12-week timeline and week-by-week status.
- [DECISIONS.md](../DECISIONS.md): every decision with its reason and when to revisit it, plus open questions.
- [NEXT_STEPS.md](../NEXT_STEPS.md): what the founder does next, and the "Try it yourself" tour.
- [README.md](../README.md): setup and everyday commands.
- [FEATURES.md](FEATURES.md): what the product does today, in plain words.
- [prototype/](../prototype/): `nikl-social.html` (the chosen direction) and `nikl-prototype.html`. Open them in a browser.
