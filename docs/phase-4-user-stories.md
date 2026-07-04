# Phase 4 - Jira User Stories

Product display name: GharTak  
Scope: MVP with zero-cost development and paid-ready infrastructure boundaries.  
Last updated: 2026-06-19

This is now a living backlog. Completed stories are crossed out and marked `Done`. Partially implemented stories remain open until the end-user flow is actually usable, not merely present in backend code.

## Status Legend

| Status | Meaning |
|---|---|
| Done | Implemented and verified in the current local codebase |
| Partial | Some backend/UI exists, but the user flow is incomplete |
| Next | Highest-priority upcoming work |
| Todo | Not started |
| Nice | Nice to Have |
| Post-MVP | Deferred until after MVP validation |

## Priority Legend

| Priority | Meaning |
|---|---|
| P0 | Must fix before continuing deeper feature work |
| P1 | Required for MVP launch |
| P2 | Important but can follow core MVP flow |
| P3 | Nice to Have |
| P4 | Post-MVP |

---

# Recently Completed P0 Backlog

These items were implemented in the P0 UX and flow hardening pass because they directly affect usability and local testing.

| Story ID | Title | Status | Priority | Dependencies | Complexity |
|---|---|---|---|---|---|
| GT-UX-007 | ~~Public Homepage Navigation~~ | Done | P0 | GT-UX-001 | M |
| GT-UX-008 | ~~Separate Customer and Provider Auth Views~~ | Done | P0 | GT-AUTH-001, GT-AUTH-002, GT-AUTH-003 | M |
| GT-UX-009 | ~~Wire Homepage CTAs~~ | Done | P0 | GT-UX-007, GT-UX-008 | M |
| GT-CAT-005 | ~~Seed Default Service Categories~~ | Done | P0 | GT-CAT-002 | S |
| GT-UX-010 | ~~Customer Booking Stepper UX~~ | Done | P0 | GT-DISC-001, GT-BOOK-001 | M |
| GT-PROV-013 | ~~Provider Under Review Experience~~ | Done | P0 | GT-PROV-002 | S |
| GT-ERR-001 | ~~Friendly UI Error Messages~~ | Done | P0 | Core APIs | M |
| GT-LOG-001 | ~~Structured Backend Error Logs~~ | Done | P0 | GT-ERR-001 | S |

## Recently Added User Stories

