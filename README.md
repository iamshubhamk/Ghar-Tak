# GharTak

GharTak is a Patna-first hyperlocal service marketplace for verified local service providers.

Current phase: Phase 7 Development Execution, Foundation implementation.

## 🚀 Live Demo & Quick Start

**Live Application:** [https://ghar-tak-frontend.onrender.com/](https://ghar-tak-frontend.onrender.com/)

To quickly test the platform's core workflows, you can use the following roles:

### 1. Test as an Admin
- **Email:** `admin@ghartak.local`
- **Password:** `ChangeMe@123`
- *What you can do:* View the dashboard statistics, search for users, and approve/reject/disable pending Provider accounts.

### 2. Test as a Customer
- Simply click "Register" on the live app and create a new Customer account using any email.
- *What you can do:* Browse verified providers by category/locality and create new booking requests.

### 3. Test as a Provider
- Click "Register" and create a new Provider account.
- *What you can do:* Upload your profile photo and Aadhar card. Note that your profile will remain in "Pending Verification" until an Admin approves it.

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
- Database: MongoDB (via Motor)
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

Start MongoDB (if running locally instead of Atlas):

```powershell
docker compose up -d mongodb
```
*(Alternatively, update `MONGODB_URL` in `.env` to point to a MongoDB Atlas cluster)*

Run the API:

```powershell
cd backend
uvicorn app.main:app --reload
```

Health check:

```text
http://localhost:8000/api/v1/health
```

*Note: Database indexes and default categories are automatically initialized on server startup.*

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
