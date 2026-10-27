# Open questions for the human — batch 1 (2026-10-28)

Owner: architect (AR-001). Answer inline: write after `→`. The **Rec** line is the architect's
recommendation. Answering "rec" accepts it. Once these are answered, the architect sets ADRs 0003–0006 to
`accepted` (or revises them), re-sequences OR-001..OR-005 with acceptance criteria, and dispatches.

## Urgent (security, production)
- **Q-S1 Password reset is an account-takeover path.** `POST /auth/password-reset` accepts any matching
  email + phone pair, sets a new password and returns a login token. There's no OTP or link. Providers
  see customer phone numbers, and admin accounts are affected too. **Rec:** disable self-service reset
  in prod now (backend hotfix behind a flag; support/admin reset on request). Then fix it properly per
  ADR 0003 §8. OK to touch prod auth for this (Rule 11)? →
- **Q-S2 Demo admin login in `README.md`** (OR-004 #1). Does that account exist on the live site? **Rec:**
  rotate the prod admin password today and remove the README section. →
- **Q-S3 Skill-request proof documents are public** (`/uploads/...`, no auth). **Rec:** support confirms on
  the live site, then backend serves them through an authenticated route like Aadhaar. OK? →

## ADR approvals (`.coordination/decisions/`)
- **Q-A1** ADR 0003 refresh tokens (rotation, 60 s grace window for 3G retries, logout, revoke on
  password change/disable, access 60→15 min after clients adopt). Approve? →
- **Q-A2** Mobile session length: 30 days sliding, 90 days absolute, then log in again. OK? →
- **Q-A3** Admin web session: 12 hours absolute, no "remember me". OK? →
- **Q-A4** ADR 0004 one Android app with customer/provider modes, one role per account. Approve? →
- **Q-A5** ADR 0005 web → marketing site + `/admin`, nothing in admin deleted. Approve? →
- **Q-A6** ADR 0006 generated API types (openapi-typescript + openapi-fetch, committed, CI drift check).
  Approve? →

## Product
- **Q-P1 Booking flow in the app:** stay demand-first (customer requests a service, admin assigns a
  provider), as shipped in GT-BOOK-010? Customers wouldn't browse or choose providers in MVP. **Rec:** yes. →
- **Q-P2 Assignment response time:** what can admins promise, for example "a provider confirmed within
  2 hours, 8am–8pm"? It's shown to customers while they wait. →
- **Q-P3 Booking hours:** what happens to requests made at night? (Queue them with a notice /
  block them.) →

## Mobile (`docs/plans/mobile-app.md` §10)
- **Q-M1** Start fresh on the current Expo SDK and archive the old `mobile/` to `archive/mobile-v0/`
  (it moves files, Rule 11)? **Rec:** yes. →
- **Q-M2** Phone + OTP login at launch, or phone + password until after launch? SMS costs money:
  MSG91 ~₹0.15–0.25/SMS, or the Firebase free quota. **Rec:** password for launch, OTP after. →
- **Q-M3** Android package name `com.ghartak.app`? (It can never change after the first upload.) →
- **Q-M4** Do you have a Google Play developer account (US$25) and an Expo account? Whose name is it in
  (individual or organisation)? Play shows that name to users. →
- **Q-M5** Language: follow the device locale, with a choice on first launch (rec), or always start in Hindi? →
- **Q-M6** Can one person be both a customer and a provider? Today a phone number = one account =
  one role. **Rec:** not in MVP (they use another number). →
- **Q-M7** Registration: phone required, email optional (rec)? Many Patna users have no email. →

## Web (`docs/plans/web-pivot.md` §8)
- **Q-W1** Production domain: `officialghartak.com` (bought? DNS where?) or the Render URL for now? →
- **Q-W2** Are real customers or providers using the web app today? If yes, they get a notice period
  before the switch. →
- **Q-W3** What should `/install` do before the app is on Play: WhatsApp waitlist (rec) or the
  closed-testing opt-in link? WhatsApp number? →
- **Q-W4** Self-service password reset for admins: drop it (rec; admins reset via `seed_admin`/support)? →
- **Q-W5** The uncommitted `dev` changes (booking lat/long + web location picker): commit as they are,
  commit only the backend part, or discard? (The web parts get archived in the pivot anyway.) →
- **Q-W6** Admin features the API has but the panel lacks: status override, admin mark-cash-paid,
  review hide/show, category edit/enable, customer search. Build them right after the `/admin` move, or
  later? →

## Infrastructure (IN-001; ADRs follow once you answer)
- **Q-I1 Upload storage.** Today uploads (including Aadhaar scans) sit on Render's ephemeral disk and
  are **wiped on redeploy**. Options:
  - (a) Render paid persistent disk (~$7+/mo)
  - (b) S3-compatible storage, e.g. Cloudflare R2: free egress, a private bucket and signed URLs
  - (c) MongoDB GridFS

  **Rec:** (b) R2. →
- **Q-I2 Hosting.** Keep Render, defined in `render.yaml`. The free tier sleeps, so the first request can
  take ~30–60 s on 3G and the app's first launch breaks. **Rec:** paid starter for the API, Singapore
  region; the static site stays free. Monthly budget ceiling? →
- **Q-I3 MongoDB Atlas** tier/region. M0 free has no backups. **Rec:** M10 before real users, or at least
  a scheduled `mongodump` to R2. →
- **Q-I4 Environments:** prod only, or prod + staging (separate Atlas DB)? **Rec:** prod + staging
  before the app goes to closed testing. →
- **Q-I5 Error tracking / uptime:** Sentry free tier + a free uptime pinger (UptimeRobot/Better Stack)?
  OK to create those accounts? →
