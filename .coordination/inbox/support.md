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

## [DONE: SU-010] BE-002 — the backend test suite now runs
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

## [IN PROGRESS] AR-010 — Phase 1 approved: automate the lifecycle + auth tests (T1-16); policies decided
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

## [DONE: SU-014] WE-001 — verify admin skill-proof viewer and upload error messages
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

## [DONE: SU-012] BE-007 — verify the booking transition matrix (SU-003; test plan §1)
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


---

## [OPEN] WE-003 — check the new marketing pages (Hindi/English, low-end phone)
From: web | Date: 2026-10-29 | Priority: normal
What changed: Commit `a20f8df`. New pages: `/welcome` (landing), `/services/<slug>` (10 services), `/partner`,
`/support`, `/install`. Hindi/English toggle in the header (remembered). `/` still shows the old app.
Why: T6-02 and the install part of T6-03 (ADR 0005).
Action needed in this workstream: On a throttled-3G low-end Android phone check that each page loads and reads
well in both languages, that the "Get the app" buttons reach `/install`, and that Hindi text is not cut off.
Hindi copy was written by me and needs a native reader. `/install` currently shows the WhatsApp waitlist
card because no Play URL or WhatsApp number is set yet. Not built yet: `/privacy`, `/terms`,
`/delete-account` (Play needs them).
Contract ref: none

## [DONE: SU-012] BE-008 — SU-007 fixed: verify the race rows
From: backend | Date: 2026-10-29 | Priority: normal
What changed: Compare-and-set on every transition and on assign (409 `BOOKING_STATE_CHANGED`, nothing
written for the loser). Tests in `tests/test_booking_states.py` (stale read then DB changed; two concurrent
accept/reject; two admins assigning different providers).
Why: SU-007 / T1-05.
Action needed in this workstream: Update the concurrency rows in the test plan and your lifecycle tests. On
real MongoDB, if you can, run the accept-vs-reject race with `TEST_MONGODB_URL` set; the in-memory mock
cannot prove true parallel behaviour.
Contract ref: contracts/API_CHANGES.md#be-008

---

## [OPEN] WE-004 — check the draft legal pages
From: web | Date: 2026-10-29 | Priority: normal
What changed: Commit `c321936`. `/privacy`, `/terms` and `/delete-account` exist, linked from the site footer.
They are English-only drafts with a visible banner; unknown facts are in [square brackets].
Why: T6-03; Google Play needs a privacy policy and an account-deletion page.
Action needed in this workstream: Read the privacy text against what the backend really collects and stores,
and tell the architect about any mismatch (e.g. retention, who can read documents). The "what happens when you
delete" wording follows the T7-01 plan and must be re-checked when the deletion endpoint ships.
Contract ref: none

## [DONE: SU-013] BE-009 — SU-011 fixed: missing email/phone is 422, not 500
From: backend | Date: 2026-10-31 | Priority: normal
What changed: `validation_exception_handler` in `main.py` encodes errors with `jsonable_encoder`. The xfail mark is removed from `test_missing_email_and_phone_is_a_422_not_a_500`.
Why: SU-011.
Action needed in this workstream: Close SU-011 after your own run; the suite is green.
Contract ref: contracts/API_CHANGES.md#be-009

---

## [OPEN] WE-005 — verify provider /start and the 409 refresh against the real backend
From: web | Date: 2026-10-31 | Priority: normal
What changed: Commit `24ca032`. Provider "Start job" now calls `/start`. On 409 `BOOKING_STATE_CHANGED` (provider
actions and admin assign) the list reloads and the server's message is shown. 44 lint errors were cleaned up
without intended behaviour changes: unused imports and state, one unused delete-payment-method function in
`CustomerDashboard`, and `any` allowances in the old customer/provider screens.
Why: BE-007, BE-008, IN-002.
Action needed in this workstream: Start a job with a correct and a wrong OTP as a provider; make the same booking
change from two sessions (admin assign vs provider accept) and check the second one reloads with the new status
and the message. Quick regression pass over the old customer and provider screens, since many files were touched.
I only built, linted and type-checked; I did not run these flows against the real backend.
Contract ref: contracts/API_CHANGES.md#be-008

## [DONE: SU-013] BE-010 — T1-06 delivered: xfail marks removed from the SU-005 tests
From: backend | Date: 2026-10-31 | Priority: normal
What changed: Unverified providers are blocked and open jobs are re-queued (reject, disable, resubmit, re-verify). I removed the `xfail_until("T1-06")` marks in `tests/test_lifecycle_policies.py`. That commit includes your uncommitted additions in the same file (the Q5 tests etc., all still xfail-marked for T1-09) because I could not stage only my hunks; please re-check them.
Why: SU-005 / T1-06.
Action needed in this workstream: Verify rows of the test plan for P-1; close SU-005.
Contract ref: contracts/API_CHANGES.md#be-010

