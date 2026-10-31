# 0001 — File-based coordination between workstream chats

Status: accepted
Date: 2026-10-27 | Author: orchestrator

## Context
Five long-lived Claude Code chats (backend, mobile, web, release, qa-monitoring) work on one repo and
can't message each other.

## Decision
Coordinate through files committed to the repo: per-workstream inboxes, an append-only CHANGELOG, an
exported `openapi.json` as the single API contract, and slash commands (`/sync`, `/handoff`, `/status`)
that enforce the workflow. A SessionStart hook shows OPEN counts.

## Consequences
- Every handoff is visible in git history and reviewable by the human.
- Chats may edit the same file at the same time; mitigated by append-only entries and re-reading before
  editing.
- The human is the router: they open the downstream chat after a handoff.
