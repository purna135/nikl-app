# Nikl: Next Steps (who does what)

> Status on **21 Nov 2026**: planning done, week 1 of development done (see [DEV_PLAN.md](DEV_PLAN.md) §7).
> Tick the boxes as you go. Prices and timelines are what we know today, so check them when you sign up.

## The short version

**Claude can do:** all the code for weeks 2–12, the database, tests, CI, docs, and drafts of legal pages, store listings and outreach messages. Claude can also connect each service once you've created the account, and create the GitHub repository and push code when you say so (your GitHub CLI is already signed in).

**You need to do:** anything that needs **your identity, money, signature or login**: creating accounts, payments and KYC, registering the business, legal review, talking to organizers and testers, hiring.

### Rules for sharing keys

| Fine to paste in chat | **Never** paste in chat |
|---|---|
| Supabase project URL and **publishable** key, Mapbox **public** token (`pk.…`), Sentry DSN, PostHog project key | Supabase **secret / service_role** key, database password, Razorpay **key secret**, Anthropic API key, MSG91 auth key, AWS secret keys, any password or OTP |

Secrets go in your **password manager** and the service's own settings page (Supabase secrets, Vercel environment variables, GitHub Actions secrets). For local testing, Claude tells you which git-ignored file to paste them into yourself.

---

## Try the organizer dashboard yourself (week 2 is done)

1. Make sure **Docker Desktop** is running.
2. In PowerShell in the project folder, run `pnpm dev:web`, then open http://localhost:3000/organizer.
3. Log in with `98765 43210`, code `123456`. On your local copy, this test account is also a **Nikl admin**, so you can approve your own test club at http://localhost:3000/admin/clubs.
4. Try: create a club page → add an event (weekly repeat, free or paid) → approve the club → the event goes public.

"Fill in details from poster" returns sample details until your Anthropic key is stored (1.6).

## What Claude needs for week 3 (map, Explore, public event pages)

| # | What | Blocking? |
|---|---|---|
| 1 | **Mapbox public token** (1.5) for the map. | Yes for the map; Claude can build everything else first. |
| 2 | **Anthropic key** (1.6), stored by you, so poster reading runs for real. | No. |
| 3 | Decide the **domain** (2.5), since public event links will look like `nikl.app/e/...`. | No, the links can change later. |

*Making yourself an admin on the hosted project comes later: phone login there waits for MSG91 (2.3). Then run this once in Supabase → SQL Editor, with your number: `insert into public.platform_admins (user_id) select id from auth.users where phone = '91XXXXXXXXXX';`*

---

## 1. This week: unblocks development (about 45 minutes in total)

### 1.1 Install Docker Desktop (15 min) — ✅ done 21 Nov 2026
- [x] Download **Docker Desktop for Windows** from docker.com (Products → Docker Desktop).
- [x] Run the installer and keep **"Use WSL 2"** ticked. Restart if asked.
- [x] Open Docker Desktop once and wait until it shows **Engine running**.
- [x] Tell Claude **"Docker is installed"**.

*Keep Docker Desktop running while Claude works on the app. It's what runs the local database.*

Claude then: starts the local database, fills in the local env files, tests phone login end to end on the web, and generates the database types.
*Docker Desktop is free for personal use and small businesses (under 250 employees and under $10M revenue).*

### 1.2 Try the app on your phone (5 min) — *optional but recommended*
- [ ] Install **Expo Go** from the Play Store on your Android phone.
- [ ] Keep the phone on the same Wi-Fi as your PC, and keep Docker Desktop running.
- [ ] In PowerShell in the project folder, run `pnpm dev:mobile`, then scan the QR code with Expo Go.
- [ ] Go to the **You** tab → **Log in with your phone** → number `98765 43210`, code `123456`.
- [ ] If Windows asks whether to allow access on private networks, click **Allow** (the phone needs to reach the local database).

*The app on your phone talks to the database through your PC's Wi-Fi address (192.168.1.199, set in `apps/mobile/.env`). If your router gives the PC a new address, Claude updates that file.*

### 1.3 GitHub repository (2 min) — ✅ done 21 Nov 2026: https://github.com/purna135/nikl-app
- [x] You created `purna135/nikl-app`. It's **public for now**: anyone can read the code and the plans (PLAN, DEV_PLAN, DECISIONS). No keys or passwords are in the repo.
- [x] Claude pushes each verified commit, and CI runs on every push.
- [ ] Later: make it private (GitHub → repo → **Settings** → **General** → scroll to **Danger Zone** → **Change visibility**). Moving it to a GitHub organization when others join is also easy (**Transfer ownership** in the same place).

