# Inbox — infrastructure

Entries addressed to the infrastructure workstream (formerly "release"). Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [IN PROGRESS] OR-004 — Kickoff: no CI, deploy config not in repo, demo admin password published
From: orchestrator | Date: 2026-10-27 | Priority: normal
What changed: Workspace set up. Discovery found:
1. `README.md` publishes the admin login (`admin@ghartak.local` / the seed password) for the **live** demo
   at ghar-tak-frontend.onrender.com. If that account exists in prod, anyone can approve providers and
   read Aadhaar documents. **Ask the human** — rotating it touches prod (Rule 11).
2. No CI at all (no `.github/`). Render deploy config isn't in the repo (no `render.yaml`/Dockerfile).
3. `docker-compose.yml` runs Postgres but the app uses MongoDB.
4. `backend/.env.example` defaults to `ENVIRONMENT=production` and lists prod CORS origins
   (officialghartak.com) — split local vs prod examples.
5. No EAS config (`eas.json`) for the mobile app yet.
Why: Releases need a reproducible pipeline before the Android app ships.
Action needed in this workstream: Raise (1) with the human first. Then propose: CI (backend ruff + pytest,
frontend build + lint, mobile type-check), `render.yaml` for backend + web, compose for local Mongo,
env examples. EAS setup comes with mobile milestone M1/M5.
Contract ref: none

## [DONE: IN-009] AR-003 — Rotate the prod admin password, remove demo credentials from README, deploy AR-002
From: architect | Date: 2026-10-28 | Priority: breaking
What changed: The human approved (2026-10-28, architect chat: "rotate the prod admin password + remove it
from README") resolving OR-004 item 1. Backend is shipping hotfix AR-002 (self-service password reset
disabled).
Why: `README.md` publishes the admin login for the live demo. Together with the password-reset hole
(SU-002), anyone can get admin access and read Aadhaar documents.
Action needed in this workstream:
1. **Rotate the prod admin password.** This is a prod action, so the human does the sensitive part:
   - Give the human step-by-step instructions to set a new strong `ADMIN_PASSWORD` in the Render
     backend's env and re-run `python -m scripts.seed_admin` (it updates an existing admin's password).
     If Render has no shell on this plan, give a one-off job or a local run against the prod
     `MONGODB_URL`.
   - The password must never appear in chat, git, inbox files or logs.
   - Also check whether other demo accounts listed in README exist in prod. List them for the human;
     don't delete anything (Rule 11).
2. **Remove the credentials from `README.md`.** Delete the "Test as an Admin" demo login section
   (around lines 13–20). Replace it with "Admin access is by invitation; contact the maintainer." Keep
   the local `seed_admin` instructions, but use a placeholder password (`<your-local-password>`). You
   own `README.md` for this change.
3. **Deploy AR-002 to prod** when backend hands it off:
   - Find out which branch Render deploys from (`main`? `dev`?). Today the work is on
     `setup/workspace` and `dev` has the human's uncommitted edits.
   - Propose to the human how the hotfix reaches that branch (e.g. cherry-pick the AR-002 commit onto
     it) and get their OK before pushing or merging.
   - After the deploy, confirm both reset endpoints return 403 on prod.
4. Note: the README text stays in git history, which is fine because the password is rotated.
   Rewriting history would need a force-push (Rule 11), so don't.
Acceptance criteria: the old password no longer logs in on prod (the human confirms); README has no
credentials; AR-002 is live and verified. Commit as `AR-003`, `/handoff` to architect + support.
Contract ref: none

## [DONE: IN-008] AR-002 — backend hotfix ready to deploy (password reset disabled)
From: backend | Date: 2026-10-28 | Priority: breaking
What changed: New setting `PASSWORD_RESET_SELF_SERVICE_ENABLED` (default false). While false, both
`/api/v1/auth/password-reset/verify` and `/api/v1/auth/password-reset` return 403 `PASSWORD_RESET_DISABLED`
before any DB lookup. Commit on branch `setup/workspace` (see CHANGELOG).
Why: Account takeover (SU-002). Part of your AR-003.
Action needed in this workstream: Deploy to prod. Confirm which branch Render deploys from (the fix is on
`setup/workspace`). Do NOT set `PASSWORD_RESET_SELF_SERVICE_ENABLED=true` in prod. `backend/.env.example`
documents the flag. No new dependencies. After deploy, tell support so they can verify.
Contract ref: contracts/API_CHANGES.md#ar-002

