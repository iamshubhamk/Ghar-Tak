# Inbox — mobile

Entries addressed to the mobile workstream. Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [DONE: MO-004] OR-002 — Kickoff: wait for plan approval, then start M1
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

## [OPEN] BE-008 — handle 409 BOOKING_STATE_CHANGED on booking actions
From: backend | Date: 2026-10-29 | Priority: normal
What changed: When two people act on the same booking at the same time (customer cancels while the provider
accepts, two admins assign, ...), exactly one wins; the other gets 409 `BOOKING_STATE_CHANGED`.
Why: T1-05 / SU-007.
Action needed in this workstream: On that code, refetch the booking, show the status the server returns, and
show the message. No automatic retry.
Contract ref: contracts/API_CHANGES.md#be-008

## [OPEN] BE-010 — non-verified providers get 403; jobs return to the queue
From: backend | Date: 2026-10-31 | Priority: info
What changed: Same as web: 403 `PROVIDER_NOT_VERIFIED` on every provider booking action when not VERIFIED. A customer's booking may go back to REQUESTED with no provider (notification event `BOOKING_RELEASED`).
Why: T1-06.
Action needed in this workstream: Handle the 403 in the provider flow; render the status the server returns (Rule 8).
Contract ref: contracts/API_CHANGES.md#be-010

## [OPEN] BE-011 — profile update ignores category_ids
From: backend | Date: 2026-10-31 | Priority: info
What changed: Same as web: `category_ids` on `PATCH /provider/me` is ignored; use skill requests to add skills.
Why: T1-07.
Action needed in this workstream: Do not build a category editor on the profile screen.
Contract ref: contracts/API_CHANGES.md#be-011

## [OPEN] BE-012 — server-set price: visit charge + provider extra
From: backend | Date: 2026-10-31 | Priority: normal
What changed: Bookings carry `visit_charge` (99 during the launch offer), `offer_ends_at`, `extra_amount`, `extra_note`. Do not send totals or compute prices. Providers send `extra_amount` (+ `extra_note`) on complete / mark-cash-paid; `final_amount` is deprecated.
Why: T1-08 / SU-004 (policy P-2).
Action needed in this workstream: Customer booking screen: show the visit charge from the booking response (or a config call later) and the offer end date; stop sending subtotal/platform_fee/discount/total_amount. Provider completion screen: an optional extra amount and note.
Contract ref: contracts/API_CHANGES.md#be-012

## [OPEN] BE-013 — release job, OTP lock, wider cancel, public phone hidden
From: backend | Date: 2026-10-31 | Priority: normal
What changed: New `PATCH /provider/bookings/{id}/release {note}`; start code locks after 5 wrong tries (423 `OTP_LOCKED`); customer can cancel in ON_THE_WAY and REJECTED; past booking times are 422 (naive times are read as IST); public provider list has `phone: null`.
Why: T1-09 and decisions Q1, Q5, Q7 (AR-012).
Action needed in this workstream: Provider: a 'cannot do this job' action (ACCEPTED/ON_THE_WAY) that asks for a reason; show the lock message on 423. Customer: allow cancel while the provider is on the way. Get the provider's phone from the booking, never from the public list.
Contract ref: contracts/API_CHANGES.md#be-013

## [IN PROGRESS] AR-019 — Plan approved: start M1 (T3-01, T3-02, T3-03)
From: architect | Date: 2026-11-01 | Priority: normal
What changed: The human said "Start mobile work" (2026-11-01) after reviewing the design mockup. This answers OR-002 and
MO-001. ADRs 0003, 0004, 0006 are accepted, and these are decided (`docs/plans/open-questions.md`):
- fresh Expo project, archive the old app
- package `com.ghartak.app`
- language follows the device, choice on first launch
- phone + password, email optional
- **demand-first booking: no provider browsing in M1**
- ₹99 visit charge from `/app/config`
- 30-minute assignment promise, 8am–10pm

**Design reference:** https://claude.ai/artifact/GdZ9FweBqVntGrJstHo6Tg (customer and provider screens; brand navy `#082346`,
orange `#f26a0a`, navy text on orange buttons, darker orange `#b84a05` for orange text, Mukta font for Hindi + English).
Sample data and some icons are placeholders. Web is on hold; admin isn't in the app.
Why: First installable build, on low-end phones.
Action needed in this workstream, in this order:
1. **Update `docs/plans/mobile-app.md`** to match ADR 0004 (your MO-001 housekeeping; drop provider browsing from M1; push
   on assignment in M2). Expo 58 is confirmed current (`npm view expo version` = 58.0.22 today).
2. **T3-01:** tag `mobile-v0`, then move the old app to `archive/mobile-v0/`; the human approved the move (Q-M1). The human
   has **uncommitted edits** in `mobile/package.json` and `package-lock.json`: stash them with a clear name first, never
   discard them, and tell the human the stash name. Don't commit `node_modules`. Then the fresh Expo project: expo-router,
   theme, i18n (hi/en), secure-store, TanStack Query, generated API client from `openapi.json` (ADR 0006), and the API URL
   from env, never hardcoded. No screens that need unfinished endpoints yet.
3. **T3-02** (needs backend T2-01, T2-06): language picker, login, register (customer, provider), session restore, refresh on
   401, logout, admin "use the website" screen. Backend's order is in its AR-018; build against the contract as each lands.
4. **T3-03** (needs T2-04, T2-05): home with services and the offer, service info, force-update gate, offline banner.
   Use `/start`, handle 409 and the other notes in your inbox when you reach booking screens in M2.
Acceptance criteria: per roadmap: app boots in Hindi or English on a low-end phone; a session survives restart and token
expiry; works on throttled 3G; old builds can be blocked. Tokens only in secure storage (Rule 10); every string through
i18n (Rule 16). `/handoff` per ticket, to infrastructure once T3-01 lands (EAS, T3-04).
Contract ref: contracts/API_CHANGES.md
