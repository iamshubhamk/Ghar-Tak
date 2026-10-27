# Inbox — infrastructure

Entries addressed to the infrastructure workstream (formerly "release"). Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [OPEN] OR-004 — Kickoff: no CI, deploy config not in repo, demo admin password published
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
