# Inbox — backend

Entries addressed to the backend workstream. Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [OPEN] OR-001 — Kickoff: fix the backend foundations found in discovery
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
