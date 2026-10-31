# GharTak — phased development tickets

Status: **proposed** (2026-10-28). Owner: architect (AR-004). Needs the human's approval, one phase at a
time. **Phase 0 approved and dispatched 2026-10-29. Phase 1 + policies P-1..P-4 approved 2026-10-29 (P-2 changed to the ₹99 launch offer). ADRs 0003–0006 accepted.** **Phases 2–3: the human said to hold until Phase 1 is done and verified (2026-10-29).** **Direction change (AR-016, 2026-11-01): the human wants to continue mobile and hold the web app. Mobile design mockup published for review; Phase 2 and the mobile tickets of Phase 3 aren't dispatched until the human approves. Web tickets are on hold, except admin-only work (AR-017: T3-05 admin part, T4-09, T4-10, and admin follow-ups to backend changes).** **Phase 2 and T3-01..T3-04 approved and dispatched 2026-11-01 (AR-018..AR-020), before Phase 1 is fully verified, by the human's choice.**

## How to read this

- **Ticket ID** `T<phase>-<nn>` is a planning ID. When a ticket is dispatched, it becomes an inbox entry
  in the owning workstream and gets that workstream's change ID (`BE-…`, `MO-…`, …) when done.
- **Size:**
  - S = about one chat-session (≤1 day)
  - M = 2–3 days
  - L = about a week, and gets split before it starts
- **Depends on** lists other tickets, ADRs, or questions in `docs/plans/open-questions.md` (Q-…).
  A ticket is only dispatched when everything it depends on is done or approved.
- **Source** is where the work came from: a support bug (SU-…), a kickoff item (OR-…), an ADR or a plan.
- Inside a phase, tickets are listed in the order they should start. Tickets for different
  workstreams in the same phase can run in parallel.
- Every backend ticket includes tests (Rule 9). Every contract change includes the `openapi.json`
  re-export + an `API_CHANGES.md` section (Rule 6), and a deprecation path if it's breaking (Rule 7).
- Every ticket ends with `/handoff`. Support verifies it, and the architect closes it.

## Phase overview

| Phase | Goal | Main workstreams | Blocked by (your decisions) | Rough length |
|---|---|---|---|---|
| **0 — Stop the bleeding** | Close the live security holes | backend, infra, support | — (approved) | 1–3 days |
| **1 — Foundations** | Tests run, CI exists, files and data are safe, booking rules are correct | backend, infra, support | Q-W5, Q-I1–I4, policy calls P-1…P-4 below | 1–2 weeks |
| **2 — Platform for the app** | Login sessions, app config, Hindi data, typed contract | backend | ADRs 0003, 0006; Q-A2, Q-M7 | 1 week |
| **3 — App M1 + admin move** | First installable app (login + browse); admin at `/admin` | mobile, web | ADRs 0004, 0005; Q-M1, Q-M3–M5, Q-P1 | 2 weeks |
| **4 — Booking in the app (M2)** | Customers book and track; admin assigns; push on assignment | backend → mobile | Q-P2, Q-P3 | 2 weeks |
| **5 — Provider flow (M3) + admin backlog** | Providers onboard and work jobs in the app; admin gaps filled | backend → mobile, web | Q-W6 | 2 weeks |
| **6 — Reviews, push polish (M4) + marketing site** | Reviews in app; public site with install link and legal pages | mobile, web | Q-W1–W3 | 1–2 weeks |
| **7 — Play Store launch (M5)** | App live on Google Play | all | Q-M4, legal review (T7-05) | 2–3 weeks incl. Play review |

Phases 3 and later overlap: web can start Phase 3 while backend is still on Phase 2.

---

## Phase 0 — Stop the bleeding (approved and in progress)

**Background:** the live site has holes that let strangers into accounts and the admin panel. Nothing
else matters until these are closed. Approved by you on 2026-10-28.

