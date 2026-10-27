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
