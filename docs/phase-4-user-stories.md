# Phase 4 - Jira User Stories

Product display name: GharTak  
Scope: MVP with zero-cost development and paid-ready infrastructure boundaries.

## Epic GT-EPIC-01: Authentication and User Access

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-AUTH-001 | Customer Registration | As a customer, I want to create an account so that I can book local services. | High | MVP | None | M |
| GT-AUTH-002 | Provider Registration | As a provider, I want to register my service profile so that I can receive work opportunities. | High | MVP | None | M |
| GT-AUTH-003 | User Login | As a user, I want to log in securely so that I can access my dashboard. | High | MVP | GT-AUTH-001, GT-AUTH-002 | M |
| GT-AUTH-004 | JWT Session Handling | As the system, I want to issue JWT tokens so that authenticated APIs are protected. | High | MVP | GT-AUTH-003 | M |
| GT-AUTH-005 | Role-Based Access | As the system, I want to restrict access by role so users only access permitted functions. | High | MVP | GT-AUTH-004 | M |
| GT-AUTH-006 | Admin Account Access | As an admin, I want secure login so that I can manage the marketplace. | High | MVP | GT-AUTH-003 | S |

Acceptance criteria:

- Customer registration hashes password and blocks duplicate phone/email.
- Provider registration creates pending verification profile.
- Login rejects invalid credentials and disabled accounts.
- JWT-protected APIs reject missing/invalid tokens.
- Backend enforces role access.
- Admin cannot be publicly registered.

## Epic GT-EPIC-02: Service Categories

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-CAT-001 | View Active Categories | As a customer, I want to view service categories so I can choose a service. | High | MVP | None | S |
| GT-CAT-002 | Admin Create Category | As an admin, I want to create categories so the catalog can be managed. | High | MVP | GT-AUTH-006 | S |
| GT-CAT-003 | Admin Edit Category | As an admin, I want to edit categories so service information stays accurate. | Medium | MVP | GT-CAT-002 | S |
| GT-CAT-004 | Enable/Disable Category | As an admin, I want to enable or disable categories so unavailable services are hidden. | High | MVP | GT-CAT-002 | S |

Acceptance criteria:

- Customers see active categories only.
- Admin can create categories with unique slug.
- Disabled categories cannot receive new bookings.
- Existing bookings are not broken when a category is disabled.

## Epic GT-EPIC-03: Provider Onboarding and Verification

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-PROV-001 | Provider Profile Submission | As a provider, I want to add services, localities, and experience. | High | MVP | GT-AUTH-002, GT-CAT-001 | M |
| GT-PROV-002 | Provider Pending Screen | As a provider, I want to see verification status. | Medium | MVP | GT-PROV-001 | S |
| GT-PROV-003 | Admin View Pending Providers | As an admin, I want to view pending providers. | High | MVP | GT-AUTH-006, GT-PROV-001 | M |
| GT-PROV-004 | Approve Provider | As an admin, I want to approve verified providers. | High | MVP | GT-PROV-003 | M |
| GT-PROV-005 | Reject Provider | As an admin, I want to reject unsuitable providers. | High | MVP | GT-PROV-003 | S |
| GT-PROV-006 | Disable Provider | As an admin, I want to disable unreliable providers. | High | MVP | GT-PROV-004 | S |
| GT-PROV-007 | Provider Document Upload | As a provider, I want to upload verification documents. | Medium | MVP | GT-PROV-001 | M |

Acceptance criteria:

- Pending providers are hidden publicly.
- Approved providers become searchable.
- Rejected providers stay hidden.
- Disabled providers cannot receive new bookings.
- Uploaded files are restricted by type and size.

## Epic GT-EPIC-04: Provider Discovery

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-DISC-001 | Search Providers by Category | As a customer, I want to find providers by category. | High | MVP | GT-CAT-001, GT-PROV-004 | M |
| GT-DISC-002 | Filter Providers by Locality | As a customer, I want to filter nearby providers. | High | MVP | GT-DISC-001 | M |
| GT-DISC-003 | View Provider Profile | As a customer, I want to view provider details before booking. | High | MVP | GT-DISC-001 | M |
| GT-DISC-004 | Show Provider Rating | As a customer, I want to see ratings. | Medium | MVP | GT-REV-001 | S |
| GT-DISC-005 | Provider Availability Badge | As a customer, I want to see availability. | Medium | MVP | GT-PROV-008 | S |

Acceptance criteria:

- Only verified active providers appear.
- Category and locality filters work.
- Empty states appear when no providers match.
- Provider profile shows services, localities, experience, price note, rating, and availability.

