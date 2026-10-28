# 0005 — The web becomes a marketing site, with the admin panel at `/admin`

Status: accepted (human, 2026-10-29)
Date: 2026-10-28 | Author: architect (AR-001)
Plan: `docs/plans/web-pivot.md`

## Context
- `frontend/` is a React 19 + Vite SPA without a router (`useState` view switching). It serves
  customers, providers and admins from one bundle. The admin UI is `MarketplaceAdminPanel.tsx`
  (1,166 lines), reached through the shared `AuthPanel`.
- The customer and provider flows move to the Android app (ADR 0004). Admins have no app and need the
  web.
- Google Play needs public privacy, terms and account-deletion URLs.
- The live demo admin login is published in `README.md` (OR-004).

## Decision
1. **One SPA, two areas, split by route** with `react-router` in plain SPA mode. There's no SSR or
   framework. Marketing routes can be prerendered at build time later if SEO needs it.
   - **Marketing (public, indexed):** `/`, `/services/:slug`, `/partner`, `/install`, `/support`,
     `/privacy`, `/terms`, `/delete-account`, `/.well-known/assetlinks.json`. Hindi/English. Target
     under 150 KB of JS (gzipped) on first load. No Leaflet or framer-motion on the landing page.
   - **Admin (private):** `/admin/login` and `/admin/*`. It's a lazy-loaded chunk with `noindex`, a
     strict CSP and no third-party scripts.
2. **The admin guard is server-checked:** a token must be present **and** `GET /auth/me` must return
   `role === "ADMIN"`. Otherwise the user goes to `/admin/login`. `/admin/login` rejects non-admin
   accounts on the client. The backend already enforces `require_roles(ADMIN)` on every `/admin/*`
   endpoint, which is the real control. Admin uses refresh tokens with `X-Client: admin_web`
   (12 hours, ADR 0003).
3. **Nothing in admin is deleted or changed in behaviour during the pivot.** The order of work keeps
   admin working at every step:
   1. Tag `web-v1-full`.
   2. Add the router and mount the current `App` at `/*` unchanged.
   3. Mount admin at `/admin`. Support signs off every admin action.
   4. Build the marketing pages.
   5. Swap `/` and archive the customer/provider components to `frontend/archive/` (outside the build).
      Delete them after mobile M3, with approval.
4. **`/install` smart link:**
   - Android user agent → Play Store URL with the UTM source kept.
   - iOS → a "coming soon" note.
   - Desktop → QR code + Play badge.
   - `/` never auto-redirects.
   - The Play URL and package name come from env.
   - Behaviour before launch depends on Q-W3.
5. **First-pass admin scope is the panel as it is today**, based on web's gap review (2026-10-28):
   - Overview, providers (approve with guardrail, reject with reason, documents and bank KYC),
     categories (create and list), skill requests, and booking assign/reassign.
   - The admin shell: session bar, notifications, logout.

   Support signs off against that list. Features the API has but the UI lacks are **not** part of the
   move. They go to a separate admin backlog, and their order is decided by Q-W6:
   - booking status override
   - admin mark-cash-paid
   - review hide/show
   - category edit/enable
   - customer search

   `/admin` uses its own token key, so it never overwrites a customer session.
6. **Hosting stays a static SPA** (Render static site or similar, owned by infrastructure), with SPA
   rewrites. `admin.<domain>` stays possible later because admin is already its own chunk and route
   tree.

## Consequences
- \+ Customers and providers get one product (the app). The web becomes small, fast and good for local
  search. Admin keeps working throughout.
- − Any real customers or providers on the web lose it at step 5. They need a notice period if they exist
  (Q-W2).
- − The admin token is still in browser storage (XSS). Mitigations: CSP, short lifetime, no third-party
  scripts on `/admin`. An httpOnly cookie session is a future ADR.
- Blocker before `/admin` is advertised anywhere: rotate the demo admin password and remove it from
  `README.md` (OR-004 item 1, a prod change, Rule 11).
- Security found in the review: skill-request proof documents are served from public `/uploads/...`
  with no auth. Aadhaar and bank proof go through authenticated routes. Proof documents need the same
  treatment. Support confirms it, then backend fixes it. This ties in with the upload-storage ADR
  (IN-001).
- The admin panel polls 6 endpoints every 3.5 s. That's fine for 1–2 admins. Revisit when push to
  admins exists.
- The uncommitted `dev` frontend changes (location picker etc.) touch files that get archived in
  step 5. The human decides whether to commit them first (Q-W5).

## Notes on acceptance (2026-10-29)
- Domain `officialghartak.com`. No real web users today, so no notice period before the switch.
- `/install` before launch: WhatsApp waitlist (number to be supplied).
- Admin gap features are built right after the `/admin` move (Phase 5).