| Story ID | Title | Description | Acceptance Criteria | Priority | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-UX-007 | ~~Public Homepage Navigation~~ | As a visitor, I want a clean homepage without embedded auth forms so that I can understand GharTak before choosing an action. | Homepage shows brand, service preview, trust copy, and footer; login/signup forms are not shown inline; header has Book a Service, Join as Provider, and Login actions. | P0 | GT-UX-001 | M |
| GT-UX-008 | ~~Separate Customer and Provider Auth Views~~ | As a user, I want separate auth flows for customers and providers so that I do not accidentally use the wrong signup path. | Customer auth and provider auth are separate views; provider signup explains review process; customer signup leads to booking flow. | P0 | GT-AUTH-001, GT-AUTH-002, GT-AUTH-003 | M |
| GT-UX-009 | ~~Wire Homepage CTAs~~ | As a visitor, I want homepage buttons and category cards to take me to the correct flow. | Book a Service routes to customer auth/dashboard; Join as Provider routes to provider auth/dashboard; category click starts customer booking intent. | P0 | GT-UX-007, GT-UX-008 | M |
| GT-CAT-005 | ~~Seed Default Service Categories~~ | As a developer/admin, I want default categories seeded locally so customer testing works immediately. | Seed script creates Electrician, Plumber, Carpenter, Painter, AC Repair, House Cleaning, Driver, Tutor, Event Staff, Other Service; script is documented; reruns are safe. | P0 | GT-CAT-002 | S |
| GT-UX-010 | ~~Customer Booking Stepper UX~~ | As a customer, I want booking to happen in clear steps so I understand what is required. | Customer flow is choose service, choose provider, enter address/time/problem, submit; booking form disabled until service and provider are selected; empty states explain missing setup. | P0 | GT-DISC-001, GT-BOOK-001 | M |
| GT-PROV-013 | ~~Provider Under Review Experience~~ | As a provider, I want to know my profile is under review after signup. | Pending providers see review status, next steps, and no booking controls until approved; rejected providers see clear status. | P0 | GT-PROV-002 | S |
| GT-ERR-001 | ~~Friendly UI Error Messages~~ | As a user, I want clear error messages so I know what went wrong. | Duplicate account shows exact message; no categories/providers have clear empty states; invalid booking transition is understandable; no generic "Request failed" for known errors. | P0 | Core APIs | M |
| GT-LOG-001 | ~~Structured Backend Error Logs~~ | As a developer, I want readable backend logs so I can debug local issues quickly. | Handled application errors log endpoint, status, error code, and non-sensitive context; no passwords/JWTs logged. | P0 | GT-ERR-001 | S |
| GT-ADM-007 | ~~Admin Login Setup Guidance~~ | As a solo developer, I need a clear way to create and log in as admin so I can approve providers and manage categories locally. | README and UI/admin access notes clearly explain admin seed command; default local credentials are documented; Login flow accepts admin credentials and routes to admin dashboard; no public admin signup is exposed. | P0 | GT-AUTH-006 | S |
| GT-CAT-006 | ~~Default Category Availability in Customer Booking~~ | As a customer, I want the Choose Service dropdown to contain the same services shown on the homepage so I can book immediately. | Customer booking category dropdown contains Electrician, Plumber, Carpenter, Painter, AC Repair, Appliance Repair, House Cleaning, Driver, Tutor, Event Staff, and Other Service in local MVP setup; dropdown is not empty after standard local setup; homepage service list and seed list use one shared source or documented synchronized source. | P0 | GT-CAT-005, GT-UX-007 | M |
| GT-UX-011 | ~~Homepage Service Preselection Reliability~~ | As a customer, I want the service I clicked on the homepage to be preselected after login/signup so I can continue booking without repeating my choice. | Clicking a homepage service stores booking intent; after customer login or signup, dashboard opens with the matching category selected; if the category does not exist, the UI explains the setup issue and preserves the intent after categories are available. | P0 | GT-CAT-006, GT-UX-009, GT-UX-010 | M |
| GT-AUTH-007 | ~~Email-Only Login Form~~ | As a returning user, I want login to ask only for email and password so the form is simple and admin login is obvious. | Login form shows email and password only; phone is requested only during signup; login API payload does not send empty phone fields from UI. | P0 | GT-AUTH-003 | S |
| GT-ADM-008 | ~~Idempotent Admin Seed Credentials~~ | As a solo developer, I want admin seed credentials to update from environment variables so I can recover local admin access. | Running `scripts.seed_admin` creates admin if missing; if admin exists for `ADMIN_EMAIL`, name, phone, active status, and password are updated from environment variables; admin credentials are not displayed in the app UI. | P0 | GT-AUTH-006 | S |
| GT-BOOK-010 | ~~Admin-Assigned Booking Requests~~ | As a customer, I want to request a service without choosing a provider so booking works before provider supply is mature. | Customer creates booking with service, locality, preferred time, and issue description; booking can be unassigned; admin can view bookings and assign a verified provider who serves the category; provider dashboard shows assigned requests; customer booking history reflects awaiting/assigned provider state. | P0 | GT-BOOK-001, GT-ADM-003 | L |
| GT-BOOK-011 | ~~Provider View Assigned Customer Details~~ | As an assigned provider, I want to see enough customer details to complete the job. | Assigned provider can see customer name, phone, locality, preferred date/time, service category, and issue description; unrelated providers cannot access those details; full address/contact details are visible only after admin assignment; customer details are not shown publicly. | P1 | GT-BOOK-010, GT-PROV-010 | M |
| GT-CAT-007 | ~~Service Price Tags~~ | As a customer, I want visible price tags for services so I know the expected starting cost before requesting a booking. | Homepage service cards and customer booking service selection show a price tag for every default service except Other Service; Other Service shows custom quote/manual review copy; price labels are seed-backed and can later become admin-managed without changing the customer UI. | P1 | GT-CAT-005, GT-CAT-006, GT-UX-007 | M |

