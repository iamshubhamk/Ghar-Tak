# Phase 7 - P0 Admin-Assigned Booking Flow

Status: Implemented.

## Implemented Stories

| Story ID | Title | Status |
|---|---|---|
| GT-AUTH-007 | Email-Only Login Form | Implemented |
| GT-ADM-008 | Idempotent Admin Seed Credentials | Implemented |
| GT-BOOK-010 | Admin-Assigned Booking Requests | Implemented |

## Product Decision

Customers should not choose providers during MVP. Provider supply will be thin at launch, so the customer journey is now demand-first:

1. Customer selects service.
2. Customer enters locality, preferred date/time, and issue description.
3. Booking is created without a provider.
4. Admin reviews the request and assigns a verified provider.
5. Provider sees the assigned request and can accept, reject, start, and complete it.

## Implementation Notes

- `provider_id` on bookings is now nullable.
- Customer booking creation no longer requires `provider_id`.
- Admin can list bookings via `/api/v1/admin/bookings`.
- Admin can assign providers via `/api/v1/admin/bookings/{booking_id}/assign`.
- Provider dashboard only shows assigned bookings.
- Customer dashboard shows `Awaiting admin assignment` until a provider is assigned.
- `scripts.seed_admin` now updates existing admin credentials from environment variables instead of returning early.
- `scripts.seed_admin` now runs correctly with `python -m scripts.seed_admin` and prints clear completion/failure output.
- Booking creation also applies the local PostgreSQL nullable-provider migration on the active DB session before insert.
- Login UI now asks for email and password only.

## Local Admin Recovery

```powershell
cd backend
$env:ADMIN_EMAIL="admin@ghartak.local"
$env:ADMIN_PASSWORD="ChangeMe@123"
python -m scripts.seed_admin
```

Rerunning the command updates the password for the seeded admin email.
