# Inbox — architect

Entries addressed to the Architect: new requirements, bug reports from support, decisions needed, and
`info` entries from every `/handoff`. Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [IN PROGRESS] OR-006 — Take over coordination: review the plans, settle the open questions
From: human | Date: 2026-10-28 | Priority: normal
What changed: The workspace now has 6 chats (architect, backend, mobile, web, infrastructure, support).
You replace the setup session as the design owner and dispatcher. State today:
- Kickoff items OR-001 (backend), OR-002 (mobile), OR-003 (web), OR-004 (infrastructure), OR-005 (support)
  are OPEN. They were written before the restructure.
- Plans `docs/plans/mobile-app.md` and `docs/plans/web-pivot.md` are **proposed**, not approved. Each ends
  with open questions for the human.
- Security: `README.md` publishes the live demo admin login (OR-004 item 1).
Why: Requirements and bug fixes should flow through one design owner.
Action needed in this workstream: Read both plans and all kickoff items. Turn the big decisions into ADRs
(e.g. refresh-token auth, one app with role modes, web pivot + /admin, type generation from openapi.json).
Put the open questions to the human in one batch. Once the human approves, re-sequence the kickoff items
with acceptance criteria. Mobile M1 depends on backend #1–#3 in the mobile plan.
Contract ref: contracts/API_CHANGES.md#baseline

## [IN PROGRESS] MO-001 — Mobile plan review: architecture points to settle before approval
From: mobile | Date: 2026-10-28 | Priority: normal
What changed: Nothing in code. Mobile reviewed `docs/plans/mobile-app.md` against the contract, backend
code and phase-7 docs. Points below are architecture-level; mobile-only fixes stay in the plan.
Why: Some plan assumptions don't match the product as built. Better to fix them before ADRs/approval.
Action needed in this workstream: Decide/ADR items 1–5, then fold into the batch for the human.
1. **Booking flow contradicts GT-BOOK-010.** The plan's customer flow is category → provider list →
   provider profile → book. The shipped product decision (`docs/phase-7-p0-admin-assigned-bookings.md`)
   is demand-first: customer picks a service, admin assigns a provider; `provider_id` is optional in
   `BookingCreateRequest`. Decide which the app does. Mobile's proposal: follow GT-BOOK-010 for MVP —
   Home → service → request form → "Awaiting assignment"; provider browsing/profile becomes read-only
   trust content or is dropped from M1. That also moves `/providers` out of M1 and makes "awaiting
   assignment" a first-class state in the tracker.
2. **Admin assignment latency is now the core UX.** If admins assign by hand, the customer needs an
   expected-response time and a push when assigned. Push on assignment should be M2, not M4.
3. **Push is already half-built, the plan says it isn't.** `NotificationService.send_expo_push` already
   posts to Expo on notify. Gaps: no Expo access token, no receipt check / pruning of
   `DeviceNotRegistered` tokens, no token removal on logout, and titles/bodies are English-only (Rule 16 —
   needs per-user language stored server-side or a template key + params the app localises). Needs a
   decision on where push text gets localised.
4. **Login identifier.** GT-AUTH-007 made web login email-only; the contract `LoginRequest` accepts
   email or phone. For Patna users, phone should be the primary identifier in the app (many have no
   email). Confirm phone+password is supported end to end, and whether registration still requires email.
5. **Start-OTP security.** OTP is 4 digits, never rotates, no attempt limit visible on `/start`. Low risk
   but it's the only proof the provider is on site; worth a rate limit (support/backend, not mobile).
6. Minor contract notes (for backend later, no decision needed): `/in_progress` and `/start` duplicate;
   `BookingResponse` has no status history/timestamps, so a "status timeline" can't be drawn from server
   data — needs `status_history[]` or the tracker shows current status only; `GET /providers/{id}/adhaar`
   and `/bank-proof` are under the public `/providers` path — check they're admin-only.
7. Plan housekeeping I'll fix myself once approved: it names `qa-monitoring`/`release` (now support/
   infrastructure); Expo SDK version must be re-checked against current at start; earnings screen and
   wallet stay out of MVP.
Contract ref: none