---

# Epic GT-EPIC-01: Authentication and User Access

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-AUTH-001 | ~~Customer Registration~~ | Done | P1 | MVP | None | M |
| GT-AUTH-002 | ~~Provider Registration~~ | Done | P1 | MVP | None | M |
| GT-AUTH-003 | ~~User Login~~ | Done | P1 | MVP | GT-AUTH-001, GT-AUTH-002 | M |
| GT-AUTH-004 | ~~JWT Session Handling~~ | Done | P1 | MVP | GT-AUTH-003 | M |
| GT-AUTH-005 | ~~Role-Based Access~~ | Done | P1 | MVP | GT-AUTH-004 | M |
| GT-AUTH-006 | ~~Admin Account Access~~ | Done | P1 | MVP | GT-AUTH-003 | S |
| GT-AUTH-007 | ~~Email-Only Login Form~~ | Done | P0 | MVP | GT-AUTH-003 | S |

Notes:

- Core auth works.
- Separate customer/provider auth views are implemented.
- Duplicate account errors now show a friendly user-facing message.
- Login UI now asks for email and password only; phone remains on signup.

---

# Epic GT-EPIC-02: Service Categories

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-CAT-001 | ~~View Active Categories~~ | Done | P1 | MVP | None | S |
| GT-CAT-002 | ~~Admin Create Category~~ | Done | P1 | MVP | GT-AUTH-006 | S |
| GT-CAT-003 | ~~Admin Edit Category~~ | Done | P2 | MVP | GT-CAT-002 | S |
| GT-CAT-004 | ~~Enable/Disable Category~~ | Done | P1 | MVP | GT-CAT-002 | S |
| GT-CAT-005 | ~~Seed Default Service Categories~~ | Done | P0 | MVP | GT-CAT-002 | S |
| GT-CAT-006 | ~~Default Category Availability in Customer Booking~~ | Done | P0 | MVP | GT-CAT-005, GT-UX-007 | M |
| GT-CAT-007 | ~~Service Price Tags~~ | Done | P1 | MVP | GT-CAT-005, GT-CAT-006, GT-UX-007 | M |

Notes:

- Category APIs exist.
- Default seed categories are available through `python -m scripts.seed_categories`.
- The customer dropdown is usable immediately after the seed script runs.
- Category listing now ensures missing default categories exist, so local customer booking does not depend on remembering the seed command.
- Homepage and customer booking now show MVP service price tags; detailed dynamic pricing remains Post-MVP.

---

# Epic GT-EPIC-03: Provider Onboarding and Verification

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-PROV-001 | ~~Provider Profile Submission~~ | Done | P1 | MVP | GT-AUTH-002, GT-CAT-001 | M |
| GT-PROV-002 | ~~Provider Pending Screen~~ | Done | P0 | MVP | GT-PROV-001 | S |
| GT-PROV-003 | ~~Admin View Pending Providers~~ | Done | P1 | MVP | GT-AUTH-006, GT-PROV-001 | M |
| GT-PROV-004 | ~~Approve Provider~~ | Done | P1 | MVP | GT-PROV-003 | M |
| GT-PROV-005 | ~~Reject Provider~~ | Done | P1 | MVP | GT-PROV-003 | S |
| GT-PROV-006 | ~~Disable Provider~~ | Done | P2 | MVP | GT-PROV-004 | S |
| GT-PROV-007 | Provider Document Upload | Partial | P2 | MVP | GT-PROV-001 | M |
| GT-PROV-013 | ~~Provider Under Review Experience~~ | Done | P0 | MVP | GT-PROV-002 | S |

Notes:

- Provider approval/rejection backend and admin UI exist.
- Provider document metadata foundation exists, but actual upload API/UI is not complete.
- Provider pending/rejected states now have a dedicated UI.

---