| ID | Ticket | Owner | Depends on | Size | Done when | Source | State |
|---|---|---|---|---|---|---|---|
| T0-01 | Disable self-service password reset | backend | — | S | Both reset endpoints return 403 `PASSWORD_RESET_DISABLED` | SU-002, AR-002 | ✅ done, 8/8 tests verified by architect (`9353c78`) |
| T0-02 | Rotate prod admin password; remove demo login from README | infra + **you** | — | S | The old password no longer logs in; README has no credentials | OR-004, AR-003 | README done (`3b0c258`); rotation waiting on you |
| T0-03 | Deploy T0-01 to prod | infra | T0-01 | S | Prod returns 403 on reset | AR-003 | waiting for the branch/deploy OK from you |
| T0-04 | Verify T0-01..03 on prod | support | T0-03 | S | Support report in the architect inbox | AR-002 | waiting |
| T0-05 | Lock down uploads: allow-list jpg/png/webp/pdf, magic-byte check, size cap, server-chosen extension. Skill proofs move to private storage behind an admin-only route | backend | — | M | An HTML file disguised as an image is rejected; an admin can open a skill proof and the public cannot | SU-008 | ✅ BE-003 (154 tests verified); deploy pending |
| T0-06 | Refuse to start outside `local` when `JWT_SECRET_KEY` is the default; confirm prod has a strong secret | backend + infra | — | S | App exits with a clear error on the default secret; infra confirms the prod value is set | SU-009 #7 | ✅ BE-004; prod secret check pending |

---

## Phase 1 — Foundations

**Background:** today the backend's tests can't run, there's no CI, uploaded Aadhaar scans are wiped on
every redeploy, and there are no database backups. On top of this, the booking rules have bugs (admins
can reopen finished jobs, two people can "win" the same booking, prices come from the phone). Fixing this
first means everything after it is built on tested, safe ground.

### 1a. Backend health
| ID | Ticket | Owner | Depends on | Size | Done when | Source |
|---|---|---|---|---|---|---|
| T1-01 | Make the test suite run on MongoDB (fixtures, `email-validator`, `requirements-dev.txt`) | backend | — | M | `pytest` runs green on a clean install | OR-001 #1–2 (✅ BE-002, 114 tests verified by architect) |
| T1-02 | Remove dead SQLAlchemy code and stray root scripts | backend | T1-01 | S | No imports of missing modules; `drop_cat.py`/`test_cat.py` gone (deleting files → your OK, Rule 11) | OR-001 #3, #5 |
| T1-03 | Decide what happens to the uncommitted `dev` changes (booking lat/long + web map picker) | **you** → backend/web | Q-W5 | S | Committed or discarded; backend and web know which | OR-001 #9 |

### 1b. Booking rules correct
| ID | Ticket | Owner | Depends on | Size | Done when | Source |
|---|---|---|---|---|---|---|
| T1-04 | One central transition table for all actors (customer, provider, admin); admin override limited to allowed targets; `/in_progress` kept as a deprecated alias of `/start` | backend | T1-01 | M | Support's status × action grid (test plan §1.4–1.5) passes | SU-003, OR-001 #6 |
| T1-05 | Atomic transitions (compare-and-set on the current status; the loser gets 409) | backend | T1-04 | S | Concurrency test §1.8 passes | SU-007 |
| T1-06 | Unverified providers can't act on bookings; reject/disable sends their open bookings back to the admin queue (policy P-1) | backend | T1-04 | M | Test plan §1.3 rows P3/P4 pass | SU-005 |
| T1-07 | Providers can't change their own categories (only through a skill request); resubmit validates category names | backend | T1-01 | S | Test plan §3.3 rows 3–4 pass; deprecation note for the field | SU-006 |
| T1-08 | Server-side booking amounts (policy P-2, ₹99 visit offer): ignore client totals; ₹99 from settings; provider enters extra ≥ 0 at completion | backend | T1-01 | S | Negative or forged totals rejected or ignored | SU-004 |
| T1-09 | Small fixes batch: start-OTP attempt limit, timezone handling, idempotent cash-paid, `$regex` escaping, ON_THE_WAY counted as open, notify the old provider on reassign, provider "release job" and customer cancel while on the way (policies P-3, P-4) | backend | T1-04 | M | Each item has a test from the test plan | SU-009 |

