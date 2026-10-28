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

## [OPEN] AR-002 — backend done: reset endpoints now return 403 PASSWORD_RESET_DISABLED
From: backend | Date: 2026-10-28 | Priority: normal
What changed: `POST /auth/password-reset/verify` and `/auth/password-reset` return 403 with
`detail.error.code = "PASSWORD_RESET_DISABLED"` and message "Password reset is not available in the app yet.
Please contact GharTak support." (effective once infrastructure deploys). Schemas unchanged.
Why: Security hotfix SU-002.
Action needed in this workstream: Per the architect's AR-002 entry: make the "Forgot password" screen in
`AuthPanel` show `detail.error.message` plus the support contact instead of a generic error.
Contract ref: contracts/API_CHANGES.md#ar-002

## [OPEN] AR-005 — admin skill-proof viewer needs an authenticated fetch; new upload errors
From: backend | Date: 2026-10-29 | Priority: normal
What changed: Skill-request `proof_url` is now `/api/v1/skill-requests/{id}/proof` and needs the login
token (it was a public `/uploads/...` link that returned 404 for admins). Uploads now answer 415
`UPLOAD_TYPE_NOT_ALLOWED` or 413 `UPLOAD_TOO_LARGE` (standard error body) instead of 400. Allowed: photos
jpg/png/webp up to 5 MB, documents also pdf up to 10 MB. `/uploads/*` only serves those image types.
Why: SU-008 (stored XSS from disguised files; admins could not see skill proofs).
Action needed in this workstream: (1) In the admin skill-requests panel, fetch `proof_url` with the
Authorization header and open it as a blob, the same way you do for Aadhaar and bank proofs. Old requests
still work through the same route. (2) Show `detail.error.message` for 413/415 on the registration form,
profile photo and skill-proof uploads. (3) Optional: accept only `image/jpeg,image/png,image/webp` (and PDF
for documents) in the file inputs.
Contract ref: contracts/API_CHANGES.md#ar-005
