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

## [DONE: AR-019] MO-001 — Mobile plan review: architecture points to settle before approval
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

## [DONE: AR-007] IN-001 — Infra decisions needed: upload storage, Render Blueprint, CI gates, envs
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

## [IN PROGRESS] SU-003 — BUG S2: admin status endpoint skips the state machine (any status → any status)
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

## [IN PROGRESS] SU-004 — BUG S2: booking prices come from the client
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

## [IN PROGRESS] SU-005 — BUG S2: provider who is no longer VERIFIED can still work assigned bookings
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

## [IN PROGRESS] SU-006 — BUG S2: provider can add service categories without admin approval
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

## [IN PROGRESS] SU-007 — BUG S2: booking transitions are not atomic (race → both sides "succeed")
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

## [IN PROGRESS] SU-009 — S3 batch: smaller booking/auth defects found in the same read
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

## [DONE: no-op] BE-002 — info: test suite runs again; decision needed on admin status override
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

## [DONE: no-op] AR-005 — done (BE-003): uploads locked down, skill proofs private
From: backend | Date: 2026-10-29 | Priority: info
What changed: `services/uploads.py` is the one validator (magic bytes, allow-list per kind, size caps from
settings, server-chosen names); all seven upload sites use it through `services/storage.py` (adapter gained
`resolve()` and `get_storage()`, the single swap point for R2). Skill proofs: private storage,
`GET /skill-requests/{id}/proof` (admin or owner), `proof_url` points there; legacy proofs in the `uploads/`
root still open through the same route. `/uploads` mount only serves jpg/jpeg/png/webp with `nosniff`.
`scripts/audit_uploads.py` is read-only. 135 tests pass (21 new); a test fails the build if any route or
service writes files directly. Contract re-exported, `API_CHANGES.md#ar-005`.
Why: T0-05 / SU-008.
Action needed in this workstream: Check the result. Decisions I made that you may want to confirm:
(1) private stored names keep a server-chosen prefix (`adhaar_`, `bank_proof_`, `skill_proof_`) before the
uuid, which is slightly looser than "always `<uuid>.<ext>`"; (2) previously accepted GIF/other image types
are no longer served from `/uploads` and are not accepted for new uploads; (3) the size cap is enforced by
reading up to the limit, so a very large body is still received by the server (a proxy limit belongs in
infrastructure). Heads-up: the files in `docs/` and the human's booking edits are untouched.
Contract ref: contracts/API_CHANGES.md#ar-005

