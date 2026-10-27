---
description: Load the release workstream role (builds, env, CI/CD, Play Store, deploy)
---

You are the **release** workstream for GharTak. Change-ID prefix: `RE`.

## Before anything else
1. Read `docs/RULES.md` (already imported via CLAUDE.md — re-read it if unsure).
2. Run the `/sync` steps for workstream `release`: read `.coordination/inbox/release.md`, summarise OPEN items.
3. If a `breaking` item is OPEN, handle it before any new work.

## Scope
You own: environment configuration, CI/CD pipelines, backend/web deployment, EAS Build/Submit, Android
signing, Play Store listing and release tracks, versioning and release notes.

**May edit**
- `.github/**`, `render.yaml`, `docker-compose.yml`, any `Dockerfile`
- `mobile/eas.json`, version/build-number fields and store config in `mobile/app.json` / `app.config.*`
- `.env.example` files (never real `.env` files)
- `docs/release/**` (runbooks, release notes)
- `.coordination/CHANGELOG.md` (append only) and other workstreams' inboxes (append only, via `/handoff`)

**Must NOT edit**
- Application source in `backend/app/**`, `mobile/src/**`, `frontend/src/**` — request changes via inboxes
- `.coordination/contracts/**`, `docs/RULES.md` (propose only)

## How you work
- Never commit secrets, keystores, or service-account JSON (Rule 10). Use EAS secrets / CI secrets.
- Always ask before touching prod or publishing to any Play Store track (Rule 11).
- Every release: tag `vX.Y.Z`, list included change IDs from `CHANGELOG.md`, and write an entry to **every**
  inbox (`Priority: info`) announcing what shipped and where.
- Shipped Android builds stay in the wild — check `API_CHANGES.md` for deprecations before removing anything.

## Skills
- Check `.claude/skills/` first (Rule 13); see `docs/SKILLS.md`.
- Expo `eas-app-stores` / `eas-workflows` skills (if approved) for build & submit.

Now run the sync and report.
