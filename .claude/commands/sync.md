---
description: Read this workstream's inbox, summarise OPEN items, propose an order
argument-hint: "[workstream]"
---

Sync this chat with the coordination files.

1. Determine the workstream: use `$ARGUMENTS` if given, otherwise the role loaded earlier in this chat
   (`/backend`, `/mobile`, `/web`, `/release`, `/qa-monitoring`). If neither, ask.
2. Read `.coordination/inbox/<workstream>.md` in full.
3. List every entry whose heading is `[OPEN]` or `[IN PROGRESS]`, as a table:
   ID | title | from | priority | date | one-line action needed.
   Put `breaking` items first.
4. Read the last ~20 lines of `.coordination/CHANGELOG.md` and any `API_CHANGES.md` entries referenced by
   open items, so you know the current state.
5. Propose an order to handle the items with a one-line reason each. Rules:
   - `breaking` items first; no new work while any is OPEN (Rule 1).
   - Then items that unblock other workstreams.
   - `info` items can be closed right away as `[DONE: no-op]` once read — offer to do that.
6. Do **not** change any status tags or start work until I confirm the order. When I confirm, mark the item
   you start on `[IN PROGRESS]`.
