# Inbox — support

Entries addressed to the support workstream (formerly "qa-monitoring"). Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [IN PROGRESS] OR-005 — Kickoff: build the test plan; no tests or monitoring exist yet
From: orchestrator | Date: 2026-10-27 | Priority: normal
What changed: Workspace set up. Discovery: backend tests can't run (stale SQLAlchemy fixtures; backend
owns that fix as OR-001), no frontend or mobile tests, no error tracking, logs only go to stdout via
`app/core/logger.py`, no uptime checks or analytics.
Why: The booking state machine and auth are the riskiest areas and have no coverage.
Action needed in this workstream: Write `docs/qa/test-plan.md`: booking lifecycle matrix (every
status × every actor × every action, expected allow/deny), auth cases, provider verification flow,
low-end-device/3G checks. Propose the error tracking + uptime tooling (free tier) to the human. Start
writing E2E/API tests once backend's fixtures work.
Contract ref: contracts/API_CHANGES.md#baseline

## [OPEN] AR-002 — Verify the password-reset hotfix on prod (closes SU-002 interim)
From: architect | Date: 2026-10-28 | Priority: normal
What changed: The human approved the SU-002 interim fix. Backend AR-002 disables both reset endpoints
(403 `PASSWORD_RESET_DISABLED`). Infrastructure AR-003 deploys it, rotates the prod admin password and
removes the README credentials.
Why: To close the loop on SU-002 (bug flow: support verifies).
Action needed in this workstream: After infrastructure's handoff, verify on prod with a throwaway or
non-existent account only. Never use real users' data:
- both endpoints return 403 + the code for any input;
- responses are identical for existing and non-existent accounts;
- normal login still works.
Report to architect. SU-002 stays open for the real OTP flow (ADR 0003).
Contract ref: contracts/API_CHANGES.md#ar-002

## [OPEN] AR-002 — backend done; verify on prod after infrastructure deploys
From: backend | Date: 2026-10-28 | Priority: normal
What changed: Both reset endpoints return 403 `PASSWORD_RESET_DISABLED` for any input (valid, unknown
account, malformed body) and never touch the DB. Tests: `backend/tests/test_password_reset.py`.
Why: SU-002 hotfix.
Action needed in this workstream: Verify on prod once infrastructure confirms the deploy (throwaway or
non-existent accounts only). Local note: `pytest` still can't run through `tests/conftest.py` (OR-001 #1);
the 5 DB-free tests pass with `pytest --noconftest tests/test_password_reset.py -k "when_disabled or defaults"`.
Contract ref: contracts/API_CHANGES.md#ar-002

## [OPEN] BE-002 — the backend test suite now runs
From: backend | Date: 2026-10-28 | Priority: info
What changed: From `backend/`: `pytest` (114 tests, ~6 s, no MongoDB needed; set `TEST_MONGODB_URL` to use a
real test DB). `tests/test_booking_states.py` covers the provider status matrix, start OTP, cancel, assign and
cash-paid rules, so part of your lifecycle matrix (SU-001) is automated. Pins current behaviour, including
known gaps (admin can force any status).
Why: OR-001 item 1.
Action needed in this workstream: Extend the suite for your open bug reports (SU-003..SU-009) as needed; the
fixtures are in `tests/conftest.py` and `ctx` in `test_booking_states.py`.
Contract ref: none

## [OPEN] AR-005 — verify upload lockdown (test plan §3.2 rows 4-5)
From: backend | Date: 2026-10-29 | Priority: normal
What changed: Disguised HTML/SVG uploads are rejected (415), oversize files rejected (413), valid
jpg/png/webp/pdf are stored under server-chosen names; skill proofs are private and open only for the admin
and the owning provider. Tests: `backend/tests/test_uploads.py` (21 tests; the whole suite is 135, all green).
Why: SU-008.
Action needed in this workstream: After infrastructure deploys, verify on staging or prod with throwaway
accounts: (1) an .html file sent as image/png to a photo upload gets 415; (2) a valid jpg works; (3) a
skill proof opens for the admin and owner, 403 for another provider or a customer, 401 when logged out;
(4) `/uploads/<anything>.html` returns 404. Update the test plan rows.
Contract ref: contracts/API_CHANGES.md#ar-005

## [OPEN] AR-006 — verify after infrastructure's go-ahead: boot checks
From: backend | Date: 2026-10-29 | Priority: info
What changed: The app exits at startup outside `local` with a default/weak JWT secret (see
`tests/test_config_safety.py`).
Why: SU-009 #7.
Action needed in this workstream: After infrastructure confirms the prod env and deploys, check that the
site is up and login works. Nothing else to test by hand; the cases are automated.
Contract ref: none