## Epic GT-EPIC-05: Provider Dashboard

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-PROV-008 | Manage Availability | As a provider, I want to set availability. | High | MVP | GT-PROV-004 | S |
| GT-PROV-009 | Edit Provider Profile | As a provider, I want to update profile details. | Medium | MVP | GT-PROV-004 | M |
| GT-PROV-010 | View Provider Bookings | As a provider, I want to see booking requests. | High | MVP | GT-BOOK-001 | M |
| GT-PROV-011 | View Completed Jobs | As a provider, I want to view completed jobs. | Medium | MVP | GT-BOOK-006 | S |
| GT-PROV-012 | Basic Earnings Summary | As a provider, I want to see cash amount from completed jobs. | Low | Nice to Have | GT-BOOK-006 | S |

Acceptance criteria:

- Provider can toggle availability.
- Provider can update allowed profile fields.
- Provider sees only own bookings.
- Completed jobs are visible.

## Epic GT-EPIC-06: Booking Lifecycle

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-BOOK-001 | Create Booking Request | As a customer, I want to create a booking. | High | MVP | GT-DISC-003 | L |
| GT-BOOK-002 | View Customer Bookings | As a customer, I want to view my bookings. | High | MVP | GT-BOOK-001 | M |
| GT-BOOK-003 | Provider Accept Booking | As a provider, I want to accept booking requests. | High | MVP | GT-BOOK-001, GT-PROV-010 | M |
| GT-BOOK-004 | Provider Reject Booking | As a provider, I want to reject booking requests. | High | MVP | GT-BOOK-001, GT-PROV-010 | S |
| GT-BOOK-005 | Mark Booking In Progress | As a provider, I want to mark service in progress. | Medium | MVP | GT-BOOK-003 | S |
| GT-BOOK-006 | Complete Booking | As a provider/admin, I want to mark bookings completed. | High | MVP | GT-BOOK-005 | M |
| GT-BOOK-007 | Customer Cancel Booking | As a customer, I want to cancel eligible bookings. | Medium | MVP | GT-BOOK-001 | M |
| GT-BOOK-008 | Admin Update Booking Status | As an admin, I want to update booking status. | High | MVP | GT-BOOK-001 | M |
| GT-BOOK-009 | Booking Status History | As an admin, I want to see status history. | Medium | Nice to Have | GT-BOOK-001 | M |

Acceptance criteria:

- Booking starts as REQUESTED.
- Past preferred time is blocked.
- Provider can accept/reject requested bookings.
- Invalid transitions are blocked.
- Customer sees only own bookings.
- Provider sees only assigned/requested bookings.
- Admin can intervene.

## Epic GT-EPIC-07: Cash Payment Tracking

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-PAY-001 | Set Cash Payment Mode | As the system, bookings use Cash on Service by default. | High | MVP | GT-BOOK-001 | S |
| GT-PAY-002 | Record Final Amount | As a provider/admin, I want to record final service amount. | Medium | Nice to Have | GT-BOOK-006 | S |
| GT-PAY-003 | Mark Cash Paid | As a provider/admin, I want to mark cash paid. | Medium | MVP | GT-BOOK-006 | S |
| GT-PAY-004 | Payment Dispute Status | As an admin, I want to mark payment disputed. | Low | Nice to Have | GT-PAY-003 | S |

Acceptance criteria:

- No online payment option appears in MVP.
- Final amount is optional and non-negative.
- Paid cash status appears on booking detail.

## Epic GT-EPIC-08: Ratings and Reviews

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-REV-001 | Submit Review | As a customer, I want to rate completed service. | High | MVP | GT-BOOK-006 | M |
| GT-REV-002 | Prevent Duplicate Reviews | As the system, one booking should have one review. | High | MVP | GT-REV-001 | S |
| GT-REV-003 | Provider Average Rating | As the system, I want to calculate average rating. | Medium | MVP | GT-REV-001 | M |
| GT-REV-004 | Admin Hide Review | As an admin, I want to hide inappropriate reviews. | Medium | MVP | GT-REV-001 | S |
| GT-REV-005 | Display Provider Reviews | As a customer, I want to read provider reviews. | Medium | MVP | GT-REV-001 | S |

Acceptance criteria:

- Review allowed only after completion.
- Rating is 1-5.
- Duplicate reviews are blocked.
- Hidden reviews are excluded from public rating.

