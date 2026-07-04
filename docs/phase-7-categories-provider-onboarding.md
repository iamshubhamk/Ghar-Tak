# Phase 7 - Categories and Provider Onboarding Implementation

Status: Implemented.

## Deliverables

- Service category model and admin CRUD APIs.
- Public active category listing.
- Provider category mapping.
- Provider locality mapping.
- Provider document metadata model foundation.
- Provider self-profile update API.
- Provider availability update API.
- Admin pending-provider list.
- Admin approve/reject/disable provider APIs.
- Frontend category admin panel.
- Frontend provider onboarding panel.
- Frontend pending provider verification panel.
- Backend tests for category and provider onboarding flows.

## APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/categories` | Public active category list |
| GET | `/api/v1/admin/categories` | Admin list all categories |
| POST | `/api/v1/admin/categories` | Admin create category |
| PATCH | `/api/v1/admin/categories/{category_id}` | Admin update category |
| PATCH | `/api/v1/admin/categories/{category_id}/status` | Admin enable/disable category |
| GET | `/api/v1/provider/me` | Provider profile |
| PATCH | `/api/v1/provider/me` | Provider profile update |
| PATCH | `/api/v1/provider/me/availability` | Provider availability update |
| GET | `/api/v1/admin/providers` | Admin provider list/filter |
| PATCH | `/api/v1/admin/providers/{provider_id}/approve` | Approve provider |
| PATCH | `/api/v1/admin/providers/{provider_id}/reject` | Reject provider |
| PATCH | `/api/v1/admin/providers/{provider_id}/disable` | Disable provider |

## Database Tables

- `categories`
- `provider_categories`
- `provider_localities`
- `provider_documents`

## Frontend Screens

- Admin category creation/list panel.
- Admin pending provider verification panel.
- Provider onboarding/profile panel.
- Provider availability toggle.

## Test Coverage

- Admin can create categories.
- Public users can list active categories.
- Non-admin users cannot create admin categories.
- Disabled categories are hidden publicly.
- Provider can update localities/profile.
- Admin can approve providers.
- Provider can update availability.

## MVP Notes

- Provider document uploads have metadata foundation only; actual upload UI/API can be added when needed.
- Provider verification remains manual, which fits the zero-cost MVP.
- Category search/discovery is the next natural implementation slice.
