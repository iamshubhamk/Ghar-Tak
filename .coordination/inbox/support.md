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