# Epic GT-EPIC-04: Provider Discovery

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-DISC-001 | ~~Search Providers by Category~~ | Done | P1 | MVP | GT-CAT-001, GT-PROV-004 | M |
| GT-DISC-002 | ~~Filter Providers by Locality~~ | Done | P1 | MVP | GT-DISC-001 | M |
| GT-DISC-003 | ~~View Provider Profile~~ | Done | P1 | MVP | GT-DISC-001 | M |
| GT-DISC-004 | ~~Show Provider Rating~~ | Done | P2 | MVP | GT-REV-001 | S |
| GT-DISC-005 | Provider Availability Badge | Partial | P2 | MVP | GT-PROV-008 | S |

Notes:

- Public provider listing API exists.
- Customer can search providers, but UX needs a clearer step-by-step flow.
- Customer dashboard now includes a verified-provider directory with ratings and review snippets.
- Provider rating is visible in the verified-provider directory.

---

# Epic GT-EPIC-05: Provider Dashboard

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-PROV-008 | ~~Manage Availability~~ | Done | P1 | MVP | GT-PROV-004 | S |
| GT-PROV-009 | ~~Edit Provider Profile~~ | Done | P1 | MVP | GT-PROV-004 | M |
| GT-PROV-010 | ~~View Provider Bookings~~ | Done | P1 | MVP | GT-BOOK-001 | M |
| GT-PROV-011 | ~~View Completed Jobs~~ | Done | P1 | MVP | GT-BOOK-006 | S |
| GT-PROV-012 | Basic Earnings Summary | Todo | P3 | Nice to Have | GT-BOOK-006 | S |
| GT-PROV-013 | ~~Provider Under Review Experience~~ | Done | P0 | MVP | GT-PROV-002 | S |
| GT-BOOK-011 | ~~Provider View Assigned Customer Details~~ | Done | P1 | MVP | GT-BOOK-010, GT-PROV-010 | M |

Notes:

- Provider bookings can be filtered by all, active, and completed jobs.
- Ratings/reviews are not yet visible.
- Assigned providers can see customer contact and request details for job completion.

---

# Epic GT-EPIC-06: Booking Lifecycle

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-BOOK-001 | ~~Create Booking Request~~ | Done | P1 | MVP | GT-DISC-003 | L |
| GT-BOOK-002 | ~~View Customer Bookings~~ | Done | P1 | MVP | GT-BOOK-001 | M |
| GT-BOOK-003 | ~~Provider Accept Booking~~ | Done | P1 | MVP | GT-BOOK-001, GT-PROV-010 | M |
| GT-BOOK-004 | ~~Provider Reject Booking~~ | Done | P1 | MVP | GT-BOOK-001, GT-PROV-010 | S |
| GT-BOOK-005 | ~~Mark Booking In Progress~~ | Done | P1 | MVP | GT-BOOK-003 | S |
| GT-BOOK-006 | ~~Complete Booking by Provider~~ | Done | P1 | MVP | GT-BOOK-005 | M |
| GT-BOOK-007 | Customer Cancel Booking | Partial | P2 | MVP | GT-BOOK-001 | M |
| GT-BOOK-008 | ~~Admin Update Booking Status~~ | Done | P2 | MVP | GT-BOOK-001 | M |
| GT-BOOK-009 | ~~Booking Status History Foundation~~ | Done | P2 | Nice to Have | GT-BOOK-001 | M |
| GT-UX-010 | ~~Customer Booking Stepper UX~~ | Done | P0 | MVP | GT-DISC-001, GT-BOOK-001 | M |
| GT-BOOK-010 | ~~Admin-Assigned Booking Requests~~ | Done | P0 | MVP | GT-BOOK-001, GT-ADM-003 | L |
| GT-BOOK-011 | ~~Provider View Assigned Customer Details~~ | Done | P1 | MVP | GT-BOOK-010, GT-PROV-010 | M |

Notes:

- Core booking lifecycle backend and basic UI exist.
- Customer booking now uses a service -> request -> admin assignment flow.
- Customer cancellation exists in API but needs clearer UI exposure.
- Admin can view booking requests, filter them, assign verified providers, and update status.
- Provider booking cards now include assigned customer contact and issue details.

---