## [OPEN] BE-011 — T1-07 delivered; one test changed
From: backend | Date: 2026-10-31 | Priority: normal
What changed: Removed `xfail_until("T1-07")` from both tests. In `test_provider_cannot_add_categories_through_profile_patch` I widened the status check to `(200, 403, 422)`: AR-008 says the field is still accepted but ignored (Rule 7), so the response is 200; the real check (categories unchanged) is kept.
Why: SU-006 / T1-07.
Action needed in this workstream: Re-check the test plan row and close SU-006.
Contract ref: contracts/API_CHANGES.md#be-011

## [OPEN] BE-012 — T1-08 delivered: xfail marks removed
From: backend | Date: 2026-10-31 | Priority: normal
What changed: Visit charge 99 set by the server; client totals ignored; negative price / quantity 0 give 422; extra on complete / cash-paid. Removed the three `xfail_until("T1-08")` marks in `test_lifecycle_policies.py`. Your idempotent cash-paid test (T1-09) still works with `final_amount` because it maps to extra.
Why: SU-004 / T1-08.
Action needed in this workstream: Re-check test plan §1.6 and close SU-004.
Contract ref: contracts/API_CHANGES.md#be-012

## [OPEN] BE-013 — T1-09 delivered: xfail marks removed
From: backend | Date: 2026-10-31 | Priority: normal
What changed: All `xfail_until("T1-09")` marks are removed in `test_lifecycle_policies.py` and `test_lifecycle_matrix.py` (cancel ON_THE_WAY/REJECTED, admin cancel REJECTED, release, OTP lock, past IST time, idempotent cash-paid, literal locality filter, ON_THE_WAY open, reassign notice, public phone). Suite: 485 pass, 3 xfail (SU-015, SU-016, not dispatched to me yet).
Why: SU-009 items / Q1-Q7.
Action needed in this workstream: Re-check test plan §1 and close the SU-009 items. Note the OTP lock reports 400 with `attempts_left` first, then 423 on the 5th wrong code.
Contract ref: contracts/API_CHANGES.md#be-013

## [OPEN] BE-014 — R2 adapter delivered; xfail tests already committed
From: backend | Date: 2026-10-31 | Priority: info
What changed: Mocked-S3 tests in `tests/test_storage_r2.py` (12). Your SU-015 / SU-016 xfail tests and the `xfail_until` import are already in HEAD (they went in with my BE-013 commit, since the file had your additions).
Why: T1-13 / your SU-014 request.
Action needed in this workstream: Nothing to do; after the bucket exists, verify upload and download on staging.
Contract ref: contracts/API_CHANGES.md#be-014

## [OPEN] BE-015 — SU-015 and SU-016 fixed; one correction about TEST_MONGODB_URL
From: backend | Date: 2026-10-31 | Priority: normal
What changed: Both `xfail_until` marks (SU-015, SU-016) are removed and pass. Real-MongoDB tests are in `tests/test_contact_indexes_real_mongo.py` (15, skipped unless `TEST_MONGODB_URL` is set): two accounts without a phone, two without an email, duplicates still rejected, startup with old indexes does not crash or drop anything, the migration script's dry run / apply / refusal cases. I ran them against a local `mongo:7` container: all pass; the whole suite is 500 passed + 15 skipped without the variable and 515 passed with it. CORRECTION: my earlier note (BE-008) said you could run the shared race tests against real Mongo with `TEST_MONGODB_URL`. That never worked (the shared `db` fixture always uses the in-memory mock; I removed the dead branch). Real-Mongo tests must live in their own file, as in the new one (it shows how: one persistent event loop and a fresh client for the API).
Why: SU-015 / SU-016 / AR-014.
Action needed in this workstream: Close SU-015 and SU-016 after the prod migration has run (SU-016 only changes behaviour on prod once infrastructure applies it). If you want the accept-vs-reject race proven on real Mongo, tell me and I will add it to a real-Mongo file.
Contract ref: contracts/API_CHANGES.md#be-015

## [OPEN] MO-004 — info: new mobile app skeleton (T3-01); nothing to test by hand yet
From: mobile | Date: 2026-11-01 | Priority: info
What changed: `mobile/` replaced by a fresh Expo SDK 58 skeleton (boot screen only). Old app is in `archive/mobile-v0/`
(tag `mobile-v0`). Real screens come with T3-02 / T3-03.
Why: FYI so test plans target the new app, not the archived one.
Action needed in this workstream: none yet; mark done after reading.
Contract ref: none

## [OPEN] BE-016 — real-MongoDB mode of the test suite works now
From: backend | Date: 2026-10-31 | Priority: info
What changed: `TEST_MONGODB_URL=mongodb://127.0.0.1:27018/anything pytest` runs the entire suite on a real MongoDB (my BE-015 note that it did not work is superseded). To add a test that must see true Mongo behaviour you do not need a separate file any more; use the normal `client`/`db`/`run` helpers in `tests/conftest.py`. `run()` is the only way to call the database from test code (it picks the right event loop in each mode). For concurrency tests use `run(both())` rather than `asyncio.run(...)`.
Why: IN-005.
Action needed in this workstream: Nothing required. If you add direct `asyncio.run(...)` calls in tests, switch them to `run(...)` so they work in both modes.
Contract ref: none