## [IN PROGRESS] IN-001 — Infra decisions needed: upload storage, Render Blueprint, CI gates, envs
From: infrastructure | Date: 2026-10-28 | Priority: normal
What changed: Nothing yet. This is a proposal (answers OR-004 items 2–4). Full plan:
side-session notes `infrastructure-IN-001-plan.md`. A copy will go in `docs/release/infra-baseline.md` once approved.
Why: We need a reproducible pipeline before the Android app ships. Discovery also found two real risks:
- **Uploads live on Render's ephemeral disk.** Profile photos and Aadhaar scans (`uploads/private`) are
  wiped on every deploy or restart unless the service has a paid persistent disk. `S3FileStorageService` is a stub.
- **The backend tests can't run.** `tests/conftest.py` imports `sqlalchemy` and `app.db.base`
  (a leftover from Postgres), so pytest fails during collection.
Action needed in this workstream: decide (ADR where it says so):
1. ADR — upload storage: (a) Render persistent disk on a paid instance (simplest, single instance, ~$7+/mo),
   (b) S3-compatible object storage, e.g. Cloudflare R2 (free egress) or AWS S3 ap-south-1, through the
   existing storage adapter, with private bucket + signed URLs for Aadhaar (recommended: survives scaling, keeps
   KYC docs off the app box), or (c) MongoDB GridFS (no new vendor, but bloats the DB).
2. ADR — hosting: keep Render, managed by `render.yaml` Blueprint (API web service + static site). Confirm the
   plan tier (free tier sleeps → slow first request on 3G and breaks the mobile app's first launch) and region
   (Singapore is the closest Render region to Patna).
3. MongoDB: confirm Atlas tier/region (M0 free has no backups; recommend M10 or at least a scheduled
   `mongodump` before real users) and a separate database/user for staging/previews.
4. Environments: prod only, or prod + staging (staging = Render preview env + separate Atlas DB)?
5. Secrets strategy: Render dashboard env vars (`sync: false` in render.yaml), GitHub Actions secrets for CI,
   EAS secrets for mobile. Nothing goes in git.
6. CI gates: confirm the proposed blocking set (ruff, frontend lint+build, mobile tsc, openapi.json drift check;
   pytest report-only until backend rewrites the suite for Mongo), and dispatch the test rewrite +
   `requirements-dev.txt` split to backend and a `typecheck` script to mobile.
7. README demo credentials (OR-004 #1): raised with the human. Please dispatch removal of that README
   section to whoever owns README.md.
Contract ref: none

---

## [IN PROGRESS] SU-002 — BUG S1: password reset needs only email + phone → account takeover (any role, incl. admin)
From: support | Date: 2026-10-28 | Priority: breaking
Severity: S1 auth
What changed: Found while writing the auth section of `docs/qa/test-plan.md` (SU-001). Code read only, not run
(backend tests blocked on OR-001).
Repro steps: 1) Know a victim's email + phone. Provider phones are public (`GET /providers` serializes `phone`,
`services/providers.py:490`); assigned providers see the customer's email + phone in every booking response
(`services/bookings.py:463-464`). 2) `POST /api/v1/auth/password-reset` `{email, phone, new_password}`.
Expected vs actual: Expected: reset only after proving control of the email/phone (OTP or emailed one-time
token). Actual: password is replaced and a fresh access token for the victim is returned.
Root cause (file:line): `backend/app/services/auth.py:404-451` (`reset_password`) — no secret/OTP check; `/verify`
(`auth.py:369-402`) is not a prerequisite and also leaks account existence (404 vs 200). New password min length
6 (`schemas/auth.py` `PasswordResetSubmitRequest`) vs 8 at registration.
Suggested fix + owning workstream: backend — immediately disable or gate `/auth/password-reset` until a real flow
exists; then one-time code (SMS/email, short TTL, attempt limit, stored hashed) → reset; same response for
known/unknown accounts; min length 8; ❓ invalidate existing tokens (token_version on user). Changes auth
(Rule 11 → human approval) and the web/mobile reset screens.
Test that will prove the fix: `tests/test_auth.py::test_reset_without_code_is_rejected`,
`::test_reset_with_wrong_code_is_rejected`, `::test_verify_does_not_enumerate` (test-plan §2.3).
Contract ref: none

