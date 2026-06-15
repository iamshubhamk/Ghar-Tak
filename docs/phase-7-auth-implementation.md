# Phase 7 - Authentication and User Management Implementation

Status: Implemented.

## Deliverables

- Customer registration API.
- Provider registration API.
- Login API.
- Current user API.
- JWT token creation and decoding.
- Password hashing.
- SQLAlchemy user/customer/provider models.
- Backend role dependency helpers.
- Local table creation script.
- Local admin seed script.
- Frontend auth panel for customer signup, provider signup, and login.
- Auth-focused backend tests.

## APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register/customer` | Register customer and return JWT |
| POST | `/api/v1/auth/register/provider` | Register provider in pending verification and return JWT |
| POST | `/api/v1/auth/login` | Login customer/provider/admin |
| GET | `/api/v1/auth/me` | Return current authenticated user |

## Database Tables

- `users`
- `customer_profiles`
- `provider_profiles`

## Frontend Screens

- Customer signup form.
- Provider signup form.
- Login form.
- API status indicator remains visible in the app shell.

## Test Coverage

- Customer registration returns token and profile.
- Provider registration defaults to pending verification.
- Duplicate email/phone is blocked.
- Login returns token.
- `/auth/me` returns authenticated user.
- Invalid login is rejected.

## Local Commands

From `backend/`:

```powershell
python -m scripts.create_tables
python -m scripts.seed_admin
pytest
```

## Zero-Cost and Paid-Ready Notes

- Admin users are seeded locally, so there is no paid identity provider.
- JWT auth is local and can later support OTP/SMS login through a notification adapter.
- Provider verification is manual for MVP.
- No paid SMS, email, or KYC dependency is required.
