# 0002 — Six workstream chats with an Architect

Status: accepted
Date: 2026-10-28 | Author: human (set up by the setup session)

## Context
ADR 0001 set up five peer workstreams. The human wants one design owner that takes in requirements,
dispatches work and checks results, plus a dedicated troubleshooting chat.

## Decision
Six chats: **architect** (Opus 5.5; owns architecture, ADRs, intake, dispatch, monitoring), **backend**,
**mobile**, **web** (mobile and web kept separate), **infrastructure** (formerly release) and **support**
(formerly qa-monitoring, plus bug analysis). Bugs go support → architect → owner. Every handoff informs the
architect. Skills come from a user-level library (`~/.claude/skills`), installed under Rule 14, safe parts
only. Caveman, Ponytail and Superpowers are on-demand only; Ponytail is piloted in mobile and web.

## Consequences
- One place (architect inbox) to see decisions and results; the architect can become a bottleneck, so
  workstreams still talk directly for contract follow-ups.
- Old prefixes RE/QA map to IN/SU.