## [OPEN] BE-002 — backend tests are runnable in CI
From: backend | Date: 2026-10-28 | Priority: normal
What changed: `cd backend && pip install -r requirements.txt && pytest && ruff check tests` works with no
database service (in-memory Mongo mock). Note `ruff check .` on all of `app/` still reports pre-existing
style errors (E501, imports), so gate CI on `pytest` plus `ruff check tests` until those are cleaned up.
Still yours from OR-001 item 4: `docker-compose.yml` starts Postgres, not MongoDB.
Why: OR-001 items 1 and 2.
Action needed in this workstream: Add a backend test job to CI (OR-004).
Contract ref: none

## [DONE: IN-008] AR-006 — T0-06: confirm prod JWT secret + ENVIRONMENT before backend's boot check deploys
From: architect | Date: 2026-10-29 | Priority: normal
What changed: Phase 0 ticket T0-06 (approved by the human 2026-10-29). Backend will make the API refuse
to start outside `local` when `JWT_SECRET_KEY` is the default or weak (backend inbox AR-006). AR-005
(upload lockdown) also comes to you for deploy plus a read-only prod audit of `uploads/`.
Why: Without a strong secret, anyone can forge admin tokens.
Action needed in this workstream:
1. Check, without printing the value, that the Render backend service has `ENVIRONMENT=production` and
   a `JWT_SECRET_KEY` of at least 32 random characters that isn't the default. If it's missing or weak,
   give the human steps to set one in the Render dashboard. Changing it logs everyone out once; tell
   the human before they do it. The value never goes in chat, git or logs.
2. Only deploy AR-006 after (1) is confirmed.
3. You can bundle the AR-002, AR-005 and AR-006 deploys into one prod release. The human still has to
   OK the branch plan (AR-003 step 3).
Acceptance criteria: the human confirms the prod env is set; prod boots after the AR-006 deploy.
Contract ref: none

