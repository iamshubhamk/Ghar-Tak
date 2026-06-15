# Phase 6 - Implementation Planning

Product: GharTak  
Goal: launch MVP for first 100 users with zero-cost development.  
Architecture: modular monolith with paid-ready infrastructure adapters.

## Foundation Phase

| Area | Plan |
|---|---|
| Deliverables | Monorepo setup, backend app, frontend app, env config, Docker PostgreSQL setup |
| APIs | `GET /api/v1/health` |
| DB Tables | None initially |
| Frontend Screens | Branded app shell and API status |
| Test Cases | Health/root endpoint works, frontend loads, env config exists |

## Phase 1: Authentication and User Management

| Area | Plan |
|---|---|
| Deliverables | Customer/provider registration, login, JWT auth, role guards, admin seed |
| APIs | `/auth/register/customer`, `/auth/register/provider`, `/auth/login`, `/auth/me` |
| DB Tables | `users`, `customer_profiles`, `provider_profiles` |
| Frontend Screens | Login, customer signup, provider signup, pending verification |
| Test Cases | Register, login, duplicates blocked, role access enforced |

## Phase 2: Categories and Provider Onboarding

| Area | Plan |
|---|---|
| Deliverables | Category CRUD, provider profile, service categories, locality coverage, verification |
| APIs | `/categories`, `/admin/categories`, `/admin/providers` |
| DB Tables | `categories`, `provider_categories`, `provider_localities`, `provider_documents` |
| Frontend Screens | Admin categories, admin verification, provider profile |
| Test Cases | Category visibility, provider approval/rejection, document restrictions |

## Phase 3: Customer Discovery

| Area | Plan |
|---|---|
| Deliverables | Customer home, category browsing, provider search, locality filter |
| APIs | `/providers`, `/providers/{id}`, `/providers/{id}/reviews` |
| DB Tables | Existing provider/category/review tables |
| Frontend Screens | Home, category list, provider results, provider detail |
| Test Cases | Verified providers only, filters work, unavailable provider not bookable |

## Phase 4: Booking Engine

| Area | Plan |
|---|---|
| Deliverables | Booking creation, customer history, provider dashboard, status transitions |
| APIs | `/bookings`, `/bookings/my`, `/provider/bookings`, admin booking status APIs |
| DB Tables | `bookings`, `booking_status_history`, `notifications` |
| Frontend Screens | Booking form, booking detail, customer bookings, provider bookings |
| Test Cases | Create, accept, reject, cancel, complete, invalid transitions blocked |

## Phase 5: Cash Payment and Reviews

| Area | Plan |
|---|---|
| Deliverables | Cash tracking, final amount, paid status, review, provider rating |
| APIs | `/bookings/{id}/review`, provider/admin completion/payment APIs |
| DB Tables | `payments`, `reviews` |
| Frontend Screens | Review form, provider ratings, completion state |
| Test Cases | Cash default, review after completion only, duplicate review blocked |

## Phase 6: Admin Operations

| Area | Plan |
|---|---|
| Deliverables | Dashboard, user/provider management, booking management, review moderation |
| APIs | `/admin/dashboard/summary`, `/admin/bookings`, `/admin/reviews` |
| DB Tables | `admin_notes` plus existing tables |
| Frontend Screens | Admin dashboard, booking table, provider table, review moderation |
| Test Cases | Admin-only access, dashboard counts, moderation works |

## Phase 7: Notifications and Infrastructure Adapters

| Area | Plan |
|---|---|
| Deliverables | In-app notifications, optional email adapter, SMS-ready interface |
| APIs | `/notifications`, `/notifications/{id}/read` |
| DB Tables | `notifications` |
| Frontend Screens | Notification list/badge |
| Test Cases | Notifications created for key events and failures do not block actions |

## Phase 8: QA, Deployment, and Launch Readiness

| Area | Plan |
|---|---|
| Deliverables | Backend tests, frontend smoke checks, seed data, README, env docs |
| APIs | All critical APIs covered |
| DB Tables | Migration verification |
| Frontend Screens | Smoke coverage for auth, customer, provider, admin |
| Test Cases | Full MVP happy paths and key failure paths |

## Paid-Ready Adapter Rule

Use replaceable application services:

- `FileStorageService`: local now, S3 later.
- `NotificationService`: in-app now, SMS/email later.
- `PaymentService`: cash now, online gateway later.
- `DatabaseConfig`: local PostgreSQL now, managed PostgreSQL later.
- `CacheService`: optional local Redis now, managed Redis later.

Business code should not call vendor SDKs directly.
