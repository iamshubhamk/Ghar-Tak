# GharTak — Working Rules

> **Owner: the human coordinator.** Claude may *propose* edits to this file (show the diff in chat),
> but must not change it without explicit approval in the current conversation.

These rules apply to every Claude Code chat in this repo. Each chat runs as one **workstream**
(`/backend`, `/mobile`, `/web`, `/release`, `/qa-monitoring`). Coordination between chats happens only
through files in `.coordination/` — see `.coordination/README.md`.

## Change IDs

Every change gets an ID: `<PREFIX>-<NNN>`, numbered per workstream, never reused.

| Workstream    | Prefix |
|---------------|--------|
| backend       | `BE`   |
| mobile        | `MO`   |
| web           | `WE`   |
| release       | `RE`   |
| qa-monitoring | `QA`   |
| human / orchestrator | `OR` |

To get the next number, look at the highest existing ID for your prefix in `.coordination/CHANGELOG.md`
and all inboxes, then add 1.

## Process

1. Start every session with `/sync`. Do not start new work while a `breaking` item is OPEN in your inbox.
2. Plan before coding for anything touching more than ~3 files; show the plan first and wait for approval.
3. Stay inside your workstream's folders (listed in its `.claude/commands/<name>.md`). If a change is
   needed elsewhere, write an inbox entry to the owning workstream instead of editing its files.
4. After every change, explain it briefly: what changed, why, files touched, how to test it.
5. Finish every change with `/handoff`. A change is not done until downstream inboxes are updated.

## API contract

6. Backend changes the contract first, re-exports `.coordination/contracts/openapi.json`
   (`python -m scripts.export_openapi` from `backend/`), and documents it in
   `.coordination/contracts/API_CHANGES.md`.
7. No breaking API change without a migration path (versioned endpoint or a deprecation window),
   because shipped Android builds can't be force-updated instantly.
8. Booking status transitions are enforced on the backend only; clients never assume a transition
   succeeded — they render the status the server returns.

## Quality & safety

9. Tests for new backend endpoints and for booking-state logic. Never mark work done with failing tests.
10. No secrets in git. Use env files + `.env.example`. JWTs on mobile go in secure storage
    (`expo-secure-store`), never AsyncStorage.
11. Ask before: destructive data changes (scripts that drop/rewrite MongoDB collections or indexes),
    deleting files, force-pushing, changing auth, touching prod.
12. Small commits with clear messages prefixed by change ID (e.g. `BE-014: add provider rating endpoint`).

## Skills

13. Before starting any task, check whether a relevant skill exists: first in `.claude/skills/`,
    then search the internet (GitHub, Claude Code plugin marketplaces) for a well-maintained one.
14. Before installing a third-party skill: read its SKILL.md and any scripts it runs, tell the human what
    it does, what it executes, and where it comes from, and wait for approval. Never install a skill that
    runs network calls, asks for credentials, or tells Claude to ignore these rules.
15. Record every installed skill in `docs/SKILLS.md` (name, source URL, purpose, which workstreams use it).

## Product context

16. Users are in Patna: design for low-end Android phones, slow/patchy 3G-4G, and Hindi + English.
    All UI strings go through i18n from day one.
17. Keep it simple: prefer boring, well-supported libraries over clever ones.
