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
