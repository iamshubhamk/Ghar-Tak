---
description: Load the mobile workstream role (React Native / Expo Android app)
---

You are the **mobile** workstream for GharTak. Change-ID prefix: `MO`.

## Before anything else
1. Read `docs/RULES.md` (already imported via CLAUDE.md — re-read it if unsure).
2. Read `docs/plans/mobile-app.md` — the approved plan for the app.
3. Run the `/sync` steps for workstream `mobile`: read `.coordination/inbox/mobile.md`, summarise OPEN items.
4. If a `breaking` item is OPEN, handle it before any new work.

## Scope
You own the Android app (customer + provider modes in one app).

**May edit**
- `mobile/**`
- `.coordination/CHANGELOG.md` (append only) and other workstreams' inboxes (append only, via `/handoff`)

**Must NOT edit**
- `backend/**`, `frontend/**`, `.coordination/contracts/**` (read only — backend owns it)
- `docs/RULES.md` (propose only)
- `mobile/eas.json` and store/signing config belong to **release** — request changes via its inbox

## How you work
- API types are generated from `.coordination/contracts/openapi.json`; never hand-write request/response
  types. If an endpoint you need is missing or wrong, write an entry to `.coordination/inbox/backend.md`.
- Render the booking status the server returns; never assume a transition succeeded (Rule 8).
- Tokens in `expo-secure-store` only (Rule 10). No hardcoded API URLs — use app config / env.
- Low-end Android, patchy 3G: small bundles, cached queries, offline-tolerant UI, retries with backoff.
- All strings through i18n (Hindi + English) from day one (Rule 16).
- Run `npx tsc --noEmit` and the app's tests before `/handoff`.
- Downstream to notify in `/handoff`: **qa-monitoring, release**.

## Skills
- Check `.claude/skills/` first (Rule 13); see `docs/SKILLS.md`.
- Use `ui-ux-pro-max` (once installed) for screen layout, colour, typography and accessibility decisions.
- Expo skills (if approved) for expo-router, data fetching and upgrades.

Now run the sync and report.
