# GharTak

GharTak is a Patna-first hyperlocal service marketplace for verified local service providers.

Current phase: Phase 7 Development Execution, Foundation implementation.

## Product Documents

- [Phase 1 BRD](docs/phase-1-brd.md)
- [Phase 2 PRD](docs/phase-2-prd.md)
- [Phase 3 FSD](docs/phase-3-fsd.md)
- [Phase 4 User Stories](docs/phase-4-user-stories.md)
- [Phase 5 System Design](docs/phase-5-system-design.md)

## Architecture Direction

The MVP is a modular monolith:

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, Python
- Database: PostgreSQL
- Storage: local filesystem during MVP, S3-ready adapter later
- Notifications: in-app during MVP, SMS/email adapters later
- Payments: Cash on Service during MVP, online payment adapter later

The guiding rule is zero-cost development now, paid-ready migration later.

## Repository Structure

```text
backend/
  app/
    api/
    core/
    db/
    services/
  tests/
frontend/
  src/
docs/
```

## Local Backend Setup

From the repository root:

```powershell
Copy-Item backend/.env.example backend/.env
python -m venv backend/.venv
backend/.venv/Scripts/Activate.ps1
pip install -r backend/requirements.txt
```

Start PostgreSQL:

```powershell
docker compose up -d postgres
```

Run the API:

```powershell
cd backend
uvicorn app.main:app --reload
```

Health check:

```text
http://localhost:8000/api/v1/health
```

Create local database tables:

```powershell
cd backend
python -m scripts.create_tables
```

Seed the first admin account:

```powershell
cd backend
$env:ADMIN_EMAIL="admin@ghartak.local"
$env:ADMIN_PASSWORD="ChangeMe@123"
python -m scripts.seed_admin
```

Public users can register only as customers or providers. Admin users are seeded locally and should use a strong password outside local development.

Auth endpoints:

```text
POST /api/v1/auth/register/customer
POST /api/v1/auth/register/provider
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

## Local Frontend Setup

From the repository root:

```powershell
Copy-Item frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

## Zero-Cost MVP Notes

- No paid SMS in MVP.
- No online payment gateway in MVP.
- No managed database required for local development.
- No S3 required for provider documents initially.
- No paid deployment required before launch validation.

When paid services are introduced, business logic should remain unchanged because integrations are routed through service adapters.
