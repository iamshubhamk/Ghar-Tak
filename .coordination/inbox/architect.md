# Inbox — architect

Entries addressed to the Architect: new requirements, bug reports from support, decisions needed, and
`info` entries from every `/handoff`. Append new entries at the bottom; never delete.
Format and status lifecycle: see `.coordination/README.md`.

---

## [OPEN] OR-006 — Take over coordination: review the plans, settle the open questions
From: human | Date: 2026-10-28 | Priority: normal
What changed: The workspace now has 6 chats (architect, backend, mobile, web, infrastructure, support).
You replace the setup session as the design owner and dispatcher. State today:
- Kickoff items OR-001 (backend), OR-002 (mobile), OR-003 (web), OR-004 (infrastructure), OR-005 (support)
  are OPEN. They were written before the restructure.
- Plans `docs/plans/mobile-app.md` and `docs/plans/web-pivot.md` are **proposed**, not approved. Each ends
  with open questions for the human.
- Security: `README.md` publishes the live demo admin login (OR-004 item 1).
Why: Requirements and bug fixes should flow through one design owner.
Action needed in this workstream: Read both plans and all kickoff items. Turn the big decisions into ADRs
(e.g. refresh-token auth, one app with role modes, web pivot + /admin, type generation from openapi.json).
Put the open questions to the human in one batch. Once the human approves, re-sequence the kickoff items
with acceptance criteria. Mobile M1 depends on backend #1–#3 in the mobile plan.
Contract ref: contracts/API_CHANGES.md#baseline

## [OPEN] MO-001 — Mobile plan review: architecture points to settle before approval
From: mobile | Date: 2026-10-28 | Priority: normal
What changed: Nothing in code. Mobile reviewed `docs/plans/mobile-app.md` against the contract, backend
code and phase-7 docs. Points below are architecture-level; mobile-only fixes stay in the plan.
Why: Some plan assumptions don't match the product as built. Better to fix them before ADRs/approval.
Action needed in this workstream: Decide/ADR items 1–5, then fold into the batch for the human.
1. **Booking flow contradicts GT-BOOK-010.** The plan's customer flow is category → provider list →
   provider profile → book. The shipped product decision (`docs/phase-7-p0-admin-assigned-bookings.md`)
   is demand-first: customer picks a service, admin assigns a provider; `provider_id` is optional in
   `BookingCreateRequest`. Decide which the app does. Mobile's proposal: follow GT-BOOK-010 for MVP —
   Home → service → request form → "Awaiting assignment"; provider browsing/profile becomes read-only
   trust content or is dropped from M1. That also moves `/providers` out of M1 and makes "awaiting
   assignment" a first-class state in the tracker.
2. **Admin assignment latency is now the core UX.** If admins assign by hand, the customer needs an
   expected-response time and a push when assigned. Push on assignment should be M2, not M4.
3. **Push is already half-built, the plan says it isn't.** `NotificationService.send_expo_push` already
   posts to Expo on notify. Gaps: no Expo access token, no receipt check / pruning of
   `DeviceNotRegistered` tokens, no token removal on logout, and titles/bodies are English-only (Rule 16 —
   needs per-user language stored server-side or a template key + params the app localises). Needs a
   decision on where push text gets localised.
4. **Login identifier.** GT-AUTH-007 made web login email-only; the contract `LoginRequest` accepts
   email or phone. For Patna users, phone should be the primary identifier in the app (many have no
   email). Confirm phone+password is supported end to end, and whether registration still requires email.
5. **Start-OTP security.** OTP is 4 digits, never rotates, no attempt limit visible on `/start`. Low risk
   but it's the only proof the provider is on site; worth a rate limit (support/backend, not mobile).
6. Minor contract notes (for backend later, no decision needed): `/in_progress` and `/start` duplicate;
   `BookingResponse` has no status history/timestamps, so a "status timeline" can't be drawn from server
   data — needs `status_history[]` or the tracker shows current status only; `GET /providers/{id}/adhaar`
   and `/bank-proof` are under the public `/providers` path — check they're admin-only.
7. Plan housekeeping I'll fix myself once approved: it names `qa-monitoring`/`release` (now support/
   infrastructure); Expo SDK version must be re-checked against current at start; earnings screen and
   wallet stay out of MVP.
Contract ref: none
