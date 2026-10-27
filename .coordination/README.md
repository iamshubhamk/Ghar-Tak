# Coordination

Claude Code chats can't message each other, so the 5 workstreams talk through these files.

```
.coordination/
  inbox/<workstream>.md   # work addressed TO that workstream (append only)
  CHANGELOG.md            # one line per completed change, all workstreams (append only)
  contracts/
    openapi.json          # exported from FastAPI — source of truth for the API (backend writes it)
    API_CHANGES.md        # human-readable log of every contract change
  decisions/              # short ADRs (NNNN-title.md)
```

## Inbox entry format

Append new entries at the **bottom** of the receiver's inbox. Never delete or rewrite entries.

```
## [OPEN] BE-014 — Add provider rating endpoint
From: backend | Date: 2026-10-27 | Priority: breaking / normal / info
What changed: ...
Why: ...
Action needed in this workstream: ...
Contract ref: contracts/API_CHANGES.md#BE-014
```

- The ID is the **sender's** change ID (or `OR-NNN` for items from the human coordinator).
- `Contract ref:` only when the API changed; otherwise `Contract ref: none`.
- Priority:
  - `breaking` — receiver must handle it before starting new work (e.g. API change that breaks a client,
    crash/data-loss/auth bug).
  - `normal` — should be picked up in the receiver's next planning.
  - `info` — FYI; receiver marks it done after reading.

## Status lifecycle (receiver edits only the heading tag)

`[OPEN]` → `[IN PROGRESS]` → `[DONE: <receiver's own change ID>]`
(or `[DONE: no-op]` for `info` items / nothing to do, or `[WONTFIX: reason]` with the human's approval).

If the receiver's own change affects others, its `/handoff` writes new entries to their inboxes, e.g.
backend → mobile → qa-monitoring → release.

## Commands

| Command    | Who        | What |
|------------|------------|------|
| `/sync`    | every chat | read own inbox, summarise OPEN items, propose an order |
| `/handoff` | every chat | after a change: CHANGELOG + contract files + downstream inbox entries |
| `/status`  | the human  | summary of open items across all inboxes |

A `SessionStart` hook (`.claude/hooks/inbox-status.sh`) prints OPEN counts per inbox when any chat starts.

## Avoiding edit collisions

Several chats may append to the same file. Always re-read a file immediately before appending, append in
one edit, and only touch your own entries' status tags.