### 1c. Infrastructure
| ID | Ticket | Owner | Depends on | Size | Done when | Source |
|---|---|---|---|---|---|---|
| T1-10 | Local dev on MongoDB (`docker-compose`), separate local and prod `.env.example` | infra | — | S | `docker compose up` gives a working local API | OR-004 #3–4 |
| T1-11 | CI on GitHub Actions: ruff, pytest, frontend lint + build, `openapi.json` drift check | infra | T1-01 | M | Every PR shows green/red checks; pytest blocks once T1-01 is done | OR-004 #2, ADR 0006 |
| T1-12 | `render.yaml` Blueprint (API + static site); **free tier for now** (Q-I2), Singapore region; paid tier revisited before the Play launch | infra | Q-I2 | S | Deploys are reproducible from git | IN-001 |
| T1-13 | Permanent file storage (Q-I1, recommended Cloudflare R2): private bucket, signed URLs, migrate existing files | infra + backend | Q-I1, T0-05 | M | Files survive a redeploy; Aadhaar only through signed admin URLs | IN-001 |
| T1-14 | Daily `mongodump` to R2 (Q-I3) + a free staging DB (Q-I4) | infra | Q-I3, Q-I4 | M | A restore test succeeds; staging has its own DB | IN-001 |
| T1-15 | Error tracking (Sentry free) + uptime monitor + structured request logs | infra + support | Q-I5 | S | Alerts reach you on error spikes or downtime | OR-005 |
| T1-16 | Automated API tests for the booking lifecycle and auth, run in CI | support | T1-01, T1-11 | M | Test plan §1–2 automated | OR-005 |

---

## Phase 2 — Platform for the app (backend)

**Background:** the Android app needs things the backend doesn't have: staying logged in for weeks, a
way to force old app versions to update, Hindi category names, and a complete API contract so the app's
code can be generated from it.

| ID | Ticket | Owner | Depends on | Size | Done when | Source |
|---|---|---|---|---|---|---|
| T2-01 | Refresh tokens + logout + revoke on password change/disable (access token stays 60 min for now) | backend | ADR 0003, Q-A2, Q-A3, T1-01 | M | Test list in ADR 0003 passes | ADR 0003 |
| T2-02 | Real password reset with a one-time code (email; SMS if Q-M2 says so), attempt limits, min length 8; then switch the flag back on | backend | T2-01, Q-M2 | M | Reset needs the code; no account-existence leak | SU-002, ADR 0003 §8 |
| T2-03 | Rate limits on login, refresh and reset | backend | T2-01 | S | Burst tests get 429 | ADR 0003 §9 |
| T2-04 | `GET /app/config` (min/latest version, Play URL, support phone, expected assignment time, flags) | backend | ADR 0004, Q-P2 | S | Public endpoint, values from settings | ADR 0004 |
| T2-05 | Hindi + English category names (`names: {en, hi}`), seed data translated | backend | ADR 0004 | S | `GET /categories` returns both | mobile plan #3 |
| T2-06 | Phone-first registration (email optional) | backend | Q-M7 | S | Register works with phone only | MO-001 #4 |
| T2-07 | Complete contract: every route has a response model and `operation_id`; named error schema; enums exported | backend | ADR 0006 | M | No untyped routes in `openapi.json` | ADR 0006 |
| T2-08 | One error format, rolled out the Rule 7 way (old shape kept for one release) | backend | T2-07 | M | Both shapes documented; web migrates in T3-05 | mobile plan #9 |

---

## Phase 3 — App M1 (login + browse) and admin move

**Background:** the first installable Android build (shared with testers, not on Play yet), and the web
admin panel moved safely to `/admin` before the website changes.

| ID | Ticket | Owner | Depends on | Size | Done when | Source |
|---|---|---|---|---|---|---|
| T3-01 | Archive the old `mobile/` app (tag `mobile-v0`); start a fresh Expo project: router, theme, i18n hi/en, secure-store, generated API client | mobile | ADR 0004, Q-M1, Q-M3, Q-M5 | M | App boots in Hindi or English on a low-end phone | mobile plan |
| T3-02 | Login, register (customer/provider), session restore, refresh on 401, logout, admin "use the web" screen | mobile | T3-01, T2-01, T2-06 | M | A session survives an app restart and token expiry | ADR 0003/0004 |
| T3-03 | Home → service → service info screens; force-update gate; offline banner | mobile | T3-01, T2-04, T2-05 | M | Works on throttled 3G; old builds get blocked | ADR 0004 |
| T3-04 | EAS build profiles (dev/preview/prod), internal test APK | infra | T3-01, Q-M4 | S | Testers install the APK from a link | OR-004 #5 |
| T3-05 | Web: add the router, mount today's app unchanged, then the `/admin` login + guard + own admin shell; admin uses refresh tokens and generated types | web | ADR 0005, T2-01, T1-03 | L (split in 2) | Support signs off every current admin action at `/admin` | web plan steps 1–3 |
| T3-06 | Support sign-off checklist for admin and M1 on real low-end devices | support | T3-02, T3-03, T3-05 | S | Report in the architect inbox | OR-005 |

