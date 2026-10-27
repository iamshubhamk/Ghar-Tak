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
