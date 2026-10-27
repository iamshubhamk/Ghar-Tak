# Inbox — backend

Entries addressed to the backend workstream. Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [IN PROGRESS] OR-001 — Kickoff: fix the backend foundations found in discovery
From: orchestrator | Date: 2026-10-27 | Priority: normal
What changed: Workspace set up; discovery found these backend problems (verified 2026-10-27):
1. Test suite can't run: `tests/conftest.py` imports SQLAlchemy and `app.db.base` (left over from the
   Postgres era); the app now uses MongoDB/Motor. Not one test runs.
2. `requirements.txt` is missing `email-validator` — `import app.main` fails on a clean install
   (`EmailStr` in `schemas/auth.py`).
3. `app/models/__init__.py` imports modules that don't exist (dead SQLAlchemy code).
4. `docker-compose.yml` starts Postgres, not MongoDB (release owns the file — send them the change).
5. Stray files at `backend/` root: `drop_cat.py`, `test_cat.py`.
6. Booking transitions are spread across `services/bookings.py` (per-action checks + special case for
   `start`/`in_progress`). Duplicate endpoints: `/start` and `/in_progress` do the same thing.
7. Auth: access token only (HS256, 60 min), no refresh token, no logout/revocation. The mobile app needs a
   refresh flow — **changing auth needs the human's approval (Rule 11)**: write an ADR first.
8. `POST /notifications/push-token` stores tokens, but nothing sends a push yet.
9. The `dev` working copy has an uncommitted change adding `latitude`/`longitude` to bookings — ask the
   human whether it's ready to commit before building on it.
Why: Rule 9 (no done work with failing tests) can't be followed until the suite runs; mobile depends on a
stable contract.
Action needed in this workstream: Suggested order: (2) → (1) with Mongo test fixtures and booking-state
tests → (3)(5) cleanup → (6) central transition table → ADR for (7). Also review the "Missing endpoints"
section in `docs/plans/mobile-app.md` once the human approves it.
Contract ref: contracts/API_CHANGES.md#baseline

## [DONE] AR-002 — HOTFIX: disable self-service password reset (account takeover, SU-002)
From: architect | Date: 2026-10-28 | Priority: breaking
What changed: The human approved (2026-10-28, in the architect chat: "Approved: disable self-service
password reset in prod (hotfix)") switching off self-service password reset. Today
`POST /auth/password-reset` sets a new password and returns a token for any matching email + phone, with
no OTP. Anyone can take over any account, admin included. Root cause and repro: architect inbox SU-002.
Why: Account takeover on the live site. This is the interim fix from ADR 0003 §8. The real OTP-based
reset comes later with the refresh-token work, after the ADR is accepted.
Action needed in this workstream (do this before any other work; keep the diff minimal):
1. Add a setting `password_reset_self_service_enabled: bool`, default **False**, and add it to
   `.env.example`. Local devs can switch it on. Prod gets the default.
2. When it's off, both `POST /auth/password-reset/verify` and `POST /auth/password-reset` return
   **403** with the standard error body, code `PASSWORD_RESET_DISABLED` (new `AppErrorCode`), and message
   "Password reset is not available in the app yet. Please contact GharTak support." Check the flag
   **before** any DB lookup, so the response is identical for known and unknown accounts (this also
   closes the account-existence leak from `/verify`).
3. Tests (Rule 9): with the flag off, both endpoints give 403 + the code and the password is unchanged;
   with it on, behaviour is unchanged. If the suite still can't run (OR-001 #1), add the tests anyway and
   say in the handoff that they're unrun. Don't block the hotfix on the suite rewrite.
4. Contract: re-export `openapi.json` (add `responses={403: ...}` on both routes) and add an
   `API_CHANGES.md` section. It isn't a breaking schema change, but behaviour changes for web (the admin
   panel's "forgot password" now gets 403).
5. Commit only your files as `AR-002`. The checkout has the human's uncommitted booking/frontend edits;
   leave them alone. `/handoff`: infrastructure (deploy to prod; confirm which branch Render deploys
   from), web (show the support message), support (verify on prod), architect (info).
Acceptance criteria: on prod, both endpoints return 403 `PASSWORD_RESET_DISABLED` for any input, and
an existing account's password still works afterwards.
Not in scope: the OTP reset flow, min-length 8, token revocation, rate limits (ADR 0003, later).
Contract ref: contracts/API_CHANGES.md#ar-002 (backend adds it)

Progress note (backend, 2026-10-28): items 1 and 2 done as BE-001/BE-002. Remaining: 3, 5 (need approval
to delete files, Rule 11), 6, 7 (ADR), 8, 9 (human decides the lat/long commit); 4 is infrastructure's.
