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

## [DONE: WE-001] AR-005 — admin skill-proof viewer needs an authenticated fetch; new upload errors
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

## [DONE: WE-001] AR-009 — Park the uncommitted web location-picker edits; fix the admin proof viewer; ADR 0005 accepted
From: architect | Date: 2026-10-29 | Priority: normal
What changed: The human decided (2026-10-29) for Q-W5: "Commit backend part only". The web map-picker
edits are parked, not committed. ADR 0005 is accepted:
- domain officialghartak.com
- no real web users, so no notice period
- admin gap features right after the `/admin` move (Phase 5)
Why: To unblock web work in `App.tsx`/`Header.tsx` etc. and the pivot.
Action needed in this workstream:
1. Park, don't delete, the uncommitted frontend edits: `git stash push --include-untracked -m "parked: web
   location picker (human Q-W5, 2026-10-29)" -- frontend/`. Note the stash name in your handoff. Don't
   touch `backend/` (backend commits that part).
2. Then do AR-005 from your inbox: authenticated blob fetch for skill proofs in the admin panel, and show
   the new upload error messages. Smallest change. Commit and `/handoff`.
3. Phase 3 (router + `/admin` move, T3-05) waits for the human's Phase 2/3 go-ahead. Don't start it yet.
Contract ref: contracts/API_CHANGES.md#ar-005

## [OPEN] BE-007 — switch the provider panel from /in_progress to /start
From: backend | Date: 2026-10-29 | Priority: normal
What changed: `PATCH /provider/bookings/{id}/in_progress` is deprecated (same behaviour as `/start`,
removal not before 2027-03-01). `ProviderBookingsPanel.tsx` still calls `in_progress`. Also: status errors are
all 422 `BOOKING_INVALID_STATUS` with one message format; show `detail.error.message`.
Why: T1-04 (one transition table).
Action needed in this workstream: Change the call to `/start` when you next touch that file (the file has
parked uncommitted edits from the human, so no rush). For the future admin status override (Q-W6) the allowed
targets are only CANCELLED_BY_ADMIN and COMPLETED, see API_CHANGES#be-007.
Contract ref: contracts/API_CHANGES.md#be-007

## [OPEN] IN-002 — CI added; please clear the 44 frontend lint errors
From: infrastructure | Date: 2026-10-29 | Priority: normal
What changed: CI now runs `npm run lint` and `npm run build` on every PR to main. Lint reports 44 errors (unused
variables, `no-explicit-any`) in files such as PublicHome.tsx, ServiceDrawer.tsx, so lint is `continue-on-error` for now.
Why: A lint check that can't block is only noise.
Action needed in this workstream: Fix the lint errors, then tell infrastructure so `continue-on-error` is removed.
Contract ref: none


## [OPEN] BE-008 — handle 409 BOOKING_STATE_CHANGED on booking actions
From: backend | Date: 2026-10-29 | Priority: normal
What changed: Booking actions and admin assign can now return 409 `BOOKING_STATE_CHANGED` when someone else
changed the booking first (nothing is written in that case).
Why: T1-05 / SU-007.
Action needed in this workstream: In the admin and provider panels, on that code reload the list and show
`detail.error.message`.
Contract ref: contracts/API_CHANGES.md#be-008

## [OPEN] IN-003 — Admin CSP and headers are in render.yaml (reply to WE-002/WE-003)
From: infrastructure | Date: 2026-10-29 | Priority: info
What changed: For `/admin*`, `render.yaml` sets `X-Robots-Tag: noindex, nofollow` and
`Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
font-src 'self' data:; connect-src 'self' https://*.onrender.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`.
The SPA rewrite and the two VITE_ marketing variables are there too. Not applied to Render yet.
Why: WE-002, WE-003.
Action needed in this workstream: Keep inline scripts out of the admin chunk and external hosts out of admin code. Blob
images for skill proofs are allowed (`blob:`). Tell me if the admin needs another origin.
Contract ref: none
