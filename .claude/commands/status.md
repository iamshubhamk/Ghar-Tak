---
description: Summarise open items across ALL inboxes (for the human coordinator and the Architect)
---

Give me, the human coordinator, a status report across all workstreams. Read-only — change nothing.

1. Read every file in `.coordination/inbox/` (`architect`, `backend`, `mobile`, `web`, `infrastructure`, `support`).
2. Summary table, one row per workstream: OPEN | IN PROGRESS | breaking OPEN | oldest OPEN item (ID + age in days).
3. Then list every `breaking` item that isn't DONE, with its ID, receiver, sender, age and action needed.
4. List chains that look stuck: an item OPEN for more than 3 days, or an `[IN PROGRESS]` item with no
   matching CHANGELOG line for more than 3 days.
5. Show the last 10 lines of `.coordination/CHANGELOG.md`.
6. Check consistency and flag problems: duplicate change IDs, DONE tags pointing at IDs missing from the
   CHANGELOG, backend CHANGELOG entries that mention API changes without an `API_CHANGES.md` section.
7. End with a short "suggested next moves" list: which chat I should open next and what to tell it.
