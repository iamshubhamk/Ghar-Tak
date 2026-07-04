# Phase 7 - Customer Discovery and Booking Implementation

Status: Implemented.

## What Changed

- Added public verified provider listing.
- Added provider detail endpoint.
- Added booking and booking status history models.
- Added customer booking creation.
- Added customer booking history.
- Added provider booking list.
- Added provider booking actions: accept, reject, start, complete.
- Replaced the single-page workbench UI with a role-based app shell.

## Role-Based UI

- Logged-out users see landing content and login/signup.
- Customers see provider search, booking request form, and booking history.
- Providers see profile onboarding and assigned booking requests.
- Admins see category management and provider verification.

## APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/providers` | Public verified provider search |
| GET | `/api/v1/providers/{provider_id}` | Public provider detail |
| POST | `/api/v1/bookings` | Customer creates booking |
| GET | `/api/v1/bookings/my` | Customer booking history |
| PATCH | `/api/v1/bookings/{booking_id}/cancel` | Customer cancels eligible booking |
| GET | `/api/v1/provider/bookings` | Provider booking list |
| PATCH | `/api/v1/provider/bookings/{booking_id}/accept` | Provider accepts booking |
| PATCH | `/api/v1/provider/bookings/{booking_id}/reject` | Provider rejects booking |
| PATCH | `/api/v1/provider/bookings/{booking_id}/start` | Provider starts service |
| PATCH | `/api/v1/provider/bookings/{booking_id}/complete` | Provider completes service |

## Local DB Note

If you already created the database before this phase, run this again from `backend/`:

```powershell
.\.venv\Scripts\python -m scripts.create_tables
```

This creates the new `bookings` and `booking_status_history` tables without deleting existing data.
