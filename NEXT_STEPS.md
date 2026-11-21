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

## 1. This week: unblocks development (about 45 minutes in total)

### 1.1 Install Docker Desktop (15 min) — *needed to run the database on your PC*
- [ ] Download **Docker Desktop for Windows** from docker.com (Products → Docker Desktop).
- [ ] Run the installer and keep **"Use WSL 2"** ticked. Restart if asked.
- [ ] Open Docker Desktop once and wait until it shows **Engine running**.
- [ ] Tell Claude **"Docker is installed"**.

Claude then: starts the local database, fills in the local env files, tests phone login end to end on the web, and generates the database types.
*Docker Desktop is free for personal use and small businesses (under 250 employees and under $10M revenue).*

### 1.2 Try the app on your phone (5 min) — *optional but recommended*
- [ ] Install **Expo Go** from the Play Store on your Android phone.
- [ ] Keep the phone on the same Wi-Fi as your PC.
- [ ] When Claude starts the mobile dev server, scan the QR code with Expo Go.

### 1.3 GitHub repository (2 min)
- [ ] Decide where the code lives:
  - **Your personal account** (simplest), or
  - **A free organization** (better once others join): github.com → **+** → **New organization** → Free → name it, e.g. `nikl-app`.
- [ ] Tell Claude **"create a private repo under ___"**. Claude creates it, makes the first commit, pushes, and CI runs.

### 1.4 Supabase project for development (10 min)
- [ ] Go to **supabase.com** → Sign up (GitHub login is fine).
- [ ] Create an organization called **Nikl**.
- [ ] **New project** → name `nikl-dev` → region **South Asia (Mumbai)** → generate a strong database password and **save it in your password manager**.
- [ ] Wait about 2 minutes for it to start. Open **Project Settings → API Keys** (or **Data API**).
- [ ] Send Claude the **Project URL** and the **publishable key**. **Don't** send the secret/service_role key or the database password.

*The free plan pauses projects after about a week of no activity, which is fine for development. Production will need the paid plan.*

### 1.5 Mapbox token (5 min) — *for the map in week 3*
- [ ] **account.mapbox.com** → Sign up. It may ask for a card; the free tier covers development.
- [ ] Open **Tokens** and copy the **Default public token** (starts with `pk.`).
- [ ] Send it to Claude (public tokens are safe to share).

### 1.6 Anthropic API key (10 min) — *for "create event from poster" in week 2*
- [ ] **console.anthropic.com** → Sign up → **Billing**: add a small amount of credit.
- [ ] **API Keys** → **Create key** → name it `nikl-dev` → save it in your password manager.
- [ ] **Don't paste it in chat.** When the poster function is ready, Claude gives you the one command to store it as a Supabase secret.

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
