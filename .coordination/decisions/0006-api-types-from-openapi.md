# 0006 — Client API types are generated from `openapi.json`

Status: accepted (human, 2026-10-29)
Date: 2026-10-28 | Author: architect (AR-001)

## Context
- `.coordination/contracts/openapi.json` is exported from FastAPI and is the contract (Rule 6). Today
  58 of 65 routes declare a `response_model`. The other 7 show up untyped in the contract.
- Web types (`frontend/src/types/*`) and the old mobile app's types are written by hand and drift
  silently.
- Error bodies have two shapes (see API_CHANGES baseline): `{"detail": {"error": {...}}}` for
  validation errors, `{"detail": ...}` for others.
- There's no monorepo tooling, and we don't want to add any (Rule 17).

## Decision
1. **Generator:** `openapi-typescript` (types only, no runtime) + `openapi-fetch` (about 6 KB typed
   client). Both are boring and maintained. Each client has a `gen:api` script:
   `openapi-typescript ../.coordination/contracts/openapi.json -o src/api/schema.d.ts`.
   - The generated file is **committed** in each client (`mobile/src/api/schema.d.ts`,
     `frontend/src/api/schema.d.ts`).
   - There's no shared package. Two copies of one generated file are simpler than workspace tooling.
2. **Every request goes through one typed client** per app (`createClient<paths>()`). New code must not
   hand-write request or response types.
   - Mobile uses it from day one.
   - Web adopts it in the `/admin` move. Existing hand-written admin types are replaced as each admin
     tab is touched, not in a big-bang rewrite.
3. **The backend makes the contract complete:**
   - Every route gets a `response_model` (or explicit `responses=`).
   - Every route gets a stable `operation_id` (`<tag>_<action>`), for readable generated names and docs.
   - The error envelope is a named component schema.
   - Enums (booking status, roles) are exported as OpenAPI enums so clients get literal unions.
4. **CI drift gates** (owned by infrastructure):
   1. backend: export the contract and `git diff --exit-code .coordination/contracts/openapi.json`.
      A code change without a re-export fails.
   2. mobile and web: `gen:api` then `git diff --exit-code src/api/schema.d.ts`, then type-check.
      A contract change without regenerated client types fails.
   3. Optional, later: `oasdiff breaking` against `main`. Any breaking diff must have an `API_CHANGES.md`
      section with a migration path (Rule 7).
5. **The flow stays as in Rule 6 and the README:**
   1. Backend changes the code, re-exports, and logs it in `API_CHANGES.md`.
   2. Backend's `/handoff` sends inbox entries to mobile/web.
   3. Clients regenerate, fix type errors, and close their entries.
6. **Unifying the error format** (mobile plan #9) is a breaking change for current web code, so it's
   done the Rule 7 way:
   - The backend adds the single shape `{"error": {code, message, details}}` behind an
     `Accept-Version`-style opt-in, or keeps `detail` as an alias for one release.
   - Web migrates during the `/admin` move.
   - Then the old shape is removed.

   Backend proposes the exact mechanism in its contract entry.

## Consequences
- \+ A wrong path, method or field becomes a compile error in clients. Contract drift is caught in CI,
  not by users.
- \+ No runtime cost, no codegen server, no new infrastructure.
- − The contract is only as good as the FastAPI annotations, so the backend has to finish the 7 untyped
  routes and the error schema.
- − Committed generated files make diffs noisy. That's accepted, because it keeps the CI drift check
  trivial.

## Notes on acceptance (2026-10-29)
- Accepted as proposed.
