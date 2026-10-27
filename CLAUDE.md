# GharTak

Hyperlocal home-services marketplace for Patna (customers book verified local providers).

- `backend/` — FastAPI + MongoDB (Motor), JWT auth, API under `/api/v1`
- `mobile/` — React Native (Expo) Android app
- `frontend/` — React + Vite web: marketing site + admin panel
- `.coordination/` — inboxes, changelog and API contract shared by the 5 workstream chats
- `docs/` — rules, plans, ADR-style product docs

Each chat starts with a workstream command (`/backend`, `/mobile`, `/web`, `/release`, `/qa-monitoring`),
then `/sync`.

@docs/RULES.md
