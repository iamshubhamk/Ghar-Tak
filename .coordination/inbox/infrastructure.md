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

## [IN PROGRESS] AR-003 — Rotate the prod admin password, remove demo credentials from README, deploy AR-002
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

## [OPEN] AR-002 — backend hotfix ready to deploy (password reset disabled)
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

## [OPEN] AR-006 — T0-06: confirm prod JWT secret + ENVIRONMENT before backend's boot check deploys
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

## [OPEN] AR-005 — deploy upload lockdown; run the read-only upload audit on prod
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

## [OPEN] AR-006 — CONFIRM prod env BEFORE deploying: the app now refuses to start with a weak JWT secret
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

## [OPEN] AR-007 — Deploy plan approved (PR to main) + Phase 1 infrastructure tickets
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
