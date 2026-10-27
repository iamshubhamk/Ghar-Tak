# Plan — Web pivot: marketing site + admin panel

Status: **proposed** (2026-10-27). Owner: web. Needs the human's approval before any code is written.

## 1. Goal

`frontend/` stops being the customer/provider product and becomes:

1. A fast, bilingual **marketing/info site** that sends visitors to the Android app.
2. The **admin panel** (provider approvals, documents, categories, skill requests, bookings, reviews),
   kept on the web at a protected `/admin`. **Nothing in admin gets deleted.** ← *please confirm*

## 2. Where it stands today

- React 19 + Vite 5 + Tailwind 3. **No router**: `App.tsx` switches views with
  `useState<"home" | "customer-auth" | "provider-auth" | "login" | "dashboard">`.
- `RoleDashboard` renders the customer, provider or admin UI based on `user.role`.
- Admin UI: `MarketplaceAdminPanel.tsx` (1,166 lines), reached by logging in through `AuthPanel`
  (1,262 lines, which also does customer/provider registration and password reset).
- JWT in `localStorage` (`ghartak_token`). There are uncommitted changes on `dev` (location picker etc.)
  that need a decision before the pivot starts.

## 3. Target routes

| Route | What | Notes |
|---|---|---|
| `/` | Landing: hero, categories, how it works, trust/verification, testimonials, "Get the app" | Light page: no Leaflet, no framer-motion on first load. Target under 150 KB JS gzipped. Hindi/English toggle. |
| `/services/:slug` | One info page per category (electrician, plumber, …) | Good for local search ("electrician in Patna"). Every page has an install CTA. |
| `/partner` | "Become a GharTak partner": benefits, verification steps, install CTA | Replaces web provider registration. |
| `/install` | **Smart redirect** (see §4) | Link used in SMS, WhatsApp, posters and QR codes. |
| `/privacy`, `/terms` | Legal pages | **Required** for the Play listing. |
| `/delete-account` | How to delete an account + request form/link | **Required by Google Play** (a web URL for account deletion). Backend endpoint: mobile plan, MISSING #8. |
| `/support` | Contact, WhatsApp, FAQ | |
| `/admin/login` | Admin-only login form | Taken out of `AuthPanel`. Rejects non-admin roles. |
| `/admin/*` | Admin panel, protected | Guard: token present **and** `GET /auth/me` → `role === "ADMIN"`, otherwise redirect to `/admin/login`. Lazy-loaded chunk. `noindex`. |
| `/.well-known/assetlinks.json` | Android App Links | Lets `https://officialghartak.com/b/<id>` links open in the app. The file content comes from release (signing key SHA-256). |

Router: `react-router` (current major), in plain SPA mode. A framework or SSR isn't needed. If SEO becomes
important later, prerender the marketing routes at build time.

## 4. Install link and smart redirect

- **Android browsers** (UA contains `Android`): show a sticky "Get it on Google Play" bar on every
  marketing page. On `/install`, go straight to
  `https://play.google.com/store/apps/details?id=<package>&referrer=utm_source%3D<src>` and keep the UTM
  source from the incoming link.
- **iOS / desktop**: no redirect. Show a "Coming to iPhone soon" note on iOS, and a QR code + Play badge on
  desktop.
- **Don't auto-redirect `/`**. It annoys people who came to read, and it hurts search ranking.
- **Before the Play listing is live:** `/install` shows a "Launching soon — get notified on WhatsApp"
  card. Alternative: the Play closed-testing opt-in link. ← *open question*
- The Play URL and package name come from env (`VITE_PLAY_STORE_URL`), not hardcoded.

## 5. Keep / move / archive

| File(s) | Decision | Notes |
|---|---|---|
| `MarketplaceAdminPanel.tsx` | **Keep** → `src/admin/` | Split into per-tab files over time. No behaviour change in the first pass. |
| Admin parts of `RoleDashboard.tsx`, `NotificationPanel.tsx`, `NotificationPopover.tsx` | **Keep** → `src/admin/` | Admins still get notifications. |
| `AuthPanel.tsx` | **Extract** the admin login (and admin password reset if used) into `src/admin/AdminLogin.tsx`, then archive the rest | |
| `lib/api.ts`, `lib/config.ts`, `types/*` | **Keep** | Admin types will later move to generated types from `openapi.json`. |
| `PublicHome.tsx`, `HeroCarousel.tsx`, `ServiceCarousel.tsx`, `TrustSection.tsx`, `CategoryGrid.tsx`, `Header.tsx`, `lib/defaultServices.ts`, `static/*.png`, logo | **Keep, rework** for marketing | Remove cart, booking buttons and login. CTAs become "Get the app". Compress images (WebP). |
| `CustomerDashboard.tsx`, `BookingTracker.tsx`, `ServiceDrawer.tsx`, `DateTimePicker.tsx`, `LocationModal.tsx`, `LocationPickerMap.tsx` | **Archive** | Customer booking flow moves to the app. Leaflet and vaul leave the bundle. |
| `ProviderBookingsPanel.tsx`, `ProviderOnboardingPanel.tsx`, provider parts of `RoleDashboard.tsx` | **Archive** | Provider flow moves to the app. The admin "view provider documents" feature stays in admin. |

**How to archive:** tag `web-v1-full` on the commit before the pivot, then move the files to
`frontend/archive/`, outside `src/` and excluded from `tsconfig` and the build. They stay readable as
reference for the mobile team. Delete them once mobile M3 ships, with approval (Rule 11).

## 6. Order of work (admin never breaks)

1. Human decides about the uncommitted `dev` changes. Tag `web-v1-full`.
2. Add the router. Mount the **current** `App.tsx` unchanged at `/*`, so nothing changes yet.
3. Build `/admin/login` + `/admin/*` guard. Mount the admin panel there. Verify every admin action:
   approve/reject/disable provider, view Aadhaar/bank proof, categories CRUD, skill requests, assign
   booking, booking status, cash paid, hide/show reviews. qa-monitoring signs off.
4. Build the new landing, services, partner, install, legal, support and delete-account pages.
5. Swap `/` to the new landing. Archive the customer/provider components. Check bundle size.
6. Release workstream: hosting rewrites for SPA routes, `assetlinks.json`, env vars.

## 7. Risks and follow-ups

- **Live users:** if real customers or providers use the web app today, they need a notice period
  ("We've moved to the app") before step 5. ← *open question*
- **Admin token in `localStorage`** is open to XSS. Later: an httpOnly cookie session for admin (a
  backend change, Rule 11). Until then, add a strict CSP on `/admin`.
- **Demo admin credentials in `README.md`** (see release inbox OR-004). Remove them before the admin URL is
  advertised anywhere.
- Consider moving admin to `admin.officialghartak.com` later. The lazy-loaded `/admin` chunk keeps that easy.

## 8. Open questions for the human

1. Confirm: keep admin on the web at `/admin`, with nothing deleted?
2. Are there active real customers or providers on the web app today?
3. What should `/install` do before the app is on Play: WhatsApp waitlist, or closed-testing link?
4. Is the production domain `officialghartak.com` (as in `.env.example`) or still the Render URL?