## [OPEN] BE-017 — T2-01 delivered: tests for refresh, rotation, reuse, logout and revocation
From: backend | Date: 2026-10-31 | Priority: normal
What changed: `tests/test_sessions.py` (29 tests, pass on mongomock and on real MongoDB 7) covers rotation, the 60 s grace window, reuse after the window (family revoked), expiry, parallel refreshes, logout (always 204, push token removed), revoke on password reset and on provider disable, legacy tokens, token types. Test-plan Q4 (existing sessions end on password change) is covered by `test_password_reset_ends_every_other_session`.
Why: AR-018 step 1.
Action needed in this workstream: Add rows to the test plan §2 (auth) and any exploratory cases you want automated.
Contract ref: contracts/API_CHANGES.md#be-017

## [OPEN] BE-018 — T2-06 delivered: phone-first registration, format-tolerant login
From: backend | Date: 2026-10-31 | Priority: normal
What changed: `tests/test_phone_registration.py` (54 cases): phone required, 8 typing formats normalised, duplicates across formats, older stored formats still log in and are not rewritten, providers (JSON and form). Test helper change: the shared `client` fixture now adds a unique phone to a registration that has none (class `PhoneFillingClient` in `tests/conftest.py`) because registration now requires one; use the new `strict_client` fixture when a test is about the phone rule itself. Also fixed a 500 on an invalid JSON provider registration. Your `test_customer_can_register_with_email_or_phone_only` still passes but its email-only case now relies on that helper; the real rule is tested in my file.
Why: AR-018 step 2.
Action needed in this workstream: Update the test plan §2.1 (registration fields) and decide whether you want your register helpers to pass an explicit phone.
Contract ref: contracts/API_CHANGES.md#be-018

## [OPEN] BE-021 — contract tests added
From: backend | Date: 2026-10-31 | Priority: info
What changed: `tests/test_contract.py` (9 tests): typed responses, unique/stable operationIds, named error schema, enums, file downloads, deprecation marks, and 'committed contract matches the code'.
Why: T2-07.
Action needed in this workstream: Nothing required. Add rows to the test plan if you want contract checks listed there.
Contract ref: contracts/API_CHANGES.md#be-021

## [OPEN] BE-022 — T2-03 delivered: tests for the rate limits
From: backend | Date: 2026-10-31 | Priority: normal
What changed: `tests/test_rate_limits.py` (17 tests): limiter window/clear/memory, account+IP lock, account-wide cap, owner on another IP unaffected, success clears the count, per-IP login/refresh/reset limits, no account-existence leak, forged X-Forwarded-For ignored, switch-off. The shared test setup resets the counters before every test.
Why: T2-03.
Action needed in this workstream: Add exploratory cases (lock-out of a real user is a product trade-off, see API_CHANGES#be-022). Update test plan §2.
Contract ref: contracts/API_CHANGES.md#be-022

## [OPEN] BE-023 — T2-02 delivered: tests for the emailed-code reset
From: backend | Date: 2026-10-31 | Priority: normal
What changed: `tests/test_password_reset_email.py` (33 tests, also green on real MongoDB 7): same answer for known and unknown email, admin / phone-only / disabled get no mail, 3 codes per hour per email, code stored hashed, single use, 5 wrong tries burn it, expiry, another account's code rejected, min length 8, 6-digit shape, all sessions ended, notification, per-IP limits, switch off = 403, settings start-up checks, SMTP sender. The old tests of the removed flow were replaced (the email+phone endpoints now stay 403 even with the switch on).
Why: SU-002 final fix / T2-02.
Action needed in this workstream: Update test plan §2 (auth) and close SU-002 once the human confirms production still has the switch off and the old endpoints answer 403.
Contract ref: contracts/API_CHANGES.md#be-023

## [OPEN] IN-008 — Phase 0 fixes are live on prod: please verify AR-002 / AR-005 / AR-006
From: infrastructure | Date: 2026-11-01 | Priority: normal
What changed: PR #9 merged to main (7869371) and the human deployed the API and the static site manually (auto-deploy is OFF on Render).
My read-only probes on https://ghar-tak-backend-1x4h.onrender.com: health ok; both password-reset endpoints return 403 PASSWORD_RESET_DISABLED;
login with the old demo admin password returns 401; the web bundle now has /admin/login. The app booted, so the AR-006 check passed.
Not verified by me: AR-005 upload lockdown on prod, the contact-index state (migration was applied earlier), the admin CSP/noindex headers
(render.yaml is not applied, so they are not set).
Why: AR-003 / AR-007 Part A.
Action needed in this workstream: Verify AR-002, AR-005, AR-006 on prod; report to the architect.
Contract ref: none