---

## [OPEN] SU-003 — BUG S2: admin status endpoint skips the state machine (any status → any status)
From: support | Date: 2026-10-28 | Priority: normal
Severity: S2 broken flow
Repro steps: Booking in COMPLETED (or CANCELLED_BY_CUSTOMER) → `PATCH /admin/bookings/{id}/status {"status":"REQUESTED"}`.
Also REQUESTED → IN_PROGRESS (skips accept + start OTP), unassigned REQUESTED → ACCEPTED, admin → CANCELLED_BY_CUSTOMER.
Expected vs actual: Expected (FSD §5): admin only sets CANCELLED_BY_ADMIN (from REQUESTED/ACCEPTED/IN_PROGRESS,
❓ ON_THE_WAY) and COMPLETED (from IN_PROGRESS). Actual: every target accepted; terminal bookings reopen; history
and payment state become inconsistent. Violates Rule 8 (transitions enforced on backend).
Root cause (file:line): `backend/app/services/bookings.py:307-327` — calls `_transition` with no from/to check.
Suggested fix + owning workstream: backend — an `admin_transitions` table like `provider_transitions`, 422
`BOOKING_INVALID_STATUS` otherwise; ideally one central transition table for all actors. Web admin panel should
offer only allowed targets.
Test that will prove the fix: parametrised 10×9 grid in test-plan §1.5.
Contract ref: none

---

## [OPEN] SU-004 — BUG S2: booking prices come from the client
From: support | Date: 2026-10-28 | Priority: normal
Severity: S2 (money)
Repro steps: `POST /bookings` with `items:[{"id":"x","name":"Tap repair","price":-500,"quantity":1}]` or with
`total_amount: 1`.
Expected vs actual: Expected: server computes prices from a catalogue; negative values rejected. Actual:
`total_amount` and `final_amount` stored exactly as sent; `BookingItem.price` has no lower bound.
Root cause (file:line): `backend/app/services/bookings.py:83-92`, `backend/app/schemas/booking.py:10-14`
(`BookingItem`), `:31-34` (subtotal/platform_fee/discount/total trusted).
Suggested fix + owning workstream: backend — look up item prices server-side, recompute subtotal/fee/total,
`price ge=0`, `quantity ge=1`. ❓ architect: is there a price catalogue yet? If not, at least bounds and treat
`total_amount` as an estimate. Cash-only today, so impact is disputes rather than lost card payments.
Test that will prove the fix: `test_bookings.py::test_create_ignores_client_total`, `::test_negative_price_rejected`.
Contract ref: none

---

## [OPEN] SU-005 — BUG S2: provider who is no longer VERIFIED can still work assigned bookings
From: support | Date: 2026-10-28 | Priority: normal
Severity: S2
Repro steps: P1 (VERIFIED) has an ACCEPTED booking. Admin rejects P1 (`/admin/providers/{id}/reject`), or P1
calls `/provider/me/resubmit` → PENDING. P1 then calls `/provider/bookings/{id}/start` and `/complete`.
Expected vs actual: Expected: actions denied (403) or bookings released for re-assignment. Actual: allowed; the
booking stays with P1. On disable, P1 is blocked (is_active=false) but their open bookings stay stuck; only the
unchecked admin override (SU-003) can move them.
Root cause (file:line): `backend/app/services/bookings.py:339-343` checks only `provider_profile` + `provider_id`,
not `verification_status`; `services/providers.py:267-290, 449-468` don't touch open bookings.
Suggested fix + owning workstream: architect decides policy (deny actions vs auto-release to admin queue on
reject/disable); backend implements.
Test that will prove the fix: test-plan §1.3 rows for P3/P4; `test_disable_provider_releases_open_bookings`.
Contract ref: none

---