---

## Phase 4 — Booking in the app (M2)

**Background:** the core loop is: customer requests → admin assigns → provider accepts → customer sees
it. Because admins assign by hand, a push notification on assignment is part of the MVP.

| ID | Ticket | Owner | Depends on | Size | Done when | Source |
|---|---|---|---|---|---|---|
| T4-01 | `GET /bookings/{id}` (customer, assigned provider, admin) + `status_history[]` with timestamps | backend | T1-04 | S | A timeline can be drawn from server data | mobile plan #4, MO-001 #6 |
| T4-02 | Pagination on bookings, providers and notifications lists (old behaviour stays the default) | backend | T2-07 | S | `limit`/`cursor` work; old clients unaffected | mobile plan #5 |
| T4-03 | `PATCH /customer/me` (name, phone, locality) + `preferred_language` | backend | T2-01 | S | Profile edits saved | mobile plan #6 |
| T4-04 | Localised push on assignment and every status change; prune dead tokens; remove the token on logout | backend + infra (Expo token) | T4-03 | M | A push arrives in the user's language within ~10 s | ADR 0004 §9 |
| T4-05 | App: addresses, booking request form, "Awaiting assignment" with expected time, my bookings, booking detail + timeline + start OTP, cancel | mobile | T4-01, T4-02, T3-02 | L (split in 2) | A customer can book and follow every status | mobile plan M2 |
| T4-06 | App: push registration + tap → opens the booking | mobile | T4-04, T4-05 | S | Tapping a push opens the right booking | ADR 0004 |
| T4-08 | Idempotency key on booking creation, so a retry on patchy 3G can't create a duplicate | backend | T1-05 | S | Same key twice creates one booking | test plan §6 Q6 |
| T4-09 | Admin alerts for new requests: browser Web Push (works on phone Chrome without an app, free), plus an in-panel sound while it's open; alert again when a job passes 30 min | backend + web | T4-04 | M | An admin gets an alert within ~10 s with the panel closed, and again at 30 min | human, AR-017 |
| T4-10 | Admin job queue that works on a phone: only jobs needing a provider first, waiting time per job, count in the header, call buttons, availability shown when picking a provider | web | T3-05, T4-01 | M | Matches the mockup; a job can be assigned from a phone browser | human, AR-017 |
| T4-07 | Lifecycle tests on the app build + 3G checks | support | T4-05 | M | Test plan §4 checks pass | OR-005 |

---

## Phase 5 — Provider flow (M3) and admin backlog

**Background:** providers move from the website to the app. Admin gets the missing tools the web review
found.

| ID | Ticket | Owner | Depends on | Size | Done when | Source |
|---|---|---|---|---|---|---|
| T5-01 | App: provider registration + document upload + "pending verification" screen + resubmit | mobile | T3-02, T1-13 | M | A provider gets verified end to end | mobile plan M3 |
| T5-02 | App: jobs list, accept/reject/on-the-way/start (OTP)/complete/cash-paid, release job, availability toggle, skill requests | mobile | T5-01, T1-09 | L (split in 2) | A full job runs on two phones | mobile plan M3 |
| T5-03 | Push to providers on new assignment (admin alerts moved to T4-09) | backend | T4-04 | S | Providers notified in real time | MO-001 #2 |
| T5-04 | Admin backlog: status override (allowed targets only), mark cash paid, hide/show reviews, category edit/enable, customer search | web | T3-05, T1-04, Q-W6 | M | Each action works in `/admin` | web gap review |
| T5-05 | Provider earnings summary (computed in the app first; endpoint optional) | mobile | T5-02 | S | Earnings by week/month shown | mobile plan #11 |

---

## Phase 6 — Reviews, push polish (M4) and marketing site

**Background:** customers can rate providers in the app. The website becomes the public face that sends
people to the app. Google Play requires the privacy, terms and account-deletion pages.

