# Phase 7 - P0 Admin, Category, and Booking Intent Fixes

Status: Implemented.

## Implemented Stories

| Story ID | Title | Status |
|---|---|---|
| GT-ADM-007 | Admin Login Setup Guidance | Implemented |
| GT-CAT-006 | Default Category Availability in Customer Booking | Implemented |
| GT-UX-011 | Homepage Service Preselection Reliability | Implemented |

## User-Facing Changes

- The local development login view now shows how to use the seeded admin account.
- Admins still log in through the normal Login flow; public admin signup remains unavailable.
- The customer booking service dropdown now receives default categories even if the manual category seed command was missed.
- Homepage service clicks persist through customer login/signup and preselect the matching booking category.
- If a clicked homepage service is missing from backend categories, the customer sees a clear setup message.

## Developer Changes

- Default service categories are centralized in `backend/app/core/default_categories.py`.
- `CategoryService` now ensures missing default categories before public/admin category listing.
- `scripts.seed_categories` reuses the same category service path.
- Homepage service names are centralized in `frontend/src/lib/defaultServices.ts`.
- Booking intent is stored in session storage under `ghartak_booking_intent_category`.

## Validation

- Backend tests pass.
- Backend lint passes.
- Frontend lint passes.
- Frontend production build passes.