# Epic GT-EPIC-07: Cash Payment Tracking

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-PAY-001 | ~~Set Cash Payment Mode~~ | Done | P1 | MVP | GT-BOOK-001 | S |
| GT-PAY-002 | ~~Record Final Amount~~ | Done | P2 | Nice to Have | GT-BOOK-006 | S |
| GT-PAY-003 | ~~Mark Cash Paid~~ | Done | P1 | MVP | GT-BOOK-006 | S |
| GT-PAY-004 | Payment Dispute Status | Todo | P3 | Nice to Have | GT-PAY-003 | S |

Notes:

- Booking defaults to Cash on Service.
- Provider completion can record final amount.
- Cash payment status can be marked paid by provider/admin after completion.

---

# Epic GT-EPIC-08: Ratings and Reviews

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-REV-001 | ~~Submit Review~~ | Done | P1 | MVP | GT-BOOK-006 | M |
| GT-REV-002 | ~~Prevent Duplicate Reviews~~ | Done | P1 | MVP | GT-REV-001 | S |
| GT-REV-003 | ~~Provider Average Rating~~ | Done | P1 | MVP | GT-REV-001 | M |
| GT-REV-004 | ~~Admin Hide Review~~ | Done | P2 | MVP | GT-REV-001 | S |
| GT-REV-005 | ~~Display Provider Reviews~~ | Done | P1 | MVP | GT-REV-001 | S |

Notes:

- Customers can review completed assigned bookings once.
- Provider average rating and public review display are implemented.
- Admin can hide reviews; hidden reviews are removed from public provider reviews and rating totals.

---

# Epic GT-EPIC-09: Admin Operations

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-ADM-001 | ~~Admin Dashboard Summary~~ | Done | P2 | MVP | GT-AUTH-006 | M |
| GT-ADM-002 | ~~View All Customers~~ | Done | P2 | MVP | GT-AUTH-006 | S |
| GT-ADM-003 | ~~View All Providers~~ | Done | P1 | MVP | GT-PROV-003 | S |
| GT-ADM-004 | ~~View All Bookings~~ | Done | P2 | MVP | GT-BOOK-001 | M |
| GT-ADM-005 | Add Admin Notes | Todo | P3 | Nice to Have | GT-ADM-004 | S |
| GT-ADM-006 | Disable User Account | Partial | P2 | MVP | GT-AUTH-005 | S |
| GT-ADM-007 | ~~Admin Login Setup Guidance~~ | Done | P0 | MVP | GT-AUTH-006 | S |
| GT-ADM-008 | ~~Idempotent Admin Seed Credentials~~ | Done | P0 | MVP | GT-AUTH-006 | S |

Notes:

- Admin can manage categories and providers.
- Admin accounts are seeded locally from environment variables and use the normal Login flow.
- Admin dashboard summary cards, customer list, and booking filters are implemented.
- Provider disable exists; general customer/user disable is incomplete.

---

# Epic GT-EPIC-10: Notifications

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-NOTIF-001 | ~~In-App Notifications~~ | Done | P2 | MVP | GT-BOOK-001 | M |
| GT-NOTIF-002 | ~~Provider Application Notification~~ | Done | P2 | MVP | GT-PROV-001 | S |
| GT-NOTIF-003 | ~~Booking Status Notifications~~ | Done | P2 | MVP | GT-BOOK-003 | M |
| GT-NOTIF-004 | Email Notifications | Todo | P3 | Nice to Have | GT-NOTIF-001 | M |
| GT-NOTIF-005 | SMS Notifications | Todo | P4 | Post-MVP | GT-NOTIF-003 | L |

Notes:

- Notification persistence, list UI, and mark-read action are implemented.
- Provider applications and booking status changes create in-app notifications.
- SMS remains Post-MVP and paid-ready only.

---

