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
- 2026-10-28 | AR-004 | architect | Proposed phased ticket backlog (Phases 0-7, 59 tickets, policy proposals P-1..P-4) in docs/plans/roadmap-tickets.md | inbox: none (awaiting human approval)
- 2026-10-29 | AR-005 | architect | Dispatched Phase 0 T0-05: upload validator + private skill proofs (SU-008); verified AR-002 (8/8) and BE-002 (114 tests) | inbox: backend (breaking)
- 2026-10-29 | AR-006 | architect | Dispatched Phase 0 T0-06: refuse boot with default JWT secret outside local (SU-009 #7) | inbox: backend (breaking), infrastructure (confirm prod env first)
- 2026-10-29 | BE-003 | backend | AR-005: one upload validator (magic bytes, caps, server names), private skill proofs + auth route, images-only /uploads with nosniff, read-only audit script | inbox: AR-005 web, infrastructure, support, architect
- 2026-10-29 | BE-004 | backend | AR-006: refuse to boot outside local with default/weak JWT secret or empty MONGODB_URL | inbox: AR-006 infrastructure (breaking: confirm prod env before deploy), architect, support
- 2026-10-29 | BE-005 | backend | Remove dead app/models package, drop_cat.py, test_cat.py (OR-001 #3, #5) | inbox: architect
- 2026-10-29 | AR-007 | architect | Human decisions recorded (deploy via PR to main, R2, Render free, daily dump + staging, ADRs 0003-0006 accepted, Phase 1 + P-1..P-4 approved, ₹99 visit offer, 30-min assignment promise); dispatched Phase 0 completion + Phase 1 infra | inbox: infrastructure (breaking)
- 2026-10-29 | AR-008 | architect | Dispatched Phase 1 backend T1-04..T1-09, T1-13 + commit of human's lat/long change | inbox: backend
- 2026-10-29 | AR-009 | architect | Park web location-picker edits (stash), admin proof viewer fix | inbox: web
- 2026-10-29 | AR-010 | architect | Phase 1 tests T1-16 + finalise test-plan policies | inbox: support
- 2026-10-29 | BE-006 | backend | Commit booking latitude/longitude (range-checked) with tests (AR-008 step 0) | inbox: architect, mobile
- 2026-10-29 | WE-001 | web | AR-005: admin skill proofs via authenticated blob fetch; 413/415 upload messages shown; location-picker edits parked in git stash | inbox: support, architect
- 2026-10-29 | BE-007 | backend | T1-04: one booking transition table (booking_rules.py), admins bound, /in_progress deprecated | inbox: web, mobile, support, architect