## [OPEN] AR-010 — Phase 1 approved: automate the lifecycle + auth tests (T1-16); policies decided
From: architect | Date: 2026-10-29 | Priority: normal
What changed: The human approved Phase 1 and the policies (2026-10-29):
- P-1/P-3: a provider who is out, or releases a job, sends it back to the admin queue
- P-2: ₹99 visit charge, with the extra entered by the provider
- P-4: customer cancel allowed until the job starts
- admins bound by the transition table (only CANCELLED_BY_ADMIN / COMPLETED)

See the policy table in `docs/plans/roadmap-tickets.md`.
Why: The ❓ columns in your test plan can now be finalised.
Action needed in this workstream:
1. Update the expected values in `docs/qa/test-plan.md` with these policies, and commit it (it's still
   untracked).
2. T1-16: write the API tests for §1–2 against backend's fixtures. You write new
   `tests/test_lifecycle_*.py` files; backend owns `conftest.py`. Expect them to fail until backend's
   matching T1-04..T1-09 tickets land; mark those with `xfail(strict=True)` and the ticket ID.
3. Keep verifying the Phase 0 items on prod after infrastructure's deploy (your AR-002/005/006 entries).
Contract ref: none

---

## [OPEN] WE-001 — verify admin skill-proof viewer and upload error messages
From: web | Date: 2026-10-29 | Priority: normal
What changed: In the admin panel, "View Proof Document" now fetches `/skill-requests/{id}/proof` with the
token and opens it as a blob (built from the request id, so old requests work too). Customer photo upload
and provider document upload now show `detail.error.message` for 413/415 (registration, resubmit and
skill-request forms already did).
Why: AR-005 / SU-008 (skill proofs were a public `/uploads/` link that returned 404 for admins).
Action needed in this workstream: With a pending skill request, log in as admin and open the proof
(png, jpg, pdf); an old request should open too. Try a non-image renamed to .jpg and a file over the cap on
customer photo and provider documents: the page should show the server message, not "Upload failed".
Not covered: provider-side profile photo upload in `ProviderBookingsPanel` was not changed.
Contract ref: contracts/API_CHANGES.md#ar-005

## [OPEN] BE-007 — verify the booking transition matrix (SU-003; test plan §1)
From: backend | Date: 2026-10-29 | Priority: normal
What changed: One transition table for customer, provider and admin. Admin override is limited to
CANCELLED_BY_ADMIN (from REQUESTED/ACCEPTED/ON_THE_WAY/IN_PROGRESS) and COMPLETED (from IN_PROGRESS);
everything else gives 422 and writes nothing. Automated: the whole admin 9x9 grid, provider and customer
grids, and a table-vs-spec check in `tests/test_booking_states.py` (242 tests pass).
Why: SU-003 / T1-04.
Action needed in this workstream: After deploy, spot-check on staging or prod with throwaway data that an
admin cannot reopen a COMPLETED booking, and update the matrix rows in the test plan.
Contract ref: contracts/API_CHANGES.md#be-007

---

## [OPEN] WE-002 — verify admin at /admin (router + guard)
From: web | Date: 2026-10-29 | Priority: normal
What changed: Commit `40ab310`. New routes: `/admin/login` (admin-only form), `/admin` (guard: token + `GET /auth/me`
must say ADMIN, else redirect to `/admin/login`; page is `noindex`) with its own top bar (name, notification
bell, logout). The panel itself is unchanged. The old public app still runs at `/` and its login still works.
Why: T3-05 part 1 (ADR 0005).
Action needed in this workstream: Verify at `/admin` with the real backend: customer and provider logins are
rejected on `/admin/login` and no token is stored; no token or a customer token at `/admin` redirects to the
login; reload keeps the admin session; logout clears it. Then walk the existing admin actions (approve, reject
with reason, disable, Aadhaar and bank-proof viewers, skill-request approve/reject and proof, categories
create, assign, booking filter). I only checked login, guard, reload and logout against a mock API, not the
panel actions against the real backend. Admin still uses the 60-minute access token (refresh tokens are T2-01).
Contract ref: none

## [OPEN] IN-002 — CI now exists; watch the first PR run
From: infrastructure | Date: 2026-10-29 | Priority: info
What changed: `.github/workflows/ci.yml` (backend pytest + ruff tests, frontend lint/build, openapi drift) runs on PRs to main.
Checked locally only; the first GitHub run is the real test. Prod has not changed yet.
Why: T1-11.
Action needed in this workstream: None until the PR is merged and deployed (then verify AR-002/005/006).
Contract ref: none

