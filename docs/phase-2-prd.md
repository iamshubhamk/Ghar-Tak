# Phase 2 - Product Requirements Document (PRD)

Product: GharTak  
Initial market: Patna, Bihar  
MVP goal: launch a web-first marketplace for first 100 users.  
Budget: INR 0 during MVP.

## 1. Product Scope

GharTak is a hyperlocal service marketplace that helps customers in Patna discover, book, and review verified local service providers.

MVP service categories:

- Electrician
- Plumber
- Carpenter
- AC Repair
- Appliance Repair
- House Cleaning

Primary roles:

- Customer
- Service Provider
- Admin

### MVP Scope

| Capability | Classification |
|---|---|
| Customer registration/login | MVP |
| Provider registration | MVP |
| Admin provider verification | MVP |
| Service category browsing | MVP |
| Provider search/listing | MVP |
| Provider profile | MVP |
| Booking creation | MVP |
| Booking status tracking | MVP |
| Provider accept/reject booking | MVP |
| Cash on Service | MVP |
| Ratings and reviews | MVP |
| Admin dashboard | MVP |
| Basic in-app notifications | MVP |
| Online payments | Post-MVP |
| Real-time chat | Post-MVP |
| Native mobile apps | Post-MVP |
| Advanced analytics | Post-MVP |
| Multi-city support | Post-MVP |

## 2. Features

### 2.1 Customer Features

| Feature | Classification |
|---|---|
| Sign up/login | MVP |
| Browse categories | MVP |
| Search service | MVP |
| View provider list | MVP |
| View provider profile | MVP |
| Create booking | MVP |
| Track booking | MVP |
| Cancel eligible booking | MVP |
| Mark service completed/confirm completion | MVP |
| Rate and review | MVP |
| Booking history | MVP |
| Save address | Nice to Have |
| Favorite provider | Nice to Have |
| Online payment | Post-MVP |
| Real-time chat | Post-MVP |

### 2.2 Provider Features

| Feature | Classification |
|---|---|
| Provider registration | MVP |
| Profile management | MVP |
| Availability status | MVP |
| Booking requests | MVP |
| Accept/reject booking | MVP |
| Update booking status | MVP |
| Upload verification docs | MVP, minimal |
| Basic earnings summary | Nice to Have |
| Calendar scheduling | Post-MVP |
| Provider subscription | Post-MVP |
| Provider wallet | Post-MVP |

### 2.3 Admin Features

| Feature | Classification |
|---|---|
| Admin login | MVP |
| Manage categories | MVP |
| Verify providers | MVP |
| Manage bookings | MVP |
| View users/providers | MVP |
| Moderate reviews | MVP |
| Basic dashboard | MVP |
| Dispute notes | Nice to Have |
| Advanced analytics | Post-MVP |
| Multi-admin roles | Post-MVP |

## 3. Functional Requirements

### 3.1 Authentication

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-001 | Users can register as customer or provider | MVP |
| FR-AUTH-002 | Users can log in using email/phone and password | MVP |
| FR-AUTH-003 | System issues JWT after login | MVP |
| FR-AUTH-004 | Role-specific APIs and screens are restricted | MVP |
| FR-AUTH-005 | Admin accounts are not publicly self-registerable | MVP |
| FR-AUTH-006 | Passwords are securely hashed | MVP |

### 3.2 Customer

| ID | Requirement | Priority |
|---|---|---|
| FR-CUST-001 | Customer can browse active categories | MVP |
| FR-CUST-002 | Customer can search by category/locality | MVP |
| FR-CUST-003 | Customer sees verified providers only | MVP |
| FR-CUST-004 | Customer can view provider profile and rating | MVP |
| FR-CUST-005 | Customer can create booking request | MVP |
| FR-CUST-006 | Customer can track booking status | MVP |
| FR-CUST-007 | Customer can cancel eligible bookings | MVP |
| FR-CUST-008 | Customer can review completed booking once | MVP |
| FR-CUST-009 | Customer can view booking history | MVP |

### 3.3 Provider

| ID | Requirement | Priority |
|---|---|---|
| FR-PROV-001 | Provider can submit registration application | MVP |
| FR-PROV-002 | Provider remains inactive until admin verification | MVP |
| FR-PROV-003 | Provider can update profile after approval | MVP |
| FR-PROV-004 | Provider can manage availability | MVP |
| FR-PROV-005 | Provider can view booking requests | MVP |
| FR-PROV-006 | Provider can accept/reject bookings | MVP |
| FR-PROV-007 | Provider can update booking status | MVP |

### 3.4 Booking

