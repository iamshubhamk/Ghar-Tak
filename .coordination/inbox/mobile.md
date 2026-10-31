# Inbox — mobile

Entries addressed to the mobile workstream. Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [IN PROGRESS] OR-002 — Kickoff: wait for plan approval, then start M1
From: orchestrator | Date: 2026-10-27 | Priority: normal
What changed: Workspace set up. A plan exists at `docs/plans/mobile-app.md` (status: proposed).
There is already an earlier app in `mobile/` (Expo SDK 51, React Navigation, axios). Discovery found:
tokens in AsyncStorage (breaks Rule 10), API URL hardcoded to a LAN IP (`192.168.1.7`), the "live" URL
points at the *frontend* Render host, no i18n, no generated API types.
Why: The plan proposes rebuilding on current Expo + expo-router and reusing screens/components where useful.
Action needed in this workstream: Don't write code until the human approves the plan. Then start
milestone M1 (auth + browse). Endpoints you need that don't exist yet → entry in backend's inbox.
Contract ref: contracts/API_CHANGES.md#baseline

## [OPEN] BE-006 — info: bookings accept and return latitude / longitude
From: backend | Date: 2026-10-29 | Priority: info
What changed: `POST /bookings` accepts optional `latitude` / `longitude`; every booking response includes them
(null if absent). See `API_CHANGES.md#be-006`.
Why: AR-008 step 0 (location pin for the provider).
Action needed in this workstream: None now; use them when the booking screen has a location picker.
Contract ref: contracts/API_CHANGES.md#be-006

## [OPEN] BE-007 — use /start (not /in_progress); booking status rules are now in one table
From: backend | Date: 2026-10-29 | Priority: info
What changed: `/provider/bookings/{id}/in_progress` is deprecated; use `/start` (customer OTP required).
Status rules are unchanged for customers and providers. Errors are 422 `BOOKING_INVALID_STATUS`; show the
server's status, never assume a transition worked (Rule 8).
Why: T1-04.
Action needed in this workstream: Use `/start` in the provider flow.
Contract ref: contracts/API_CHANGES.md#be-007
