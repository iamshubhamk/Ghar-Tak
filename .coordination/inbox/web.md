# Inbox — web

Entries addressed to the web workstream. Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [OPEN] OR-003 — Kickoff: wait for web-pivot approval; protect the admin panel
From: orchestrator | Date: 2026-10-27 | Priority: normal
What changed: Workspace set up. A plan exists at `docs/plans/web-pivot.md` (status: proposed).
Discovery: the web app is a single-page React 19 + Vite + Tailwind app without a router; views are
switched with `useState` in `App.tsx`. The admin panel lives in `MarketplaceAdminPanel.tsx` (1,166 lines).
The JWT is kept in `localStorage`. The `dev` working copy has uncommitted frontend changes
(LocationModal, LocationPickerMap (new), ServiceDrawer, Header, ProviderBookingsPanel, styles,
package.json).
Why: The public site becomes a marketing/install page. Admin must keep working throughout.
Action needed in this workstream: Don't write code until the human approves the plan and has decided what
to do with the uncommitted frontend changes. Then follow the plan's step order (router first, admin moved
to `/admin` before anything is archived).
Contract ref: contracts/API_CHANGES.md#baseline

## [OPEN] AR-002 — info: self-service password reset is being disabled (backend hotfix)
From: architect | Date: 2026-10-28 | Priority: info
What changed: Backend is switching off `POST /auth/password-reset/verify` and `/auth/password-reset`. When
off, they return 403 with code `PASSWORD_RESET_DISABLED` (security hotfix for SU-002, approved by the
human).
Why: The reset flow allowed account takeover.
Action needed in this workstream: No code until backend hands off AR-002. Then check that the
"Forgot password" screen in `AuthPanel` shows the server's message instead of a generic error. If it
doesn't, make the smallest fix: show the message and support contact, and touch only that handler. ADR
0005 already plans to drop self-service reset for admins (Q-W4).
Contract ref: contracts/API_CHANGES.md#ar-002 (when backend adds it)
