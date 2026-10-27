---
description: Finish a change — update CHANGELOG, contract files, and downstream inboxes
argument-hint: "[change ID]"
---

Hand off the change just completed in this chat. A change isn't done until this runs (Rule 5).

1. **Identify the change.** Workstream = role loaded in this chat. Change ID = `$ARGUMENTS` if given,
   otherwise the next free ID for this workstream's prefix (see "Change IDs" in `docs/RULES.md`).
   Summarise: what changed, why, files touched, how to test. Show it to me.
2. **Check it's actually done.** Tests/lint/type-check for the touched area pass (Rule 9). If not, stop and
   say so — don't hand off.
3. **API contract (backend only, if any endpoint/schema changed):**
   - Run `python -m scripts.export_openapi` from `backend/` and confirm `openapi.json` changed as expected.
   - Append to `.coordination/contracts/API_CHANGES.md` a section `## <ID> — <title>` with: endpoints
     added/changed/deprecated, request/response field changes, breaking? (yes/no), migration path and
     deprecation date if breaking (Rule 7).
   - Non-backend workstreams never edit contract files; if you need a contract change, write to backend's inbox.
4. **CHANGELOG.** Re-read `.coordination/CHANGELOG.md`, then append one line:
   `- YYYY-MM-DD | <ID> | <workstream> | <short title> | inbox: <ids/workstreams notified or none>`
5. **Close what this change resolved.** In this workstream's own inbox, change the heading tag of any item
   this change resolves to `[DONE: <ID>]`.
6. **Notify downstream.** Decide which workstreams are affected (defaults: backend → mobile, web,
   support, infrastructure; mobile/web → support, infrastructure; infrastructure → all on a release;
   support → **architect** with the bug report; architect → whichever workstreams it dispatches to).
   For each, re-read its inbox file and append an entry in the exact format from `.coordination/README.md`,
   with a concrete "Action needed in this workstream". Support should almost always get one, so it can
   verify the change. Unless you *are* the Architect, also append a `Priority: info` entry to
   `architect.md` summarising the result against the acceptance criteria of the item you resolved.
7. **Commit suggestion.** Propose a commit message `<ID>: <summary>` listing the files. Do not commit or push
   unless I say so.
8. Report: the CHANGELOG line, each inbox entry written (workstream + ID + priority), and anything left open.