# Epic GT-EPIC-11: Frontend UX and Branding

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-UX-001 | ~~Apply GharTak Branding~~ | Done | P1 | MVP | Client logo/ad assets | M |
| GT-UX-002 | ~~Mobile-First Layout~~ | Done | P1 | MVP | Core screens | M |
| GT-UX-003 | ~~Customer Home Screen~~ | Done | P0 | MVP | GT-CAT-001 | M |
| GT-UX-004 | ~~Provider Join CTA~~ | Done | P0 | MVP | GT-AUTH-002 | S |
| GT-UX-005 | Hindi-Friendly Copy | Partial | P2 | MVP | Brand context | M |
| GT-UX-006 | ~~Logo Asset Integration~~ | Done | P1 | MVP | Image assets | S |
| GT-UX-007 | ~~Public Homepage Navigation~~ | Done | P0 | MVP | GT-UX-001 | M |
| GT-UX-008 | ~~Separate Customer and Provider Auth Views~~ | Done | P0 | MVP | GT-AUTH-001, GT-AUTH-002, GT-AUTH-003 | M |
| GT-UX-009 | ~~Wire Homepage CTAs~~ | Done | P0 | MVP | GT-UX-007, GT-UX-008 | M |
| GT-UX-010 | ~~Customer Booking Stepper UX~~ | Done | P0 | MVP | GT-DISC-001, GT-BOOK-001 | M |
| GT-UX-011 | ~~Homepage Service Preselection Reliability~~ | Done | P0 | MVP | GT-CAT-006, GT-UX-009, GT-UX-010 | M |
| GT-AUTH-007 | ~~Email-Only Login Form~~ | Done | P0 | MVP | GT-AUTH-003 | S |

Notes:

- Public homepage, CTA routing, separate auth views, and the booking stepper are implemented.
- Homepage service intent is persisted through auth and used to preselect the booking category.
- Client logo, brand palette, and responsive dashboard layout pass are implemented.

---

# Epic GT-EPIC-12: Security, Quality, and Operations

| Story ID | Title | Status | Priority | Scope | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| GT-SEC-001 | ~~Password Hashing~~ | Done | P1 | MVP | GT-AUTH-001 | S |
| GT-SEC-002 | ~~Backend Input Validation~~ | Done | P1 | MVP | All APIs | M |
| GT-SEC-003 | ~~CORS Configuration~~ | Done | P1 | MVP | Backend setup | S |
| GT-SEC-004 | File Upload Restrictions | Partial | P2 | MVP | GT-PROV-007 | M |
| GT-QA-001 | ~~Backend API Tests~~ | Done | P1 | MVP | Core APIs | L |
| GT-QA-002 | Frontend Smoke Tests | Todo | P2 | MVP | Core screens | M |
| GT-OPS-001 | ~~Local Development Setup~~ | Done | P1 | MVP | Repo setup | M |
| GT-OPS-002 | ~~Environment Configuration~~ | Done | P1 | MVP | Backend/frontend setup | S |
| GT-ERR-001 | ~~Friendly UI Error Messages~~ | Done | P0 | MVP | Core APIs | M |
| GT-LOG-001 | ~~Structured Backend Error Logs~~ | Done | P0 | MVP | GT-ERR-001 | S |

Notes:

- Backend tests are in place and passing for implemented flows.
- Frontend automated smoke tests are still missing.
- Friendly known-error handling and structured backend error logs are implemented.

---

# Priority-Ordered MVP Backlog

## P0 - Completed