| ID | Requirement | Priority |
|---|---|---|
| FR-BOOK-001 | Customer creates booking with category, address, time, notes | MVP |
| FR-BOOK-002 | Booking starts in REQUESTED state | MVP |
| FR-BOOK-003 | Provider can accept booking | MVP |
| FR-BOOK-004 | Provider can reject booking | MVP |
| FR-BOOK-005 | Provider can mark booking IN_PROGRESS | MVP |
| FR-BOOK-006 | Provider/admin can mark booking COMPLETED | MVP |
| FR-BOOK-007 | Eligible bookings can be cancelled | MVP |
| FR-BOOK-008 | Payment mode defaults to CASH_ON_SERVICE | MVP |
| FR-BOOK-009 | Booking status history is stored | Nice to Have |

### 3.5 Payment

| ID | Requirement | Priority |
|---|---|---|
| FR-PAY-001 | MVP supports Cash on Service only | MVP |
| FR-PAY-002 | Booking stores estimated price/range note | MVP |
| FR-PAY-003 | Booking can store final service amount | Nice to Have |
| FR-PAY-004 | Online payment integration | Post-MVP |

### 3.6 Reviews

| ID | Requirement | Priority |
|---|---|---|
| FR-REV-001 | Customer can review completed bookings only | MVP |
| FR-REV-002 | Customer can submit one review per booking | MVP |
| FR-REV-003 | Rating must be 1 to 5 | MVP |
| FR-REV-004 | Provider average rating updates after review | MVP |
| FR-REV-005 | Admin can hide inappropriate reviews | MVP |

## 4. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-001 | Performance | Core pages load under 3 seconds on average mobile internet |
| NFR-002 | Scalability | Support first 100 users and 25-50 providers |
| NFR-003 | Security | JWT auth, password hashing, role-based access |
| NFR-004 | Privacy | Collect minimum data required for booking |
| NFR-005 | Maintainability | Modular monolith with clear domain boundaries |
| NFR-006 | Cost | Infrastructure cost stays at INR 0 during MVP |
| NFR-007 | Usability | Mobile-first responsive web UI |
| NFR-008 | Observability | Basic logs for auth, booking, verification |
| NFR-009 | Accessibility | Semantic forms, readable contrast, keyboard support |

## 5. User Personas

### Working Professional Customer

Name: Riya  
Location: Boring Road  
Needs: quick repair help, trusted provider, minimal calls, clear booking status.

### Family Decision Maker

Name: Amit  
Location: Kankarbagh  
Needs: reliable home repair, repeat providers, ratings, cash payment.

### Local Electrician

Name: Sanjay  
Location: Rajendra Nagar  
Needs: more local work, simple booking visibility, digital reputation.

### Founder/Admin

Needs: verify providers, manage categories, monitor bookings, resolve issues manually.

## 6. User Journeys

### Customer Booking Journey

1. Customer opens GharTak.
2. Customer signs up or logs in.
3. Customer selects service category.
4. Customer filters by locality.
5. Customer views provider list and profile.
6. Customer creates booking.
7. Provider accepts booking.
8. Provider performs service.
9. Booking is completed.
10. Customer pays cash.
11. Customer leaves rating and review.

### Provider Journey

1. Provider registers.
2. Admin verifies provider.
3. Provider logs in.
4. Provider updates profile and availability.
5. Provider accepts/rejects booking request.
6. Provider completes service.

### Admin Journey

1. Admin logs in.
2. Admin reviews provider applications.
3. Admin approves/rejects providers.
4. Admin monitors bookings.
5. Admin moderates reviews and disables problematic users/providers.

## 7. MVP Definition

The MVP is successful when it supports:

- 100 registered customers.
- 25-50 verified providers.
- 5-7 service categories.
- 50 completed bookings.
- Cash-based transactions.
- Admin-managed provider verification.
- Basic ratings and reviews.

## 8. Future Enhancements

| Feature | Classification |
|---|---|
| Online payments | Post-MVP |
| Real-time chat | Post-MVP |
| Native Android/iOS app | Post-MVP |
| Provider calendar | Post-MVP |
| Automated matching | Post-MVP |
| Referral system | Post-MVP |
| Loyalty program | Post-MVP |
| Advanced analytics | Post-MVP |
| Multi-city support | Post-MVP |
| SMS alerts | Post-MVP |

## 9. Acceptance Criteria

The MVP is acceptable when:

- Customer can register, log in, browse categories, view providers, create bookings, track status, and review completed services.
- Provider can register, get verified, manage profile, accept/reject bookings, and update booking status.
- Admin can verify providers, manage categories, view bookings, update statuses, and moderate reviews.
- Only verified providers are visible to customers.
- Booking lifecycle works end to end using Cash on Service.
- Application is responsive on mobile and desktop.
- Platform can run locally with PostgreSQL.
- No paid service is required for MVP operation.

## 10. Approval Status

Approved by product owner. Proceeded to Phase 3 FSD.