## Epic GT-EPIC-09: Admin Operations

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-ADM-001 | Admin Dashboard Summary | As an admin, I want dashboard metrics. | High | MVP | GT-AUTH-006 | M |
| GT-ADM-002 | View All Customers | As an admin, I want to view customers. | Medium | MVP | GT-AUTH-006 | S |
| GT-ADM-003 | View All Providers | As an admin, I want to manage providers. | High | MVP | GT-PROV-003 | S |
| GT-ADM-004 | View All Bookings | As an admin, I want to manage operations. | High | MVP | GT-BOOK-001 | M |
| GT-ADM-005 | Add Admin Notes | As an admin, I want internal notes. | Medium | Nice to Have | GT-ADM-004 | S |
| GT-ADM-006 | Disable User Account | As an admin, I want to disable problematic users. | Medium | MVP | GT-AUTH-005 | S |

Acceptance criteria:

- Admin dashboard shows customers, providers, pending providers, bookings, completed bookings.
- Admin filters bookings by status/category/locality/date.
- Disabled users cannot log in.

## Epic GT-EPIC-10: Notifications

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-NOTIF-001 | In-App Notifications | As a user, I want important booking updates. | Medium | MVP | GT-BOOK-001 | M |
| GT-NOTIF-002 | Provider Application Notification | As an admin, I want notice when a provider applies. | Medium | MVP | GT-PROV-001 | S |
| GT-NOTIF-003 | Booking Status Notifications | As a user, I want booking status updates. | Medium | MVP | GT-BOOK-003 | M |
| GT-NOTIF-004 | Email Notifications | As a user, I want optional email updates. | Low | Nice to Have | GT-NOTIF-001 | M |
| GT-NOTIF-005 | SMS Notifications | As a user, I want SMS updates. | Low | Post-MVP | GT-NOTIF-003 | L |

Acceptance criteria:

- Notification is created for key events.
- Unread count works.
- Notification failure does not break booking flow.
- SMS is not required in MVP.

## Epic GT-EPIC-11: Frontend UX and Branding

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-UX-001 | Apply GharTak Branding | As a user, I want the app to match the brand. | High | MVP | Client logo/ad assets | M |
| GT-UX-002 | Mobile-First Layout | As a mobile user, I want usable screens. | High | MVP | Core screens | M |
| GT-UX-003 | Customer Home Screen | As a customer, I want categories and search. | High | MVP | GT-CAT-001 | M |
| GT-UX-004 | Provider Join CTA | As a provider, I want a visible join option. | High | MVP | GT-AUTH-002 | S |
| GT-UX-005 | Hindi-Friendly Copy | As a local user, I want simple familiar copy. | Medium | MVP | Brand context | M |
| GT-UX-006 | Logo Asset Integration | As the owner, I want client logo used. | High | MVP | Image assets | S |

Acceptance criteria:

- UI uses navy/orange brand palette.
- Product display name is GharTak.
- Core screens work on mobile.
- Provider registration entry is visible from public screens.

## Epic GT-EPIC-12: Security, Quality, and Operations

| Story ID | Title | Description | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-SEC-001 | Password Hashing | As the system, passwords must be hashed. | High | MVP | GT-AUTH-001 | S |
| GT-SEC-002 | Backend Input Validation | As the system, bad data is rejected. | High | MVP | All APIs | M |
| GT-SEC-003 | CORS Configuration | As the system, allowed origins are configurable. | Medium | MVP | Backend setup | S |
| GT-SEC-004 | File Upload Restrictions | As the system, unsafe uploads are blocked. | Medium | MVP | GT-PROV-007 | M |
| GT-QA-001 | Backend API Tests | As a developer, I want tests for critical APIs. | High | MVP | Core APIs | L |
| GT-QA-002 | Frontend Smoke Tests | As a developer, I want smoke tests for screens. | Medium | MVP | Core screens | M |
| GT-OPS-001 | Local Development Setup | As a developer, I want simple local setup. | High | MVP | Repo setup | M |
| GT-OPS-002 | Environment Configuration | As a developer, I want env-based config. | High | MVP | Backend/frontend setup | S |

Acceptance criteria:

- Passwords are never stored as plaintext.
- Inputs are validated.
- CORS is configurable.
- `.env.example` exists.
- README documents local setup.

## MVP Release Backlog

Must Have:

- Auth and roles.
- Categories.
- Provider onboarding and verification.
- Provider discovery.
- Booking lifecycle.
- Cash payment tracking.
- Reviews and ratings.
- Admin dashboard and operations.
- Branding and mobile-first UX.
- Security, validation, tests, local setup.

Nice to Have:

- Earnings summary.
- Booking status history.
- Final amount tracking.
- Payment dispute status.
- Email notifications.
- Admin notes.

Post-MVP:

- SMS notifications.
- Online payments.
- Real-time chat.
- Native mobile apps.
- Advanced analytics.
- Multi-city support.
- Provider wallet.
- Referral/loyalty programs.

## Approval Status

Approved by product owner. Proceeded to Phase 5 System Design.
