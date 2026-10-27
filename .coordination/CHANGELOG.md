# Changelog (all workstreams)

Append only, newest at the bottom. One line per completed change:
`- YYYY-MM-DD | <ID> | <workstream> | <short title> | inbox: <who was notified>`

- 2026-10-27 | OR-000 | orchestrator | Workspace setup: rules, workstream commands, coordination files, baseline openapi.json, plans | inbox: OR-001 backend, OR-002 mobile, OR-003 web, OR-004 release, OR-005 qa-monitoring
- 2026-10-28 | OR-006 | human | Restructured into 6 chats (architect, backend, mobile, web, infrastructure, support); global skill library installed; ADR 0002 | inbox: OR-006 architect
- 2026-10-28 | AR-001 | architect | Proposed ADRs 0003 (refresh-token auth + password-reset fix), 0004 (one Android app, demand-first booking, server-localised push), 0005 (web pivot, admin at /admin), 0006 (generated API types); open-questions batch 1 in docs/plans/open-questions.md (folds in MO-001, IN-001) | inbox: none (awaiting human approval)
- 2026-10-28 | SU-001 | support | Test plan (booking lifecycle matrix, auth, provider verification, low-end checks) + 8 bug reports SU-002..SU-009 | inbox: architect (SU-001 info, SU-002 breaking, SU-003..SU-009 normal)
- 2026-10-28 | AR-002 | architect | Dispatched approved security hotfix: disable self-service password reset (SU-002) | inbox: backend (breaking), web (info), support (verify), infrastructure (deploy via AR-003)
- 2026-10-28 | AR-003 | architect | Dispatched approved prod admin password rotation + README credential removal + AR-002 prod deploy | inbox: infrastructure (breaking)
- 2026-10-28 | AR-002 | backend | Disable self-service password reset (403 PASSWORD_RESET_DISABLED, flag off by default) | inbox: AR-002 infrastructure, web, support, architect
- 2026-10-28 | BE-001 | backend | Add missing email-validator to requirements.txt | inbox: architect (BE-002)
- 2026-10-28 | BE-002 | backend | Mongo test fixtures (mongomock-motor), ported tests, booking-state tests; fix category create 500 | inbox: architect, support, infrastructure
- 2026-10-28 | AR-004 | architect | Proposed phased ticket backlog (Phases 0-7, 52 tickets, policy proposals P-1..P-4) in docs/plans/roadmap-tickets.md | inbox: none (awaiting human approval)