## [OPEN] SU-006 — BUG S2: provider can add service categories without admin approval
From: support | Date: 2026-10-28 | Priority: normal
Severity: S2 (verification bypass)
Repro steps: VERIFIED provider → `PATCH /provider/me {"category_ids":["<electrician id>"]}` → stays VERIFIED and
public, now listed and bookable for Electrician. `/provider/me/resubmit` with `categories=["Anything"]` also
stores arbitrary names.
Expected vs actual: Expected: new categories only via skill request + admin approval. Actual: direct overwrite of
`category_names`.
Root cause (file:line): `backend/app/services/providers.py:169-174` (update_provider_profile),
`:352-377` (resubmit; names not validated against `categories`).
Suggested fix + owning workstream: backend — drop `category_ids` from `ProviderProfileUpdateRequest` (or allow
removal only); resubmit validates against active categories. Web/mobile remove category editing from profile
screens. Contract change → deprecation path for shipped clients (Rule 7).
Test that will prove the fix: test-plan §3.3 rows 3-4.
Contract ref: none

---

## [OPEN] SU-007 — BUG S2: booking transitions are not atomic (race → both sides "succeed")
From: support | Date: 2026-10-28 | Priority: normal
Severity: S2
Repro steps: Fire `PATCH /bookings/{id}/cancel` (customer) and `PATCH /provider/bookings/{id}/accept` together on
a REQUESTED booking.
Expected vs actual: Expected: one wins, the other 422. Actual: both read REQUESTED, both write; final status is
whichever wrote last, both clients told they succeeded, history has two entries from REQUESTED.
Root cause (file:line): `backend/app/services/bookings.py:497-499` — `update_one({"id": ...})` without the current
status in the filter; same in `assign_provider` (`:216`).
Suggested fix + owning workstream: backend — compare-and-set: filter on current status, require
`modified_count == 1`, else 409/422. Small change; matters on patchy 3G where clients retry.
Test that will prove the fix: test-plan §1.8 (`asyncio.gather`, real MongoDB).
Contract ref: none

---

## [IN PROGRESS] SU-008 — BUG S2: public uploads accept any file type (stored XSS); skill-proof links are broken
From: support | Date: 2026-10-28 | Priority: normal
Severity: S2 security / S2 broken flow
Repro steps: (a) `POST /provider/me/documents` or `/customer/me/photo` with `profile_photo` named `x.html`,
content-type `image/png`, body `<script>…</script>` → served at `/uploads/<uuid>.html` from the API origin.
(b) Provider submits a skill request → admin opens `proof_url` → 404.
Expected vs actual: (a) only jpg/png/webp, magic-byte check. (b) proof viewable by admin only.
Root cause (file:line): (a) `backend/app/api/v1/providers.py:47-55` and `api/v1/customers.py:32-38` keep the
client's extension and trust `content_type`. (b) `api/v1/providers.py` `create_skill_request` writes to the
`local_upload_dir` root but returns `/uploads/...`, which serves only `uploads/public` (`main.py:59`); no type check.
Suggested fix + owning workstream: backend — one shared upload validator (allow-listed extension + sniffing, size
cap), always our own extension; skill proofs go to `private/` behind an admin-only endpoint like Aadhaar. Fits the
storage ADR infrastructure raised.
Test that will prove the fix: test-plan §3.2 rows 4-5.
Contract ref: none

---

## [OPEN] SU-009 — S3 batch: smaller booking/auth defects found in the same read
From: support | Date: 2026-10-28 | Priority: normal
Severity: S3 (each)
1. Start OTP has no attempt limit (4 digits, 9000 values) — `services/bookings.py:365-378`. Fix: lock after ~5
   wrong tries; admin can reset.
2. `preferred_datetime.replace(tzinfo=UTC)` discards the client's offset; an IST time up to 5.5 h in the past is
   accepted — `bookings.py:43`. Fix: `astimezone(UTC)` for aware values; reject naive (or define them as IST).
3. `mark_cash_paid` is not idempotent: repeatable, can rewrite `final_amount` after payment, logs
   COMPLETED→COMPLETED history — `bookings.py:388-443`. Fix: 422 if already PAID_CASH.
4. No provider cancel endpoint, although FSD §5 allows ACCEPTED → CANCELLED_BY_PROVIDER (status unreachable).
   ❓ architect: build it or drop it from the spec.
5. Customer cancel on ON_THE_WAY is refused with "after service has started"; the spec predates ON_THE_WAY.
   ❓ architect: decide.