| Story ID | Title |
|---|---|
| GT-CAT-005 | ~~Seed Default Service Categories~~ |
| GT-UX-007 | ~~Public Homepage Navigation~~ |
| GT-UX-008 | ~~Separate Customer and Provider Auth Views~~ |
| GT-UX-009 | ~~Wire Homepage CTAs~~ |
| GT-UX-010 | ~~Customer Booking Stepper UX~~ |
| GT-PROV-013 | ~~Provider Under Review Experience~~ |
| GT-ERR-001 | ~~Friendly UI Error Messages~~ |
| GT-LOG-001 | ~~Structured Backend Error Logs~~ |
| GT-ADM-007 | ~~Admin Login Setup Guidance~~ |
| GT-CAT-006 | ~~Default Category Availability in Customer Booking~~ |
| GT-UX-011 | ~~Homepage Service Preselection Reliability~~ |
| GT-AUTH-007 | ~~Email-Only Login Form~~ |
| GT-ADM-008 | ~~Idempotent Admin Seed Credentials~~ |
| GT-BOOK-010 | ~~Admin-Assigned Booking Requests~~ |
| GT-BOOK-011 | ~~Provider View Assigned Customer Details~~ |
| GT-CAT-007 | ~~Service Price Tags~~ |
| GT-DISC-003 | ~~View Provider Profile~~ |
| GT-REV-001 | ~~Submit Review~~ |
| GT-REV-002 | ~~Prevent Duplicate Reviews~~ |
| GT-REV-003 | ~~Provider Average Rating~~ |
| GT-REV-005 | ~~Display Provider Reviews~~ |
| GT-PAY-003 | ~~Mark Cash Paid~~ |
| GT-UX-001 | ~~Apply GharTak Branding~~ |
| GT-UX-002 | ~~Mobile-First Layout~~ |
| GT-UX-006 | ~~Logo Asset Integration~~ |
| GT-PROV-002 | ~~Provider Pending Screen~~ |
| GT-UX-003 | ~~Customer Home Screen~~ |
| GT-UX-004 | ~~Provider Join CTA~~ |
| GT-PROV-011 | ~~View Completed Jobs~~ |

## P0 - Do Next

No active P0 items after the latest implementation pass.

## P1 - Required For MVP

No active P1 items after the latest MVP implementation pass.

## P2 - Completed MVP Hardening

| Story ID | Title |
|---|---|
| GT-DISC-004 | ~~Show Provider Rating~~ |
| GT-BOOK-008 | ~~Admin Update Booking Status~~ |
| GT-REV-004 | ~~Admin Hide Review~~ |
| GT-ADM-001 | ~~Admin Dashboard Summary~~ |
| GT-ADM-002 | ~~View All Customers~~ |
| GT-ADM-004 | ~~View All Bookings~~ |
| GT-NOTIF-001 | ~~In-App Notifications~~ |
| GT-NOTIF-002 | ~~Provider Application Notification~~ |
| GT-NOTIF-003 | ~~Booking Status Notifications~~ |

## P2 - MVP Hardening

| Story ID | Title |
|---|---|
| GT-DISC-005 | Provider Availability Badge |
| GT-BOOK-007 | Customer Cancel Booking |
| GT-ADM-006 | Disable User Account |
| GT-UX-005 | Hindi-Friendly Copy |
| GT-QA-002 | Frontend Smoke Tests |

## P3 - Nice To Have

| Story ID | Title |
|---|---|
| GT-PROV-012 | Basic Earnings Summary |
| GT-PAY-004 | Payment Dispute Status |
| GT-ADM-005 | Add Admin Notes |
| GT-NOTIF-004 | Email Notifications |

## P4 - Post-MVP

| Story ID | Title |
|---|---|
| GT-NOTIF-005 | SMS Notifications |
| Future | Online Payments |
| Future | Real-Time Chat |
| Future | Native Mobile Apps |
| Future | Advanced Analytics |
| Future | Multi-City Support |
| Future | Provider Wallet |
| Future | Referral/Loyalty Programs |

---

# Completed Stories Summary

Completed or mostly backend-complete stories:

- GT-AUTH-001 through GT-AUTH-006.
- GT-CAT-001 through GT-CAT-004.
- GT-PROV-001, GT-PROV-003, GT-PROV-004, GT-PROV-005, GT-PROV-006, GT-PROV-008, GT-PROV-009, GT-PROV-010.
- GT-DISC-001, GT-DISC-002.
- GT-BOOK-001 through GT-BOOK-006.
- GT-BOOK-009 foundation.
- GT-PAY-001, GT-PAY-002.
- GT-ADM-003.
- GT-SEC-001, GT-SEC-002, GT-SEC-003, GT-QA-001, GT-OPS-001, GT-OPS-002.

Important caveat:

Some completed backend stories still need UX hardening. The user experience is not considered MVP-ready until the P1 MVP backlog items above are complete.

## Approval Status

Original Phase 4 was approved by product owner. This revision updates the backlog based on implementation progress and UI observations through 2026-06-18.