### 1.4 Supabase project for development (10 min) — ✅ created 21 Nov 2026 (ref `ypnbsmlvcrbzqpomqlwd`)
- [x] Go to **supabase.com** → Sign up (GitHub login is fine).
- [x] Create an organization called **Nikl**.
- [x] **New project** → name `nikl-dev` → region **South Asia (Mumbai)** → generate a strong database password and **save it in your password manager**.
- [x] Wait about 2 minutes for it to start. Open **Project Settings → API Keys** (or **Data API**).
- [x] Send Claude the **Project URL** and the **publishable key**. **Don't** send the secret/service_role key or the database password.

*The free plan pauses projects after about a week of no activity, which is fine for development. Production will need the paid plan.*

### 1.4b Link the Supabase project so Claude can push the database to it (5 min) — ✅ done 21 Nov 2026
Linking lets Claude copy the tables and sample data to the hosted project, using **your** login. No secret key goes through chat.
- [x] Open **PowerShell** in `D:\Product Development\Club App` (in File Explorer: open the folder, type `powershell` in the address bar, press Enter).
- [x] Run `pnpm exec supabase login`. A browser tab opens. Click **Authorize**, then go back to PowerShell.
- [x] Run `pnpm exec supabase link --project-ref ypnbsmlvcrbzqpomqlwd`. When it asks for the **database password**, paste the one you saved (the screen won't show it as you type).
- [x] Tell Claude **"linked"**. Claude ran `supabase db push`: both migrations and the sample data are now on `nikl-dev`.

**You don't need to share the Supabase secret key.** Server functions get it from Supabase automatically, and CI deploys will use a token you add yourself in GitHub settings.

*Phone login on the hosted project stays off until MSG91 is ready (2.3). Until then, login is tested on the local database with the test numbers.*

### 1.5 Mapbox token (5 min) — *for the map in week 3*
- [ ] **account.mapbox.com** → Sign up. It may ask for a card; the free tier covers development.
- [ ] Open **Tokens** and copy the **Default public token** (starts with `pk.`).
- [ ] Send it to Claude (public tokens are safe to share).

### 1.6 Anthropic API key (10 min) — *for "create event from poster" in week 2*
- [ ] **console.anthropic.com** → Sign up → **Billing**: add a small amount of credit.
- [ ] **API Keys** → **Create key** → name it `nikl-dev` → save it in your password manager.
- [ ] **Don't paste it in chat.** Store it yourself:
  - For the hosted project, in PowerShell in the project folder: `pnpm exec supabase secrets set ANTHROPIC_API_KEY=` followed by your key (no spaces).
  - For local testing, create a file `supabase\functions\.env` containing one line: `ANTHROPIC_API_KEY=` followed by your key. Git ignores this file.
- [ ] Tell Claude **"Anthropic key stored"**.

---

## 2. Start now: these take weeks

### 2.1 Register the business — *longest lead time*
Razorpay marketplace payments, the Google Play organisation account, SMS sender registration (DLT) and GST invoices all need a registered business.
- [ ] Talk to a **CA**: Private Limited or LLP, founders and shareholding.
- [ ] Incorporate (MCA SPICe+ for a Pvt Ltd, usually 1–3 weeks), then get the company **PAN** and open a **current bank account**.
- [ ] Ask the CA about **GST registration** and how GST and TCS apply to Nikl's booking fee.

### 2.2 D-U-N-S number (free, can take up to ~30 days) — *needed for Google Play and Apple organisation accounts*
- [ ] After the company is registered, request a D-U-N-S number from **Dun & Bradstreet** (Apple's free D-U-N-S lookup page also works).

### 2.3 SMS for real logins: DLT registration + MSG91 (1–3 weeks)
Indian rules (TRAI) require every business that sends SMS to register on a DLT portal.
- [ ] Register your company as a **Principal Entity** on one DLT portal (e.g. Jio, Airtel, Vodafone Idea, BSNL), with incorporation certificate, PAN and an authorisation letter.
- [ ] Register a 6-letter **sender header** (e.g. `NIKLAP`).
- [ ] Register the **OTP template**: `Your Nikl code is {#var#}. It expires in 10 minutes. Don't share it with anyone.`
- [ ] Create an **MSG91** account and add your DLT entity ID, header and template ID.
- [ ] Tell Claude it's done. Claude connects Supabase login to MSG91. Until then, login uses test numbers.

### 2.4 Razorpay account + Route (test keys same day; going live takes days to weeks)
- [ ] **dashboard.razorpay.com** → Sign up.
- [ ] In **Test mode** → Settings → **API Keys** → generate a test key. Save the **key secret** in your password manager and don't paste it in chat.
- [ ] Submit **KYC** for live mode: business PAN, bank account, and a website with **Privacy, Terms, Refund and Contact** pages. Claude can draft these pages.
- [ ] Ask Razorpay support to enable **Route** (marketplace / split settlements). Explain that Nikl sells event tickets for many organizers and money is split to each organizer's account.

### 2.5 Protect the name
- [ ] Buy a domain: check **nikl.app**, **nikl.in**, **getnikl.com** at any registrar.
- [ ] Claim **@nikl** (or **@nikl.app** / **@niklbbsr**) on Instagram, X and YouTube.
- [ ] Ask a **trademark agent** to search and file "Nikl" at **IP India** in classes **9** (software), **41** (events) and **42** (online platform). E-filing is about ₹4,500 per class for startups and individuals, about ₹9,000 for other companies.

### 2.6 Legal review
- [ ] A lawyer reviews the **privacy notice** (DPDP Act), **terms**, **refund policy** and **organizer agreement**. Claude drafts first versions.
- [ ] Appoint a **grievance officer**; their contact goes in the app.

---

## 3. Before the beta (weeks 8–11)

| Task | Your steps | Then Claude |
|---|---|---|
| **Web hosting: Vercel** | vercel.com → sign up with GitHub → **Import** the repo → root directory `apps/web`. Commercial use needs the **Pro** plan; Hobby is non-commercial only. | Sets environment variables and configures preview/production deploys. |
| **App builds: Expo / EAS** | expo.dev → sign up → in a terminal run `npx eas-cli@latest login` and type your password. | Runs `eas init`, sets up build profiles and makes the first Android build. |
| **Google Play Console** | Create an **organisation** account (needs D-U-N-S), pay the one-time **$25**, complete identity checks, create the app "Nikl". | Drafts the store listing, Data safety answers and screenshots. |
| **Supabase staging + production** | Create `nikl-staging` and `nikl-prod` (Mumbai). Production on the **paid** plan. Add secrets in each project's settings. | Links the projects, runs migrations and sets up deploys. |
| **Sentry + PostHog** | Sign up (free tiers) and create projects. | Adds crash reporting and analytics. Sentry DSN and PostHog key are safe to share. |
| **Google Places API key** | Google Cloud Console → enable **Places API** → add billing → create a key restricted to your domain and app. | Adds venue search for organizers. |
| **AWS (image moderation)** | Create an AWS account (or choose another provider). | Connects image checks for user posts (week 5). |
| **Apple Developer** (for iOS, ~week 13) | Organisation account (needs D-U-N-S), **$99/year**. | Builds and submits to TestFlight and the App Store. |

## 4. Only you can do these

- [ ] **Test the prototype** with 10–15 students and 5 organizers: https://claude.ai/artifact/UbPm4BPf2FcFVg8JyzELv9 (share it from the page's Share menu first). Claude can write the test script and questions.
- [ ] **Line up 30–50 launch partners** (run clubs, studios, cafés, comedy and music collectives, trek groups, college clubs). Claude can write the pitch one-pager, WhatsApp/DM messages and an organizer FAQ.
- [ ] **Decide who builds:** a hired team as in DEV_PLAN §7, or mostly Claude with a smaller team.
- [ ] **Decide the open questions** in [DECISIONS.md](DECISIONS.md#open-questions), starting with payout timing and company structure.

## 5. What Claude can start right now, without waiting for you

| Work | Needs from you first |
|---|---|
| **Week 2 code:** clubs/venues/events data layer, organizer web dashboard (create/edit events, weekly repeats), server-rendered event and club pages, server-side login on the web | Nothing (testing it live needs 1.1 Docker) |
| **Profile set-up screen** (name, username, area, interests, 18+) | Nothing |
| **Poster-to-event function** (built and tested with a mock) | The Anthropic key (1.6) to run it for real |
| **Draft legal pages** for the website: privacy, terms, refund, contact | Nothing. A lawyer must review them. |
| **Organizer outreach kit** and **prototype test script** | Nothing |
| **App icon and splash screen** with the Nikl wordmark | Nothing |
| **First commit + private GitHub repo + CI** | Your go-ahead (1.3) |
| **End-to-end login test, database types, Supabase CLI upgrade** | Docker (1.1) |