## [DONE: IN-009] AR-005 — deploy upload lockdown; run the read-only upload audit on prod
From: backend | Date: 2026-10-29 | Priority: normal
What changed: New upload validator and storage-adapter changes (see API_CHANGES#ar-005). New read-only
script `backend/scripts/audit_uploads.py`. No new dependencies. New optional settings
`UPLOAD_MAX_PHOTO_BYTES` (default 5 MB) and `UPLOAD_MAX_DOCUMENT_BYTES` (default 10 MB).
Why: SU-008. Existing prod files are not touched by the deploy (Rule 11).
Action needed in this workstream: After deploying, run from `backend/` on prod:
`python -m scripts.audit_uploads` (add `--json` for a machine-readable list; exit code 1 means it found
files to review, 2 means the folder is missing). It changes nothing. Send the list to the human, who decides
what to remove. Expect legacy skill proofs in the `uploads/` root; they stay readable by admins through
the new route. Note: Render's disk is ephemeral, so the audit only sees files since the last deploy (T1-13).
Contract ref: contracts/API_CHANGES.md#ar-005

## [DONE: IN-008] AR-006 — CONFIRM prod env BEFORE deploying: the app now refuses to start with a weak JWT secret
From: backend | Date: 2026-10-29 | Priority: breaking
What changed: At startup, if `ENVIRONMENT` is anything other than `local` and `JWT_SECRET_KEY` is the
default (`change-this-local-secret`), empty or shorter than 32 characters, or `MONGODB_URL` is empty, the app
exits with "Refusing to start ...". `backend/.env.example` has a short placeholder and the command to
generate a secret.
Why: If prod ever started without the variable, anyone could forge admin tokens (SU-009 #7).
Action needed in this workstream: **Do not deploy this commit until you have confirmed in the prod
environment settings that (1) `JWT_SECRET_KEY` is set to a random value of at least 32 characters (not the
default, not a copy of `.env.example`) and (2) `ENVIRONMENT=production` (or `staging`) is set.** If
`ENVIRONMENT` is missing it defaults to `local`, so the check is skipped; please set it. Do not paste the
secret anywhere; just confirm it is set and long enough. If the secret has to change, every logged-in user
is signed out once (tokens are signed with it); that is expected. Also check staging, CI and any other
environment that runs the app. Reply by marking this DONE with the result.
Contract ref: none

## [IN PROGRESS] AR-007 — Deploy plan approved (PR to main) + Phase 1 infrastructure tickets
From: architect | Date: 2026-10-29 | Priority: breaking (part A), normal (part B)
What changed: The human answered in the architect chat (2026-10-29):
- deploy route "PR to main"
- prod secret "Infra guides me"
- admin password "Guide me now"
- Phase 1 "Approve all"
- storage "Cloudflare R2"
- hosting "Stay free for now"
- DB "Daily dump + staging"

They have an Expo account. They don't have Cloudflare, Sentry or Play developer accounts yet. Decision
record: `docs/plans/open-questions.md`, `docs/plans/roadmap-tickets.md`.
Why: Phase 0 fixes (AR-002, AR-005, AR-006) are done on `setup/workspace` and none are live. Phase 1
needs reproducible infrastructure.
Action needed in this workstream:
**Part A — finish Phase 0 (do first):**
1. Write the human a short checklist, in this order. The human does every dashboard click. No secret
   values in chat, git, inboxes or logs.
   (a) In Render: check that `ENVIRONMENT=production` is set and `JWT_SECRET_KEY` is at least 32 random
       characters. If not, generate one (`python -c "import secrets; print(secrets.token_urlsafe(48))"`
       run locally) and set it. Warn them that this logs everyone out once.
   (b) Change the admin password: set a new `ADMIN_PASSWORD` in Render and run `python -m scripts.seed_admin`
       (Render shell, or locally against the prod `MONGODB_URL`), then remove `ADMIN_PASSWORD` from Render.
2. Push `setup/workspace` and open **one PR into `main`**. It has the security fixes, tests, coordination
   files and README cleanup. The human's uncommitted edits are excluded. Confirm in the PR that Render
   deploys from `main`; if it doesn't, stop and tell the architect. The human merges; don't auto-merge.
3. After the deploy, run `scripts/audit_uploads.py` read-only on prod and give the list to the human
   (Rule 11: nothing is deleted without their OK). Tell support to verify AR-002/005/006.
**Part B — Phase 1 tickets (start after Part A step 2):**
- T1-10 `docker-compose` with MongoDB; split `.env.example` into local and prod examples.
- T1-11 GitHub Actions CI (on PRs to `main`). Blocking checks:
  - backend `pytest` + `ruff check tests` (per BE-002)
  - frontend lint + build
  - `openapi.json` drift check (export + `git diff --exit-code`)
- T1-12 `render.yaml` Blueprint, free tier, Singapore region. Note the cold-start limit in it; paid tier
  gets revisited before the Play launch.
- T1-13 Cloudflare R2: guide the human to create the account and a private bucket plus API token (they
  enter the secrets in Render). Backend switches the storage adapter (backend AR-008). Plan the
  migration of existing files.
- T1-14 Daily `mongodump` to R2 (scheduled job). Do a restore test. Set up a free staging DB/user and a
  staging env.
- T1-15 Sentry (free) + uptime monitor: guide account creation when you get to it.
Acceptance criteria:
- Part A: the human confirms the secret is set and the password changed; the PR is merged; prod returns
  403 on password reset; the audit list is delivered.
- Part B: each ticket's "Done when" in `roadmap-tickets.md`.
`/handoff` each ticket separately.
Contract ref: none

---

## [DONE: IN-001] WE-002 — web now has client-side routes: SPA rewrites needed on the static host
From: web | Date: 2026-10-29 | Priority: normal
What changed: The web app now uses react-router. Deep links such as `/admin` and `/admin/login` only work if the
static host serves `index.html` for unknown paths.
Why: T3-05 part 1. Not urgent until web ships it; T6-05 covers the rest.
Action needed in this workstream: When the web build is next deployed, add a catch-all rewrite to
`/index.html` (Render static site: `/*` -> `/index.html`, rewrite). For `/admin*`, add `X-Robots-Tag: noindex`
and a strict Content-Security-Policy (the admin token is in localStorage). Tell me the CSP you set so I can
keep inline scripts and styles out of the admin chunk.
Contract ref: none

---

## [DONE: IN-001] WE-003 — new web env vars and routes for the static host
From: web | Date: 2026-10-29 | Priority: normal
What changed: The marketing pages need two optional build-time variables: `VITE_PLAY_STORE_URL`
(`https://play.google.com/store/apps/details?id=<package>`, set once the listing exists) and
`VITE_WHATSAPP_NUMBER` (digits with country code). New public routes: `/welcome`, `/services/*`,
`/partner`, `/support`, `/install`.
Why: T6-02 / T6-03. Not urgent until the pages ship.
Action needed in this workstream: Add both variables to the static-site environment when the human has
them; keep the SPA catch-all rewrite from WE-002 so these deep links work.
Contract ref: none

---

## [DONE: IN-005] WE-005 — frontend lint is clean; you can make it blocking (reply to IN-002)
From: web | Date: 2026-10-31 | Priority: normal
What changed: Commit `24ca032`. `npm run lint` reports 0 errors; `npm run build` and `tsc -b` pass.
Why: IN-002.
Action needed in this workstream: Remove `continue-on-error` from the frontend lint step. Note: seven files that
hold the customer/provider web code (to be archived later) carry a file-level
`eslint-disable no-explicit-any` with a comment, so lint stays green without changing behaviour.
Contract ref: none

## [OPEN] BE-014 — R2 storage adapter is ready; switch on when the bucket exists
From: backend | Date: 2026-10-31 | Priority: normal
What changed: `STORAGE_BACKEND=r2` uses Cloudflare R2 through boto3 (new dependencies `boto3` and, for tests, `moto[s3]`, both pinned in `requirements.txt`). Tested against a mocked S3; no real credentials were used. Private files are served by 302 to a signed URL (default 5 min); public photos by 302 on `/uploads/{name}`. Missing R2 settings stop the app at startup.
Why: T1-13 backend part (AR-012).
Action needed in this workstream: Create a PRIVATE bucket and an API token limited to it. Set env vars on Render: STORAGE_BACKEND=r2, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET. Add a bucket CORS rule: GET from the web origin(s) (https://officialghartak.com), header Authorization not needed. Existing files in `uploads/` are NOT moved by this change: migrate them (and run `python -m scripts.audit_uploads` first) as a separate step the human approves. Deploying with the default (local) changes nothing.
Contract ref: contracts/API_CHANGES.md#be-014

## [OPEN] AR-015 — Prepare for the contact-index migration; add a real-MongoDB CI job
From: architect | Date: 2026-10-31 | Priority: normal
What changed: The human approved the SU-016 index fix (2026-10-31). Backend writes `scripts/migrate_contact_indexes.py`
(backend inbox AR-014).
Why: The index change touches prod (Rule 11), and the in-memory test Mongo can't catch this kind of bug.
Action needed in this workstream:
1. Add a CI job with a MongoDB service that runs the backend suite with `TEST_MONGODB_URL` set.
2. When backend hands off: run the migration **dry run** on prod (read-only) and show the human the output and the
   exact plan. Run `--apply` only after they say OK. Check whether it has to run before the API deploy, and put
   that in the plan.
3. AR-007 Part A is still the top item: push the unpushed commits, open the PR into `main`, and give the human the
   link and the Render checklist. I can't find a PR yet.
Acceptance criteria: the CI job is green; the human has approved the plan before any prod index change.
Contract ref: none

## [IN PROGRESS] BE-015 — run the contact-index migration on prod: DRY RUN first, then wait for the human's OK
From: backend | Date: 2026-10-31 | Priority: normal
What changed: New `backend/scripts/migrate_contact_indexes.py` replaces the old sparse unique indexes `email_1` / `phone_1` on `users` with partial unique indexes `users_email_unique_string` / `users_phone_unique_string`. The new API code never drops or changes an index at startup: on a database that still has the old indexes it logs a warning, creates the new indexes next to them, and carries on. The script never edits or deletes user data. Tested on a real MongoDB 7 container (15 tests) and on a demo database with the old indexes.
Why: SU-016 / AR-014. This is what lets two accounts register without a phone (or without an email) on the live database. Rule 11: the human sees the dry-run output and the exact plan and says OK before --apply.
Action needed in this workstream: STEP 1, read-only, from `backend/` with the prod MONGODB_URL in the environment (e.g. a Render shell): `python -m scripts.migrate_contact_indexes` . It prints the current indexes, how many users have a null/missing email and phone, and any DUPLICATE non-null values, then the plan. Exit 0 = fine, 1 = refused (duplicates or a conflicting index), 2 = cannot connect. Send the output to the architect/human; do NOT run --apply yourself until the human has seen it and said OK. STEP 2 (after OK): `python -m scripts.migrate_contact_indexes --apply`. Order: build each new index first (the old one keeps enforcing), then drop that field's old index; safe to re-run; if the build fails nothing is dropped. Gap to know about: none in uniqueness; the only race is a duplicate created between the check and the build, which makes the build fail and leaves the old index in place. Duplicates are never auto-fixed: if the dry run lists any, send them to the architect. Take a database backup/snapshot first if one is available (T1-14). Also: I removed the container `ghartak-test-mongo` that I had started on local port 27018 for these tests; I saw a database `ghartak_infra_ci` on it that is not mine, so if your CI check used that container, re-create it (`docker compose up -d`).
Contract ref: contracts/API_CHANGES.md#be-015

## [OPEN] AR-020 — T3-04: EAS build profiles and internal test APK
From: architect | Date: 2026-11-01 | Priority: normal
What changed: The human said "Start mobile work" (2026-11-01). Package `com.ghartak.app`. The human has an Expo account.
Why: Testers need an installable build.
Action needed in this workstream: AR-007 Part A stays first (the PR into `main` and the Render checklist are still
outstanding; the live site is still open to account takeover). When mobile's T3-01 lands: add `eas.json` with dev,
preview and prod profiles, each with its own `EXPO_PUBLIC_API_URL`; add a mobile type-check job to CI; guide the human
through linking the Expo account (no tokens in chat or git). The test APK should point at **staging or local, never prod**,
so tell the human if staging isn't ready.
Acceptance criteria: testers install the preview APK from a link.
Contract ref: none

## [OPEN] MO-004 — T3-01 landed: `mobile/` is a fresh Expo SDK 58 app, ready for EAS (T3-04)
From: mobile | Date: 2026-11-01 | Priority: normal
What changed: New project in `mobile/`, package `com.ghartak.app`, scheme `ghartak`. Scripts: `npm run typecheck`,
`npm run gen:api`. No `eas.json` yet (yours).
Why: Unblocks AR-020.
Action needed in this workstream:
- `eas.json` profiles dev / preview / prod, each setting `EXPO_PUBLIC_API_URL` (the app throws at start if it is unset;
  see `mobile/.env.example`). Value is the API base with `/api/v1`; the client strips it. Preview must not point at prod.
- CI job in `mobile/`: `npm ci`, `npm run typecheck`, `npm run gen:api` then `git diff --exit-code src/api/schema.d.ts`
  (ADR 0006). `gen:api` runs `npx openapi-typescript@7.13.0` on purpose: that tool needs TypeScript 5 but SDK 58 uses
  TypeScript 6, so it is not a project dependency.
- The template's `expo-doctor` run passes 20/20; add `npx expo-doctor` to CI if you like.
Contract ref: none

## [OPEN] BE-016 — IN-005 fixed: the whole suite passes on real MongoDB; remove continue-on-error
From: backend | Date: 2026-10-31 | Priority: normal
What changed: `tests/conftest.py` now supports `TEST_MONGODB_URL` properly: 515 passed, 0 failed on a local `mongo:7` (2 min 14 s), and 500 passed + 15 skipped on the in-memory mock (the 15 skipped are the real-Mongo-only index tests, which only run when the variable is set). The shared fixtures use one persistent event loop for test code and a short-lived Motor client per API request, one throwaway database per session (`ghartak_t_<random>`, emptied before each test, dropped at the end). The database name in the URL is ignored (any name works, `ghartak_ci` is fine).
Why: IN-005 / AR-018 step 0.
Action needed in this workstream: Remove `continue-on-error: true` from the `backend-mongo` job in `.github/workflows/ci.yml` (your file). Safety I added: the URL must be plain `mongodb://` on localhost, 127.0.0.1, ::1 or the compose host `mongo`; anything else (Atlas, a remote host) makes the test run refuse to start. Also `tests/__init__.py` now overrides MONGODB_URL for the whole test process with an unreachable address, so a test that forgets to override the database can never reach whatever backend/.env points at (IN-007). `pip install -r requirements.txt` on Linux CI is unaffected by the Windows long-path problem with moto.
Contract ref: none

## [OPEN] BE-019 — new optional env vars for the app config (nothing required)
From: backend | Date: 2026-10-31 | Priority: info
What changed: New optional settings: APP_MIN_SUPPORTED_VERSION, APP_LATEST_VERSION, PLAY_STORE_URL, SUPPORT_PHONE, ASSIGNMENT_PROMISE_MINUTES, SERVICE_WINDOW_START, SERVICE_WINDOW_END, SERVICE_TIMEZONE, APP_FLAGS (JSON), plus the existing LAUNCH_VISIT_CHARGE_INR / LAUNCH_OFFER_ENDS_AT. Defaults are safe. Documented (commented) in `backend/.env.example`.
Why: T2-04.
Action needed in this workstream: When the app is released: set APP_LATEST_VERSION, PLAY_STORE_URL and SUPPORT_PHONE in Render (the human supplies the values). Raising APP_MIN_SUPPORTED_VERSION is how old builds get blocked; do it only on the human's say-so. The server will not start if the minimum is above the latest.
Contract ref: contracts/API_CHANGES.md#be-019

## [OPEN] BE-021 — contract drift gate: pydantic is now pinned; the committed openapi.json matches a fresh export
From: backend | Date: 2026-10-31 | Priority: normal
What changed: `backend/requirements.txt` now pins `pydantic==2.13.4`. Before, an unpinned pydantic added/removed three regex `pattern` lines in the exported contract depending on its version, so `git diff --exit-code .coordination/contracts/openapi.json` could fail between machines. The committed file is now exactly what `python -m scripts.export_openapi` produces with the pinned versions. `tests/test_contract.py` runs the same comparison in the normal test job.
Why: Rule 6 / ADR 0006 §4 (drift gates).
Action needed in this workstream: Nothing to change in CI. If the drift job was failing for the pattern lines, it should be green now. Render will install pydantic 2.13.4 on the next deploy (the version the tests ran with); no other dependency changed in this entry.
Contract ref: contracts/API_CHANGES.md#be-021

## [OPEN] BE-022 — rate limits: check TRUSTED_PROXY_COUNT on Render
From: backend | Date: 2026-10-31 | Priority: normal
What changed: New settings `RATE_LIMIT_ENABLED` (default true) and `TRUSTED_PROXY_COUNT` (default 1). The limits use the real caller address from the last `X-Forwarded-For` entry the proxy adds. Counters are in server memory (single instance), so they reset on every deploy/restart.
Why: T2-03.
Action needed in this workstream: Render puts one proxy in front of the app, so the default 1 is right; do not set it to 0 on Render (then every user would share the proxy's address and the per-IP limits would hit everybody at once). If a CDN or second proxy is ever added in front, raise it to 2. If you move to more than one API instance, tell backend: the counters need to move to MongoDB. After deploy, smoke test: 6 wrong logins for a throwaway number should give 429 on the 6th.
Contract ref: contracts/API_CHANGES.md#be-022

## [OPEN] BE-023 — to turn password reset on later you need an SMTP service (human decision)
From: backend | Date: 2026-10-31 | Priority: normal
What changed: New email settings and a start-up rule: with `PASSWORD_RESET_SELF_SERVICE_ENABLED=true` outside local the app refuses to start unless `EMAIL_BACKEND=smtp`, `SMTP_HOST` and `SMTP_FROM` are set. Nothing changes in production now: the switch stays false and EMAIL_BACKEND defaults to `log`.
Why: T2-02, ADR 0003 §8 (free SMTP tier).
Action needed in this workstream: Do NOT turn the switch on. When the human has chosen a mail service (any SMTP: Brevo, Mailgun, a Gmail app password, ...), set EMAIL_BACKEND=smtp, SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM on Render, send one test mail, and only then ask the human whether to set PASSWORD_RESET_SELF_SERVICE_ENABLED=true. Never log SMTP_PASSWORD.
Contract ref: contracts/API_CHANGES.md#be-023

## [OPEN] BE-024 — debug mode is now automatically off outside ENVIRONMENT=local
From: backend | Date: 2026-10-31 | Priority: info
What changed: FastAPI debug (tracebacks in the response) is enabled only when ENVIRONMENT=local, whatever DEBUG is set to. Nothing to change if `ENVIRONMENT=production` is set on Render (it must be, see AR-006).
Why: T2-08 safety finding.
Action needed in this workstream: Check that Render really has ENVIRONMENT=production; if it were missing, the app would think it is local (and would also skip the JWT secret check).
Contract ref: contracts/API_CHANGES.md#be-024
