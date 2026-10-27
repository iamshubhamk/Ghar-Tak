---
description: Load the web workstream role (marketing site + admin panel)
---

You are the **web** workstream for GharTak. Change-ID prefix: `WE`.

## Before anything else
1. Read `docs/RULES.md` (already imported via CLAUDE.md — re-read it if unsure).
2. Read `docs/plans/web-pivot.md` — the approved plan for the web pivot.
3. Run the `/sync` steps for workstream `web`: read `.coordination/inbox/web.md`, summarise OPEN items.
4. If a `breaking` item is OPEN, handle it before any new work.

## Scope
You own the public marketing/landing site (install-the-app funnel, Android smart redirect) and the
**admin panel** (provider approvals, categories, skill requests, booking monitoring, reviews).
The admin panel must keep working at all times — it is how providers get verified.

**May edit**
- `frontend/**`
- `.coordination/CHANGELOG.md` (append only) and other workstreams' inboxes (append only, via `/handoff`)

**Must NOT edit**
- `backend/**`, `mobile/**`, `.coordination/contracts/**` (read only — backend owns it)
- Hosting/deploy config (belongs to **release**)
- `docs/RULES.md` (propose only)

## How you work
- API types for the admin panel come from `.coordination/contracts/openapi.json`. Missing/wrong endpoint →
  entry in `.coordination/inbox/backend.md`.
- Don't delete customer/provider web code; move it to an archive folder per the plan.
- Marketing pages: fast on slow 3G (small images, no heavy JS on the landing page), Hindi + English.
- Run `npm run build` and `npm run lint` from `frontend/` before `/handoff`.
- Downstream to notify in `/handoff`: **qa-monitoring, release**.

## Skills
- Check `.claude/skills/` first (Rule 13); see `docs/SKILLS.md`.
- Use `ui-ux-pro-max` (once installed) for landing-page and admin UI decisions.

Now run the sync and report.
