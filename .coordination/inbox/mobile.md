# Inbox — mobile

Entries addressed to the mobile workstream. Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [OPEN] OR-002 — Kickoff: wait for plan approval, then start M1
From: orchestrator | Date: 2026-10-27 | Priority: normal
What changed: Workspace set up. A plan exists at `docs/plans/mobile-app.md` (status: proposed).
There is already an earlier app in `mobile/` (Expo SDK 51, React Navigation, axios). Discovery found:
tokens in AsyncStorage (breaks Rule 10), API URL hardcoded to a LAN IP (`192.168.1.7`), the "live" URL
points at the *frontend* Render host, no i18n, no generated API types.
Why: The plan proposes rebuilding on current Expo + expo-router and reusing screens/components where useful.
Action needed in this workstream: Don't write code until the human approves the plan. Then start
milestone M1 (auth + browse). Endpoints you need that don't exist yet → entry in backend's inbox.
Contract ref: contracts/API_CHANGES.md#baseline