| ID | Ticket | Owner | Depends on | Size | Done when | Source |
|---|---|---|---|---|---|---|
| T6-01 | App: leave a review, provider reviews list, notification centre | mobile | T4-05 | M | Reviews appear on the provider | mobile plan M4 |
| T6-02 | Web: landing page, service pages, partner page, support page (Hindi/English, under 150 KB JS) | web | T3-05, Q-W1 | L (split in 2) | Lighthouse mobile ≥ 90 | ADR 0005 |
| T6-03 | Web: `/install` smart link + `/privacy`, `/terms`, `/delete-account` | web | T6-02, Q-W3 | M | Play listing URLs work | ADR 0005 |
| T6-04 | Web: swap `/` to the new landing and archive the customer/provider web screens (notice period if Q-W2 = yes) | web | T6-02, T5-02 | S | Bundle-size check passes; admin unaffected | web plan step 5 |
| T6-05 | Domain, DNS, SPA rewrites, `assetlinks.json` | infra | Q-W1, T3-04 | S | App links open the app | web plan step 6 |

---

## Phase 7 — Play Store launch (M5)

**Background:** Google Play has hard requirements (account deletion, data-safety form, privacy policy),
and the app handles Aadhaar, which Indian law restricts. Closed testing comes before production.

| ID | Ticket | Owner | Depends on | Size | Done when | Source |
|---|---|---|---|---|---|---|
| T7-01 | Account deletion endpoint (revokes sessions, anonymises bookings, deletes documents) | backend | T2-01, T1-13 | M | Deleted users can't log in; documents gone | mobile plan #8 |
| T7-02 | App: delete-account screen; Sentry in the app; crash-free monitoring | mobile | T7-01, T1-15 | S | Matches the Play policy | mobile plan M5 |
| T7-03 | Aadhaar handling: store a masked copy, explicit consent text, retention period | backend + mobile | T1-13, T7-05 | M | No full Aadhaar number stored or shown | architect addition |
| T7-04 | Product analytics (installs → sign-ups → bookings → completed) with a free tool | mobile + web | T4-05 | S | Funnel visible in a dashboard | architect addition |
| T7-05 | Legal review: privacy policy, terms, Aadhaar/DPDP consent wording | **you** (lawyer or template) | — | — | Approved texts in `docs/legal/` | architect addition |
| T7-06 | Signing, store listing (hi/en screenshots), data-safety form, internal → closed → production tracks | infra + **you** | T7-02, T7-05, Q-M4 | L | App live on Play; crash-free sessions above 99% in closed testing | mobile plan M5 |

---

## Policy calls the architect proposes (approve together with Phase 1)

| # | Question (from support) | Proposal |
|---|---|---|
| P-1 | A provider is rejected, disabled or resubmits while holding bookings (SU-005) | They can't act on any booking (403). Their REQUESTED/ACCEPTED/ON_THE_WAY bookings go back to the admin queue (unassigned REQUESTED), and the customer and admin are notified. IN_PROGRESS stays put for the admin to resolve by hand. |
| P-2 | No price list exists (SU-004; categories only have a text `price_label`) | **Changed by the human (2026-10-29): ₹99 launch offer.** Every booking has a **₹99 visit charge** (server-set from a setting, never from the client). Parts or extra work are quoted on site; the provider enters the extra amount at completion/cash-paid (≥ 0, with a short note). The total shown is ₹99 + extra. The offer price and an end date live in settings / `/app/config`, so it can change without an app release. |
| P-3 | Provider cancel after accepting (SU-009 #4) | No CANCELLED_BY_PROVIDER. Add "release job": ACCEPTED/ON_THE_WAY → back to the admin queue with a reason, admin notified. The customer still needs the service, so cancelling is the wrong outcome in a demand-first model. |
| P-4 | Customer cancel while the provider is on the way (SU-009 #5) | Allowed until the job starts. The provider is notified. Repeated late cancels are tracked for later (no penalty in MVP). |

## Not planned yet (needs a product decision first)

- Online payments (UPI) and provider payouts. Cash only until then.
- Business model: commission vs subscription. This affects booking amounts and admin reports.
- iPhone app.
- Provider time-slot scheduling (an on/off toggle only for MVP).
- Phone OTP login (Q-M2).