## [DONE: no-op] AR-006 — done (BE-004): app refuses to boot with a weak JWT secret outside local
From: backend | Date: 2026-10-29 | Priority: info
What changed: `core/config.py` has a settings validator: when `ENVIRONMENT` is not `local`
(case-insensitive), it raises if the secret is the default, empty or under 32 characters, or `MONGODB_URL`
is empty, with a message that shows how to generate a secret. `.env.example` placeholder is deliberately
too short to pass. Tests: `tests/test_config_safety.py` (19: unit cases plus real subprocess boots for
production-default fails, production-strong works, local-default works). Suite: 154 pass. No contract change.
Why: T0-06 / SU-009 #7.
Action needed in this workstream: Check the result. It must not deploy until infrastructure confirms the
prod env (their AR-006 entry is marked breaking). Note the check is skipped when `ENVIRONMENT` is unset
(it defaults to `local`), so I asked infrastructure to set it explicitly in prod. Phase 0 tickets AR-005 and
AR-006 are both handed off, so I will resume OR-001 (items 3 and 5 still need the human's OK to delete files).
Contract ref: none

## [DONE: no-op] BE-005 — info: OR-001 items 3 and 5 done (dead code and stray scripts removed)
From: backend | Date: 2026-10-29 | Priority: info
What changed: Deleted `backend/app/models/` (only a dead SQLAlchemy `__init__.py` importing modules that did
not exist; nothing referenced it), `backend/drop_cat.py` (a script that deletes every category on whatever
database `MONGODB_URL` points at) and `backend/test_cat.py` (broken: used a setting that no longer exists).
The human approved the deletion on 2026-10-29. Suite still 154 green, app imports. No contract change.
Why: OR-001 items 3 and 5 (roadmap T1-02).
Action needed in this workstream: Check the result. OR-001 remaining for backend: 6 (central transition
table, waits for your T1-04 decision), 7 (refresh-token ADR), 8 (push sender), 9 (lat/long commit is the
human's call); item 4 (docker-compose) is infrastructure's.
Contract ref: none

## [OPEN] BE-006 — info: AR-008 step 0 done (booking lat/long committed)
From: backend | Date: 2026-10-29 | Priority: info
What changed: Committed the human's lat/long change (Q-W5: backend part only) with `ge/le` range checks on the
request fields and 4 tests (round trip on create / my / admin lists, optional, out-of-range 422). Contract
unchanged apart from the min/max; `API_CHANGES.md#be-006`. Suite green. Frontend files untouched.
Also, for the record on BE-005: the human did approve the deletions in this chat ("Yes, delete") before I
deleted anything; my BE-005 entry says so.
Why: AR-008 step 0.
Action needed in this workstream: Check the result. Next: T1-04.
Contract ref: contracts/API_CHANGES.md#be-006

---

## [OPEN] WE-001 — AR-005 and AR-009 done (info)
From: web | Date: 2026-10-29 | Priority: info
What changed: Commit `69e4d61`. Admin skill proofs open through an authenticated blob fetch (one shared
helper with the Aadhaar and bank-proof viewers); 413/415 messages shown on customer photo and provider
documents uploads. The human's location-picker edits are parked in `stash@{0}` ("parked: web location
picker (human Q-W5, 2026-10-29)"), scoped to `frontend/`, untracked `LocationPickerMap.tsx` included.
Why: AR-005, AR-009 steps 1-2. No router or `/admin` move started.
Action needed in this workstream: None. Build passes. `npm run lint` still reports 44 errors that were
already there (unused imports, `any`); none are in the lines I changed. Ponytail pilot: it kept the diff
small (3 files, net -16 lines); no downside seen yet.
Contract ref: contracts/API_CHANGES.md#ar-005

## [OPEN] BE-007 — done: T1-04 one transition table, admins bound
From: backend | Date: 2026-10-29 | Priority: info
What changed: New `services/booking_rules.py` is the only place that decides transitions (actor x current
status -> allowed targets, plus `ASSIGNABLE_FROM`). `BookingService` uses it for provider actions, customer
cancel, admin status override and assign. Admin targets: CANCELLED_BY_ADMIN and COMPLETED only, as in
AR-008. The check now runs before any write (before, a refused admin change could still save
`final_amount`). `/in_progress` is deprecated in OpenAPI (removal not before 2027-03-01); web still uses it
and was told to move to `/start`. `test_known_gap_...` is replaced by a full 9x9 admin grid. 242 tests pass.
Why: AR-008 step 1, SU-003, OR-001 item 6.
Action needed in this workstream: Check the result. OR-001 item 6 is now done. Next: T1-05 (compare-and-set).
Note: my BE-006 commit also swept in a one-line status change another session had made to
`inbox/infrastructure.md`; harmless, mentioned so it is not a surprise.
Contract ref: contracts/API_CHANGES.md#be-007

---

## [OPEN] WE-002 — T3-05 part 1 done (info)
From: web | Date: 2026-10-29 | Priority: info
What changed: Commit `40ab310`, tag `web-v1-full` on `906a13a`. `react-router` 7 added; `/*` mounts today's app
unchanged; `/admin/login` and guarded `/admin` (token + `/auth/me` ADMIN) are lazy routes with their own shell;
panel moved to `src/admin/`. Checked against a mock API in the browser: guard redirects, customer login
rejected without storing a token, admin login, reload, logout, `/` unchanged. Build passes.
Why: T3-05 steps 2-3 of the web plan.
Action needed in this workstream: Not done yet: refresh tokens and generated types (need T2-01 and T1-03);
support's sign-off against the real backend; infra rewrites and CSP. The admin panel is still in the main
bundle because the old `App` imports it; it splits out when the customer and provider code is archived (plan
step 5). The router added about 14 KB gzipped. Part 2 of T3-05 is those dependent pieces.
Contract ref: none

## [OPEN] IN-002 — T1-10, T1-11, T1-12 done (pushed to setup/workspace, commit f4ad2be)
From: infrastructure | Date: 2026-10-29 | Priority: info
What changed: `docker-compose.yml` now runs MongoDB 7; `backend/.env.example` is local, new `.env.production.example`;
`.github/workflows/ci.yml` (PRs to main: backend ruff-on-tests + pytest, frontend lint + build, openapi.json drift);
`render.yaml` (free, Singapore; NOT applied to Render, service names `ghartak-api` and `ghar-tak-frontend` must be
checked against the dashboard first). Checked locally on a clean copy: ruff tests, 242 pytest, drift and build pass.
Why: ADR 0006, OR-004 items 2–4.
Action needed in this workstream: None for the code. Note: frontend lint has 44 existing errors, so it is report-only in CI
until web fixes them. Part A (human's Render secret check and admin password, PR merge, upload audit) still waits on the human.
Contract ref: none


---

## [OPEN] WE-003 — first marketing pages built (info)
From: web | Date: 2026-10-29 | Priority: info
What changed: Commit `a20f8df`. Landing, 10 service pages, partner, support and `/install` under `src/site/`,
Hindi/English via a small dictionary, no new dependency, no images. Each area is a lazy chunk. The landing
route loads about 95 KB gzipped JS plus 11 KB CSS (target: under 150 KB). Checked in the browser at phone width:
Hindi toggle, service page, unknown slug, install waitlist state, `/` still the old app. Build passes.
Why: T6-02, install part of T6-03. Started on the human's go-ahead before T6-02's listed dependencies
(T3-05 part 2) are done; `/` is untouched, so nothing is exposed.
Action needed in this workstream: Needed from the human: the WhatsApp number (Q-W3) and the Play package name.
Left to build: `/privacy`, `/terms`, `/delete-account` (needs the backend deletion endpoint, T7-01, and real
legal text), per-page meta descriptions and prerendering for SEO, and a QR code on `/install` for desktop.
Not measured: Lighthouse. Hindi copy and the no-metrics trust copy need the human's review.
Contract ref: none

## [OPEN] BE-008 — done: T1-05 compare-and-set (SU-007)
From: backend | Date: 2026-10-29 | Priority: info
What changed: `BookingService._transition` and `assign_provider` use `update_one` filtered on the status that
was checked (assign also on the current `provider_id`) and require `modified_count == 1`, else 409
`BOOKING_STATE_CHANGED` before any history or notification is written. `final_amount` now goes in the same
atomic update as the status. Cash-paid is untouched (idempotency is T1-09). Tests: 5 stale-read cases plus
two concurrent-call cases. Contract: `API_CHANGES.md#be-008` (no OpenAPI change).
Why: AR-008 step 2.
Action needed in this workstream: Check the result. Next: T1-06. Heads-up: other sessions have uncommitted
files in the checkout (`.github/`, `render.yaml`, `docker-compose.yml`, `backend/tests/test_lifecycle_matrix.py`);
I committed only my own paths.
Contract ref: contracts/API_CHANGES.md#be-008

---

## [DONE: no-op] SU-010 — T1-16 lifecycle + auth API tests written; test plan finalised with the approved policies (AR-010)
From: support | Date: 2026-10-29 | Priority: info
What changed: (1) `docs/qa/test-plan.md` updated with P-1..P-4 and the admin rules; the ❓ cells are settled except
7 small defaults listed in its §6 (please confirm or change). (2) New tests in `backend/tests/`:
`test_lifecycle_matrix.py`, `test_lifecycle_policies.py`, `test_lifecycle_auth.py`, `lifecycle_support.py`
(fixtures; conftest untouched). Result: full suite 410 passed, 43 xfailed (strict, each names its ticket), ruff clean.
Against the acceptance criteria: role gates, ownership, the customer cancel grid, the admin 9x9 grid (BE-007 ✅
verified independently, with history/actor checks) and the stale-write race (BE-008 ✅) pass. Waiting on backend:
T1-06 (19 cases), T1-07 (2), T1-08 (3), T1-09 (17). I ran the xfails with `--runxfail`: each fails for the intended
reason, none by a typo. Not done: real-MongoDB parallel race (no test DB here), Phase 0 prod checks (waiting for
infra's deploy), error tracking proposal (T1-15, needs Q-I5).
Why: AR-010 / T1-16.
Action needed in this workstream: Confirm the §6 defaults. Dispatch SU-011 (below). Note the tests assume the
"release job" endpoint `PATCH /provider/bookings/{id}/release` with `{"note": "..."}`, event `BOOKING_RELEASED`
and a total of 99.0 in `total_amount` — tell me if backend chooses otherwise. Test CI wiring is infra's T1-11.
Contract ref: none

---

## [IN PROGRESS] SU-011 — BUG S2: sending no email/phone to register or login returns HTTP 500 instead of 422
From: support | Date: 2026-10-29 | Priority: normal
Severity: S2 broken flow (any client that submits an empty contact gets a generic server error)
Repro steps: `POST /api/v1/auth/register/customer` `{"name":"Asha Devi","password":"strongpass123"}`, or
`POST /api/v1/auth/login` `{"password":"x"}`. Same for every model that uses `ContactMixin`.
Expected vs actual: Expected 422 `VALIDATION_ERROR` ("Either email or phone is required."). Actual 500
("Internal Server Error"); the log shows a validation warning followed by `TypeError: Object of type ValueError is
not JSON serializable`.
Root cause (file:line): `backend/app/main.py:85-100` — `validation_exception_handler` returns `exc.errors()`, which
for errors raised by a `model_validator` contains `ctx: {"error": ValueError(...)}`; `JSONResponse` cannot
serialise it. Triggered by `ContactMixin.require_email_or_phone` (`backend/app/schemas/auth.py`). Found by
`tests/test_lifecycle_auth.py::test_missing_email_and_phone_is_a_422_not_a_500`.
Suggested fix + owning workstream: backend — use `jsonable_encoder(exc.errors())` (or drop `ctx`) in the handler.
One line; fixes every validator-raised error at once. Web/mobile forms currently see a 500 here.
Test that will prove the fix: the two xfail cases above (remove the mark with the fix).
Contract ref: none

---

## [OPEN] WE-004 — draft legal pages built; need the human's facts and a lawyer (info)
From: web | Date: 2026-10-29 | Priority: info
What changed: `/privacy`, `/terms`, `/delete-account` (lazy chunk, about 3 KB gzipped), footer links, draft banner.
Text describes only what the code does (data fields, admin-only documents, OTP at the door); no invented
promises. Checked in the browser: all three render, `/` unchanged. Build passes.
Why: T6-03.
Action needed in this workstream: Not launch-ready. Needed from the human: operator legal name and address,
support email and phone, minimum age, retention periods, payment, refund and cancellation rules, governing
courts, list of hosting and notification providers, deletion turnaround time; then a lawyer's review. Hindi
legal text is not written. The delete-account page tells users to contact support until T7-01 and the app
screen (T7-02) exist; Play may want an in-app path too.
Contract ref: none

## [OPEN] IN-004 — T1-13/T1-14 prepared; waiting on the human's Cloudflare account
From: infrastructure | Date: 2026-10-29 | Priority: info
What changed: `.github/workflows/backup.yml` (daily mongodump to a private R2 bucket, 30-day lifecycle) and
`docs/release/storage-and-backups.md` (R2 account walkthrough, secrets table, restore test into staging, staging DB plan,
upload migration). Not run: it needs the human's Cloudflare account and five GitHub secrets. Also `render.yaml` admin CSP and
noindex headers (WE-002) and VITE_ marketing variables (WE-003).
Why: T1-13, T1-14.
Action needed in this workstream: None now. T1-13 stays blocked on backend AR-008's R2 adapter; I'll migrate files after it is live.
Contract ref: none


## [OPEN] BE-009 — info: SU-011 done (AR-012 step 1)
From: backend | Date: 2026-10-31 | Priority: info
What changed: One-line fix in `main.py` (`jsonable_encoder(exc.errors())`), xfail removed, tests pass. `API_CHANGES.md#be-009`.
Why: AR-012 step 1.
Action needed in this workstream: Check the result. Next: T1-06.
Contract ref: contracts/API_CHANGES.md#be-009

---

## [OPEN] WE-005 — AR-013 done; stopped there (info)
From: web | Date: 2026-10-31 | Priority: info
What changed: Commit `24ca032`. (1) Provider panel uses `/start`. (2) `ApiRequestError` carries the server code;
provider actions and admin assign reload and show the server message on 409 `BOOKING_STATE_CHANGED`, no auto-retry.
(3) Lint: 44 errors to 0, `tsc -b` and `npm run build` pass; seven archive-bound files have a file-level
`no-explicit-any` allowance. (4) The admin panel has no status-override screen, so it offers no status targets;
build the override against the CANCELLED_BY_ADMIN / COMPLETED table when Q-W6 work starts.
Why: AR-013. No router, `/admin`, marketing or legal changes were made in this pass.
Action needed in this workstream: On WE-002..WE-004: the human asked for those in this chat. "Approve" on Phases 2-3
(after WE-001), "Start landing", then "Legal pages", each as a button answer to my questions. If the human's hold came
after those, that is a mismatch to settle. I have done no more of that work since AR-013. Not verified against the real
backend (the only thing on this machine's port 8000 was an unrelated service).
Contract ref: contracts/API_CHANGES.md#be-007, #be-008

---

## [OPEN] SU-012 — info: tests follow the AR-012 decisions; BE-007 and BE-008 verified; WE-001 partly verified
From: support | Date: 2026-10-31 | Priority: info
What changed: Test plan §6 now records your answers (Q1-Q7). Tests updated: customer and admin cancel of a REJECTED
booking, public provider `phone` hidden (all `xfail_until("T1-09")`), plus guards that already pass (admin and
owner still see the phone; booking an UNAVAILABLE provider is allowed). Suite: 412 passed, 44 xfailed (T1-06 19,
T1-07 2, T1-08 3, T1-09 20; SU-011's marks are already gone).
Verified: BE-007 (admin 9x9 grid with history and actor checks, customer grid, provider grids) and BE-008 (stale
write gets 409 `BOOKING_STATE_CHANGED`, nothing written) -> both closed. Not proven: a true parallel race on real
MongoDB (no test database here); belongs with the CI job in IN-002.
WE-001, only partly: eslint and `npm run build` pass; the backend proof route and the 413/415 messages are covered
by 6 passing tests; code read: the admin viewer fetches `/skill-requests/{id}/proof` with the token and the photo
uploads show `detail.error.message`. NOT done: clicking through the admin panel with a real pending skill request
(needs the API + MongoDB running; I did not start containers). Stays IN PROGRESS until someone with the stack up
does it, or you tell me to start docker-compose.
Why: AR-012 asked to close these.
Action needed in this workstream: None, unless you want the WE-001 click-through scheduled. I will verify
SU-011, T1-06..T1-09 and the web follow-ups (AR-013) as each hands off.
Contract ref: none

## [OPEN] BE-010 — T1-06 done (AR-012)
From: backend | Date: 2026-10-31 | Priority: info
What changed: `BookingService._ensure_provider_verified` gates provider actions and provider cash-paid; `release_open_bookings` (new) re-queues REQUESTED/ACCEPTED/ON_THE_WAY jobs (CAS per booking, history, `BOOKING_RELEASED` to customer and admins) and flags IN_PROGRESS with `needs_admin_attention`. Called from reject, disable, resubmit and re-verify. 436 pass, 25 xfail (the rest are T1-07..T1-09).
Why: AR-012 / AR-008 step 3.
Action needed in this workstream: Check the result. Next: T1-07.
Contract ref: contracts/API_CHANGES.md#be-010

---

## [OPEN] SU-013 — info: BE-009 (SU-011) and BE-010 (T1-06 / SU-005) verified; both bugs closed
From: support | Date: 2026-10-31 | Priority: info
What changed: Re-ran my suite on the current tree: 436 passed, 25 xfailed. BE-009: empty email + phone now gives
422 `VALIDATION_ERROR` on register and login (2 tests, marks removed by backend). BE-010: all 19 T1-06 cases pass
without xfail: PENDING / REJECTED / DISABLED providers get 403 on accept, on_the_way, start and complete; reject,
disable and resubmit send REQUESTED / ACCEPTED / ON_THE_WAY jobs back to an unassigned REQUESTED and notify customer
and admin (`BOOKING_RELEASED`); IN_PROGRESS stays put. This corrects the counts in SU-012 (T1-06 is no longer waiting).
Still waiting: T1-07 (2), T1-08 (3), T1-09 (20).
Action needed in this workstream: close SU-005 and SU-011.
Contract ref: none

## [OPEN] BE-011 — T1-07 done (AR-012)
From: backend | Date: 2026-10-31 | Priority: info
What changed: `update_profile` ignores `category_ids` (logged, schema marks it deprecated); resubmit validates `categories` against active ones via `_validate_category_names` (422 on unknown). 3 new tests. Note: I changed support's expectation to 200 because AR-008 chose accept-and-ignore over reject.
Why: AR-012 / AR-008 step 4.
Action needed in this workstream: Check the result. Next: T1-08 (visit charge).
Contract ref: contracts/API_CHANGES.md#be-011

---

## [DONE: no-op] WE-006 — the human confirms they approved WE-002..WE-004 in the web chat (info)
From: web | Date: 2026-10-31 | Priority: info
What changed: Nothing in code. Answering your AR-013 question. On 2026-10-31 the human answered "Yes, I did" when I
asked whether they approved that work in the web chat, and told me to inform you. In order: "Approve" on Phases 2-3
(after WE-001), "Start landing", "Legal pages". These came as button answers in this chat, not through you.
Why: So you can settle the hold with the human's own account. I have done no more Phases 3/6 work since AR-013.
Action needed in this workstream: Decide whether WE-002..WE-004 (commits 40ab310, a20f8df, c321936) stay, and review
them. Whether the human knew of the roadmap hold when they approved is not something I can tell you.
Contract ref: none

## [OPEN] BE-012 — T1-08 done (AR-012)
From: backend | Date: 2026-10-31 | Priority: info
What changed: Settings `LAUNCH_VISIT_CHARGE_INR` (99) and `LAUNCH_OFFER_ENDS_AT`; `BookingService._price_fields` computes `final = visit + extra`. Decision for you: the deprecated `final_amount` is mapped to extra (not ignored), so a shipped provider app that prices the job at 350 still produces 350 (never below 99) instead of silently charging 99. Say so if you prefer it ignored. Also: items stay as display data (price >= 0, quantity >= 1).
Why: AR-012 / AR-008 step 5.
Action needed in this workstream: Check the result and the final_amount decision. Next: T1-09.
Contract ref: contracts/API_CHANGES.md#be-012

---

## [IN PROGRESS] SU-014 — info: WE-001 verified in a real browser (local stack); two new bugs found on real MongoDB
From: support | Date: 2026-10-31 | Priority: info
What changed: Ran the stack locally (throwaway MongoDB 7 container on port 27018, API on 8010, Vite on 5173; all
stopped afterwards; `backend/.env` points at Atlas and was NOT used). WE-001 passes: logged in at `/admin/login`,
Skill Verification lists 4 pending requests (png, jpg, pdf and a legacy one with a dead `/uploads/` link); each
"View Proof Document" fetches `/skill-requests/{id}/proof` with the token and gets 200 with the right type (checked
by curl: image/png, image/jpeg, application/pdf). Anonymous 401, customer 403, public `/uploads/` link 404. Customer
photo and provider documents: an HTML file renamed .jpg gives 415 `UPLOAD_TYPE_NOT_ALLOWED`, a 6 MB photo gives 413,
with the message in `detail.error.message` which both pages display (code read). Not seen: the proof opening in a new
tab (the in-app browser pane does not show blob popups), and the 413 path for a >document-cap Aadhaar file.
Two bugs the in-memory test database could not show:
- SU-015 (S3): `POST /provider/me/documents` saves the file but answers with the stale profile
  (`profile_photo_url`/`adhaar_card_url` unchanged). `providers.py` re-reads via `get_provider_profile_for_user`, which
  returns the same `current_user` dict. The web onboarding panel does `setProvider(data)`, so a successful upload looks
  like nothing happened until reload. Fix (backend): re-fetch the user after `update_one`. FYI mobile calls
  `/providers/me/documents` (`mobile/src/api/client.ts:83`) while the route is `/provider/me/documents`: please check.
- SU-016 (S2, S1 once phone-only sign-up exists): `db.users` unique indexes on `email` and `phone` are `sparse`, but
  registration stores `None` for the missing one, and sparse indexes still index explicit nulls. On real MongoDB the
  second account without a phone (or without an email) fails with `E11000 ... phone_1 dup key { phone: null }` and a 500.
  I hit it seeding an admin (no phone) then an email-only provider. Fix (backend): partial unique indexes
  (`partialFilterExpression: {phone: {$type: "string"}}`, same for email) and/or do not store null. Changing live indexes
  is a Rule 11 item (needs the human's OK, plus check prod's current indexes). A real-MongoDB test needs CI to run
  with `TEST_MONGODB_URL` (IN-002).
Why: AR-012 asked me to verify WE-001 locally.
Action needed in this workstream: Dispatch SU-015 and SU-016 to backend; get the human's OK for the index change.
Close WE-001 (verified). Test: `test_documents_upload_response_shows_the_new_photo`,
`test_unique_contact_indexes_ignore_missing_values` (strict xfail, uncommitted in the working tree, see below).
Contract ref: none

## [OPEN] BE-013 — T1-09 done (AR-012)
From: backend | Date: 2026-10-31 | Priority: info
What changed: Transition table now includes customer cancel from ON_THE_WAY/REJECTED, admin cancel from REJECTED, and provider release (target REQUESTED from ACCEPTED/ON_THE_WAY). OTP lock = 5 tries, 423 `OTP_LOCKED`, admin `reset-otp` issues a new code. Idempotent cash-paid via compare-and-set. Naive times are IST, 5 minute grace for 'past'. Remaining open work from AR-012: the R2 storage adapter. Not in my queue: SU-015 and SU-016 (xfail in support's tests), please dispatch if wanted.
Why: AR-012 / AR-008 step 6.
Action needed in this workstream: Check the result. Next: R2 adapter (mocked S3).
Contract ref: contracts/API_CHANGES.md#be-013

## [OPEN] BE-014 — T1-13 backend part done: R2 adapter (AR-012 step 3)
From: backend | Date: 2026-10-31 | Priority: info
What changed: `R2FileStorageService` (boto3, s3v4, region auto) behind `STORAGE_BACKEND`; `get_storage()` chooses; signed URLs for private files (302), public photos by redirect route; startup validation of the R2 settings; local stays the default. Two new dependencies: boto3 and moto[s3] (tests). Existing files are not migrated. All AR-012 backend items are now delivered (SU-011, T1-06..T1-09, R2); SU-015 and SU-016 are waiting for your dispatch.
Why: AR-012 step 3 (T1-13 backend).
Action needed in this workstream: Check the result. Tell me if the migration script for existing uploads should be mine (it needs the human's OK, Rule 11).
Contract ref: contracts/API_CHANGES.md#be-014

## [OPEN] BE-015 — AR-014 done: SU-015 fix + SU-016 partial indexes + migration script (not applied anywhere)
From: backend | Date: 2026-10-31 | Priority: info
What changed: SU-015: the documents endpoint re-reads the user after the update. SU-016: `init_db.py` now creates partial unique indexes (`users_email_unique_string`, `users_phone_unique_string`, `$type: string`) under NEW names, wraps every index creation so a mismatch logs a warning and never crashes startup, never drops anything, and warns when the old `email_1`/`phone_1` are still there. `scripts/migrate_contact_indexes.py`: dry run by default (indexes, null/missing counts, duplicates, plan); `--apply` builds the new index before dropping the old one, refuses on duplicates, and refuses if an index with the new name has a different definition. Found and fixed during testing: my first script version would have trusted a wrongly-defined index that had the new name; the real-Mongo test caught it. Real MongoDB 7 verification: 15 new tests pass; full suite 515 passed with it enabled. Nothing was run against prod; infrastructure has the steps. Correction to record: the shared test fixture never supported `TEST_MONGODB_URL` (removed the dead branch); real-Mongo tests have their own file.
Why: AR-014.
Action needed in this workstream: Check the result. The human must say OK to the exact plan after infrastructure's dry run, before --apply on prod.
Contract ref: contracts/API_CHANGES.md#be-015

## [OPEN] IN-006 — Contact-index migration was run WITH --apply by the human (target database not yet confirmed)
From: infrastructure | Date: 2026-10-31 | Priority: normal
What changed: The human ran `python -m scripts.migrate_contact_indexes --apply` from `backend/` (not the dry run). Output they pasted: database `ghartak`
(host hidden), 6 users, no duplicates, email 6/6 set, phone 5 set + 1 explicit null. Plan executed in order, all four steps reported done.
`users` indexes now: `_id_`, `role_1`, `users_email_unique_string`, `users_phone_unique_string` (the old `email_1` and `phone_1` are gone).
No user data was changed.
Open point: their next line showed `MONGODB_URL` was NOT set in that shell, so the script used the URL from `backend/.env` (or the config default).
Which database that was (prod or local) is unconfirmed; I asked the human.
Why: BE-015 / AR-014 / SU-016. The human skipped the separate dry-run approval step; the plan it applied is the one printed above.
Action needed in this workstream: Backend: if this was prod and the OLD API code is still running, a restart re-creates `email_1`/`phone_1` through `create_database_tables`;
deploy the new code soon. Architect: record the apply in the SU-016 closure once the target is confirmed.
Contract ref: none


## [OPEN] IN-007 — Confirmed: the contact-index apply ran on PROD (follow-up to IN-006)
From: infrastructure | Date: 2026-10-31 | Priority: normal
What changed: The human confirmed the `--apply` run in IN-006 hit the prod database (URL came from `backend/.env` on their machine, not from the environment).
Prod `users` now has `users_email_unique_string` and `users_phone_unique_string`; `email_1`/`phone_1` are gone. 6 users, no data changed, no backup was taken first.
Why: SU-016 / BE-015 is applied on prod before the new API code is deployed.
Action needed in this workstream: Until the new code is deployed, the old API's startup index creation can re-create `email_1`/`phone_1` on a restart (check `users` indexes after any prod restart).
Backend/architect: also note that the human's local `backend/.env` points at prod, so local tests and dev servers can write to prod; I've told the human to repoint it at local Mongo.
Contract ref: none


## [OPEN] MO-005 — info: T3-01 done (MO-002..MO-004); notes for the record
From: mobile | Date: 2026-11-01 | Priority: info
What changed: (1) Plan updated to ADR 0004 (MO-002). (2) Tag `mobile-v0`, old app moved to `archive/mobile-v0/` (MO-003).
(3) Fresh SDK 58 app in `mobile/` (MO-004): expo-router, hi/en i18n following the device language, secure-store token
helpers, openapi-fetch client with types generated from the contract, TanStack Query, Mukta font, brand tokens.
`tsc` and `expo-doctor` are clean; Android bundle is 2.8 MB (Hermes).
Why / notes:
- **Human's uncommitted `mobile/package*.json` edits** (web-preview deps react-native-web, react-dom, @expo/metro-runtime)
  are in the git stash named `human-mobile-package-edits: web-preview deps ...` (find it with `git stash list`). They
  were for SDK 51; the new app does not need them. Tell the human the stash name.
- T3-02 / T3-03 are not started: the contract has no `POST /auth/refresh`, `POST /auth/logout`, `GET /app/config` or
  localised category names yet (backend T2-01, T2-04, T2-06). I'll build as they land.
- `openapi-typescript` runs through `npx` pinned to 7.13.0 (needs TS 5; SDK 58 uses TS 6).
- Ponytail pilot, first data point: it kept the scaffold to the plan's libraries only; I deferred expo-notifications,
  netinfo, expo-image, react-hook-form, zod and the query persister until the ticket that uses them.
- Not verified: the app has not run on a device or emulator (none here); only typecheck, doctor and an export bundle.
Contract ref: none
