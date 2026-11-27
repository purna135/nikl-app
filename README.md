# Nikl

[![CI](https://github.com/purna135/nikl-app/actions/workflows/ci.yml/badge.svg)](https://github.com/purna135/nikl-app/actions/workflows/ci.yml)

Events, activities and clubs in your city, starting with Bhubaneswar. People can discover what's on (feed + map), book with UPI, follow clubs and go with friends. Clubs get a page, a dashboard, check-in and payouts.

- Product plan: [PLAN.md](PLAN.md)
- Development plan (stack, data model, 12-week schedule): [DEV_PLAN.md](DEV_PLAN.md)
- **Decision log** (every decision, why, and when to revisit): [DECISIONS.md](DECISIONS.md)
- **Next steps** (what Claude does vs what the founder does, with steps): [NEXT_STEPS.md](NEXT_STEPS.md)
- Clickable prototypes: [prototype/](prototype/) (`nikl-social.html` is the chosen direction)

## What's in this repo

```
apps/
  mobile/        Expo (React Native) app for Android + iOS  (Expo SDK 58, Expo Router)
  web/           Next.js 16 web app: public event/club pages, Explore map, organizer dashboard, Nikl admin (booking: week 6)
packages/
  tokens/        Colours, type, spacing (from the prototype). One accent: Nikl pink.
  utils/         Money in paise, IST dates, Indian phone numbers, categories, slugs (+ tests)
  validation/    Zod schemas shared by apps and server functions (+ tests)
  supabase/      Supabase client factory, phone-OTP helpers, database types
supabase/
  config.toml    Local Supabase settings (phone sign-up on, test OTP numbers)
  migrations/    Database schema and changes (one file per change), row-level security on every table
  tests/         Database tests (pgTAP): access rules, approvals, events, feed, stories, moderation
  functions/     Edge Functions (extract-event: AI poster reading, on hold)
docs/
  FEATURES.md    What Nikl does today, in plain language
  DEVELOPING.md  Guide for developers: repo map, data flow, database functions, how to add things
  seed.sql       Example Bhubaneswar clubs, venues, events, tickets, posts, stories
```

New here? Read [docs/FEATURES.md](docs/FEATURES.md) for what Nikl does today and [docs/DEVELOPING.md](docs/DEVELOPING.md) for how the code works. Login needs a running Supabase (local or hosted) to work end to end.

## Setup

You need **Node 20+** (24 recommended) and, for the local database, **Docker Desktop**.

```powershell
corepack enable        # once per machine; puts pnpm on your PATH (may need an admin terminal)
pnpm install
```

### Local database (needs Docker)

```powershell
pnpm db:start          # starts Supabase locally and applies migrations + seed
pnpm db:types          # generates typed database types into packages/supabase
```

`pnpm db:start` prints an **API URL** and a **publishable (anon) key**. Copy `.env.example` and fill them in:

- `apps/web/.env.local` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `apps/mobile/.env` → `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (on a real phone, use your computer's LAN IP instead of `127.0.0.1`)

**Test login numbers** (local only, no SMS is sent): `98765 43210` or `99999 99999`, code **`123456`**. Real SMS in staging/production goes through MSG91 (DEV_PLAN §2).

Supabase Studio (table viewer) runs at http://127.0.0.1:54323 while the database is up.

### Server functions (poster reading)

Local settings go in `supabase/functions/.env` (git-ignored). Without `ANTHROPIC_API_KEY`, set `POSTER_AI_MOCK=true` to get sample details. For the hosted project: `pnpm exec supabase secrets set ANTHROPIC_API_KEY=...`.

### Run the apps

```powershell
pnpm dev:web           # http://localhost:3000
pnpm dev:mobile        # Expo dev server for the Nikl test build (has the map; see NEXT_STEPS 1.7)
pnpm dev:mobile:go     # Same, for Expo Go (no map: Explore shows the list)
```

## Everyday commands

| Command | What it does |
|---|---|
| `pnpm typecheck` | Type-checks every app and package |
| `pnpm lint` | ESLint for web and mobile |
| `pnpm test` | Unit tests (Vitest) for utils and validation |
| `pnpm build` | Production build of the web app |
| `pnpm db:reset` | Rebuilds the local database from migrations + seed |
| `pnpm db:types` | Regenerates database types after a migration |
| `pnpm db:test` | Database tests (pgTAP, in `supabase/tests`): access rules, club approval, events, profiles, Explore, feed, stories, people's posts, privacy, moderation |
| `pnpm exec supabase functions serve --env-file supabase/functions/.env` | Runs server functions locally (e.g. poster reading) |

CI (GitHub Actions) runs on every push to `main` and every pull request: typecheck, lint, unit tests and the web build, plus a database job that applies the migrations, lints the schema and runs the pgTAP tests.

## Rules of the codebase

- **Money is integer paise** (`19900` = ₹199). Never floats. Format with `formatPaise`.
- **Money and seats change only on the server** (Edge Functions + database transactions). The apps have no write access to bookings, payments, tickets or payouts; row-level security enforces this.
- **Times are stored in UTC and shown in IST** (`formatEventWhen`), whatever the device timezone.
- **Phone numbers are E.164** (`+919876543210`). They live in the owner-only `profiles_private` table, never in the public `profiles` table.
- **Shared logic goes in `packages/`**, so web and mobile behave the same.
- **Mobile:** add native packages with `npx expo install <pkg>` (picks SDK-compatible versions). Read the SDK 58 docs before using Expo APIs (see `apps/mobile/AGENTS.md`).
- **Web:** Next 16 with Cache Components. Reading cookies on the server must happen inside a `<Suspense>` boundary (see `apps/web/AGENTS.md` and the docs in `node_modules/next/dist/docs/`).
- Secrets never go in `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variables.

## Status

Weeks 1–4 done: login, organizer dashboard, club approval, events with weekly repeats and tickets, profile set-up, Explore (Mapbox map by default, filters, search), public event and club pages, venue pins, and the social layer (Instagram-style Home feed in the app, club stories row, club profiles, follow, like, save, club posts). AI poster reading is built but on hold. Week 5 added stories (viewer, "Your plans", automatic event stories), people's photo posts, people profiles, report/block and the Nikl admin moderation queue. Next (week 6): booking with seat holds, promo codes and UPI payments. Details in DEV_PLAN.md §7.
