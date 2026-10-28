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

## [DONE] AR-005 — T0-05: lock down file uploads; make skill proofs private (SU-008)
From: architect | Date: 2026-10-29 | Priority: breaking
What changed: The human approved starting Phase 0 of `docs/plans/roadmap-tickets.md` ("start with the phase
0 tickets", 2026-10-29). This is ticket T0-05. Bug detail: architect inbox SU-008.
Why: Today a file named `x.html` sent as `image/png` is stored under the client's extension and served
from the API origin at `/uploads/...`. That's stored XSS on our domain. Skill-request proofs are written
outside `uploads/public`, so admins get 404, and if fixed naively they'd be public.
Action needed in this workstream (do this before other OR-001 items; Rule 1):
1. One shared upload validator used by **every** upload route (customer photo, provider photo,
   documents, Aadhaar, bank proof, skill proof, provider registration form):
   - allow-list per route: photos jpg/png/webp; documents jpg/png/webp/pdf
   - check magic bytes (sniff the real type; don't trust `content_type` or the filename)
   - size cap from settings (suggest 5 MB photos, 10 MB documents)
   - the stored name is always `<uuid>.<ext from the sniffed type>`; never reuse the client's extension
   - 415 `UPLOAD_TYPE_NOT_ALLOWED` / 413 `UPLOAD_TOO_LARGE` with the standard error body
2. Skill proofs go to private storage (like Aadhaar) and are served through an authenticated route that
   only an ADMIN or the owning provider can read. `proof_url` points to that route.
3. Public static serving: only image types are served from `/uploads`. Set `X-Content-Type-Options:
   nosniff` on that mount.
4. Go through the storage adapter (`services/storage.py`), not new direct `open()` calls, so the R2
   move (T1-13) only swaps the adapter.
5. Don't move or delete existing files on prod (Rule 11). Write a read-only script
   `scripts/audit_uploads.py` that lists files in `uploads/` whose extension or sniffed type isn't
   allowed. Infrastructure runs it on prod and the human decides what to remove.
6. Tests (Rule 9): disguised HTML rejected; oversize rejected; valid jpg/pdf accepted and stored with
   our extension; skill proof readable by admin and owner, 403 for another provider/customer, 401
   anonymous. Rows in test plan §3.2.
7. Contract: re-export `openapi.json` and add `API_CHANGES.md#ar-005`. New error codes, plus
   `proof_url` now needs auth, so web's admin panel must fetch it as a blob like Aadhaar. Tell web in
   the handoff.
Acceptance criteria: test plan §3.2 rows 4–5 pass; all upload routes use the validator (grep shows no
other `open(..., "wb")` in routes); the full suite stays green.
Commit as your next BE-xxx ("AR-005" in the message), and leave the human's uncommitted booking edits
alone. `/handoff` to web (admin proof viewer), infrastructure (run the audit script on prod, deploy),
support (verify), and architect.
Contract ref: contracts/API_CHANGES.md#ar-005 (backend adds it)

## [DONE] AR-006 — T0-06: refuse to boot with the default JWT secret outside local (SU-009 #7)
From: architect | Date: 2026-10-29 | Priority: breaking
What changed: Phase 0 ticket T0-06, approved by the human (2026-10-29).
Why: `core/config.py` defaults `jwt_secret_key` to `"change-this-local-secret"`. If prod ever starts
without the env var, anyone can forge admin tokens.
Action needed in this workstream:
1. At settings load: if `environment != "local"` and the secret is the default, empty or under 32 chars,
   raise a clear error and refuse to start. Do the same for an empty `MONGODB_URL`.
2. `.env.example`: a placeholder secret plus a comment on generating one
   (`python -c "import secrets; print(secrets.token_urlsafe(48))"`).
3. Tests: boot fails in `production` with the default secret; boot works in `local`; tests keep running.
4. **Coordinate with infrastructure before this deploys.** They must confirm prod has a strong
   `JWT_SECRET_KEY` and `ENVIRONMENT` set, or this change would take prod down. Say so in the handoff.
Acceptance criteria: tests above pass; infrastructure confirms the prod env before the deploy.
Commit with "AR-006" in the message. `/handoff` to infrastructure and architect.
Contract ref: none

## [OPEN] AR-008 — Phase 1 backend tickets (approved) + commit the human's lat/long change
From: architect | Date: 2026-10-29 | Priority: normal
What changed: The human approved Phase 1 and policies P-1..P-4, with P-2 changed to a ₹99 launch offer,
and accepted ADRs 0003–0006 (2026-10-29, architect chat). Q-W5: "Commit backend part only". Details:
`docs/plans/roadmap-tickets.md` (Phase 1 + policy table), `docs/plans/open-questions.md`.
Why: To make the booking rules correct and safe before the app is built on them. This also answers your
BE-002 question: admins **are** bound by the central transition table.
Action needed in this workstream, in this order (one commit and `/handoff` per ticket):
0. **Commit the human's uncommitted lat/long change** in `schemas/booking.py` + `services/bookings.py`
   (approved). Add a test that the fields round-trip, plus contract re-export + `API_CHANGES.md`
   (additive). Don't touch the frontend files; web parks those.
1. **T1-04 (SU-003, OR-001 #6):** one transition table for customer, provider and admin. Admin targets
   are limited to CANCELLED_BY_ADMIN (from REQUESTED/ACCEPTED/ON_THE_WAY/IN_PROGRESS) and COMPLETED
   (from IN_PROGRESS); anything else gives 422 `BOOKING_INVALID_STATUS`. `/in_progress` stays as a
   deprecated alias of `/start` (Rule 7: mark it deprecated in OpenAPI). Flip
   `test_known_gap_admin_can_force_any_status_transition` to expect 422.
2. **T1-05 (SU-007):** compare-and-set on the current status for every transition and for assign
   (`modified_count == 1`, else 409 `BOOKING_STATE_CHANGED`).
3. **T1-06 (SU-005, policy P-1):** a provider who isn't VERIFIED gets 403 on every booking action.
   - On reject, disable or resubmit: their REQUESTED/ACCEPTED/ON_THE_WAY bookings go back to unassigned
     REQUESTED, with history and notifications to the customer and admins.
   - IN_PROGRESS bookings stay put and are flagged for admin.
4. **T1-07 (SU-006):** remove `category_ids` from the provider self-update (keep accepting the field
   for one release but ignore it, and document that); resubmit validates categories against active
   ones.
5. **T1-08 (SU-004, policy P-2 as changed):** the client never sends prices.
   - Every booking gets `visit_charge` = setting `LAUNCH_VISIT_CHARGE_INR` (default 99) and
     `offer_ends_at` (optional).
   - At complete/cash-paid the provider may enter `extra_amount ≥ 0` + `extra_note`.
   - `final_amount = visit_charge + extra_amount`.
   - Client-sent `total_amount`/item prices are ignored; keep the fields for one release (Rule 7) and
     document that they're ignored.
6. **T1-09 (SU-009 items 1–6, 8, 9; policies P-3/P-4):** start-OTP lock after 5 wrong tries (admin
   reset), aware-datetime handling, idempotent cash-paid, `re.escape` in `$regex`, ON_THE_WAY counted as
   open, notify the old provider on reassign.
   - New `PATCH /provider/bookings/{id}/release` {reason}: ACCEPTED/ON_THE_WAY → unassigned REQUESTED,
     admins notified.
   - Customer cancel allowed in ON_THE_WAY (provider notified).
7. **T1-13 backend part:** an R2 implementation of the storage adapter (S3 API, signed URLs for
   private files). Start once infrastructure has the bucket.
Also: **BE-005 deleted files** (`drop_cat.py`, `test_cat.py`, `app/models`). Rule 11 says ask the human
first. They're dead and recoverable from git, so no action, but ask before any future deletion.
Acceptance criteria: the matching rows of `docs/qa/test-plan.md` pass for each ticket; the suite stays
green; every contract change is in `API_CHANGES.md` with clients named.
Contract ref: contracts/API_CHANGES.md (one section per ticket)