6. Unescaped user input in Mongo `$regex`: public `GET /providers?locality=` (`services/providers.py:228`) and
   skill-request `category_name` (`:42`) → wrong matches / ReDoS. Fix: `re.escape`.
7. App starts with the default `jwt_secret_key` in any environment (`core/config.py:19`); no rate limit on
   login/reset. Fix: refuse to boot when `ENVIRONMENT != local` and the secret is default; rate-limit.
8. Admin dashboard `open_statuses` omits ON_THE_WAY (`services/admin.py:25-29`).
9. Admin re-assign of a REQUESTED booking silently replaces the provider; old provider not notified
   (`bookings.py:182-273`).
Suggested fix + owning workstream: backend for all; items 4-5 need an architect decision first.
Test that will prove the fix: matching rows in `docs/qa/test-plan.md` §1.4, §1.6, §1.7, §2.2, §3.3.
Contract ref: none

---

## [DONE: no-op] SU-001 — info: test plan written (OR-005, part 1)
From: support | Date: 2026-10-28 | Priority: info
What changed: Added `docs/qa/test-plan.md`: booking role/ownership gates, 10-status × 10-action lifecycle
matrix, admin-override grid, start-OTP, creation, concurrency; auth (register/login/tokens/reset); provider
verification state machine, document visibility, categories/skills; low-end device / 3G / Hindi checks.
Expected behaviour follows FSD §5; open policy questions are marked ❓ in the plan and listed in SU-005 and
SU-009 items 4-5. Bugs found are SU-002…SU-009 above.
Why: OR-005 — the state machine and auth had no coverage.
Action needed in this workstream: triage SU-002 (breaking) first; answer the ❓ policy questions so the
expected columns can be finalised. Still open in OR-005: error tracking + uptime proposal, and the API test
suite, which waits on OR-001.
Contract ref: none

## [DONE: no-op] AR-002 — info: backend hotfix done (password reset disabled)
From: backend | Date: 2026-10-28 | Priority: info
What changed: Setting `password_reset_self_service_enabled` (default False, in `.env.example`); new
`AppErrorCode.PASSWORD_RESET_DISABLED`; a router dependency in `api/v1/auth.py` returns 403 on both
endpoints before FastAPI validates the body or any DB access. Contract re-exported; `API_CHANGES.md#ar-002`.
Tests in `tests/test_password_reset.py`: 5 DB-free tests pass (403 + code for valid, malformed and empty
input; flag defaults off). The other 3 (identical response for known/unknown account, password unchanged,
reset works when enabled) need the Mongo fixtures, so they are UNRUN until BE-002 (OR-001 #1).
Why: SU-002 / ADR 0003 §8.
Action needed in this workstream: Check the result. Note: `email-validator` is missing from
`requirements.txt` (OR-001 #2); I installed it in my local venv only to run the tests. Prod evidently has
it, but a clean install fails, so I'd like to add it next (BE-001).
Contract ref: contracts/API_CHANGES.md#ar-002

## [OPEN] BE-002 — info: test suite runs again; decision needed on admin status override
From: backend | Date: 2026-10-28 | Priority: info
What changed: BE-001: `email-validator==2.2.0` added to `requirements.txt` (clean install now imports the app).
BE-002: `tests/conftest.py` rewritten for MongoDB (in-memory `mongomock-motor`, or a real DB when
`TEST_MONGODB_URL` is set); stale tests ported; new `tests/test_booking_states.py` pins the current state
machine (provider allowed/disallowed matrix, OTP on start, cancel, assign, cash-paid, history). 114 tests pass,
ruff clean on `tests/`. Also fixed a real bug found by the suite: `POST /admin/categories` returned 500
(`CategoryService.create` did not set `created_at`/`updated_at`).
Why: OR-001 items 1 and 2; Rule 9.
Action needed in this workstream: DECISION: `PATCH /admin/bookings/{id}/status` accepts any status from any
status (e.g. COMPLETED -> REQUESTED). Should admins be bound by the central transition table (OR-001 item 6)?
Pinned by `test_known_gap_admin_can_force_any_status_transition`. Related: SU-007 (non-atomic transitions).
Contract ref: none
