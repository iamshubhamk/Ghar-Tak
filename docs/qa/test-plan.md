# GharTak — Test Plan

> Owner: **support** workstream. Change: `SU-001` (for `OR-005`). Last updated: 2026-10-29 (policies finalised, AR-010).
> Source of truth for expected behaviour: `docs/phase-3-fsd.md` §5 (booking state machine), extended by
> later phase-7 docs (ON_THE_WAY, start OTP, admin assignment) and the policies the human approved on
> 2026-10-29 (AR-010, `docs/plans/roadmap-tickets.md` P-1…P-4). Cells still marked **❓** have a default
> shown and are listed in §6 for the Architect to confirm.
>
> **Policies in force**
> - **P-1** a provider who is rejected / disabled / resubmitted (no longer VERIFIED) cannot act on any booking
>   (403); their REQUESTED / ACCEPTED / ON_THE_WAY bookings go back to the admin queue as unassigned
>   REQUESTED, customer + admin notified; IN_PROGRESS stays put for the admin.
> - **P-2** every booking has a ₹99 visit charge set by the server (never the client); the provider enters an
>   extra amount ≥ 0 at completion; total = ₹99 + extra.
> - **P-3** no CANCELLED_BY_PROVIDER. A provider "releases" an ACCEPTED / ON_THE_WAY job → unassigned REQUESTED
>   with a reason, admin notified.
> - **P-4** customer may cancel until the job starts (REQUESTED / ACCEPTED / ON_THE_WAY); provider notified.
> - **Admin** is bound by the transition table: only CANCELLED_BY_ADMIN (from REQUESTED / ACCEPTED /
>   ON_THE_WAY / IN_PROGRESS) and COMPLETED (from IN_PROGRESS).

Derived from code at `setup/workspace` (incl. uncommitted lat/long change):
`backend/app/services/bookings.py`, `backend/app/api/v1/bookings.py`, `backend/app/api/deps.py`,
`backend/app/services/auth.py`, `backend/app/services/providers.py`, `backend/app/api/v1/providers.py`.

Legend: ✅ allow · ⛔ deny (HTTP code) · 🐞 current code differs from expected — bug reported (SU-NNN).

---

## 0. How these tests will run

- **Level:** API tests (pytest + httpx `AsyncClient` against the FastAPI app, real MongoDB test DB or
  `mongomock-motor`). Blocked on **OR-001** (backend fixtures still target SQLAlchemy).
- **Fixture set (one per test module):** 1 admin; customer `C1` (owner) and `C2` (other);
  provider `P1` (VERIFIED, public, serves category `Plumbing`), `P2` (VERIFIED, other),
  `P3` (PENDING_VERIFICATION), `P4` (REJECTED), `P5` (DISABLED → `is_active=false`); active category
  `Plumbing`, inactive category `Old`.
- **Helper:** `make_booking(status, provider=P1)` inserts a booking directly in the given status so every
  matrix cell is one short test (parametrised over the tables below).
- Every allowed transition test also asserts: `status_history` gains exactly one entry with correct
  `from_status` / `to_status` / `actor_user_id`; notifications created for customer, assigned provider,
  admins; response `status` equals the DB value (Rule 8).
- Every denied test also asserts: status and `status_history` unchanged; error body has the expected
  `AppErrorCode`.

---

## 1. Booking lifecycle

### 1.1 Statuses

`REQUESTED` (unassigned: `provider_id=null`) · `REQUESTED` (assigned) · `ACCEPTED` · `ON_THE_WAY` ·
`IN_PROGRESS` · `COMPLETED` · `REJECTED` · `CANCELLED_BY_CUSTOMER` · `CANCELLED_BY_PROVIDER` (legacy, no longer reachable — P-3) ·
`CANCELLED_BY_ADMIN`.

Terminal: `COMPLETED`, all `CANCELLED_*`. `REJECTED` is terminal for the provider but admin can
re-assign (→ `REQUESTED`).

### 1.2 Role gate (router level, independent of status)

Every booking endpoint is wrapped in `require_roles(...)`. Run each against every actor:

| Endpoint | Allowed role | Anonymous | Wrong role | Disabled user |
|---|---|---|---|---|
| `POST /bookings` | CUSTOMER | ⛔ 401 `AUTH_REQUIRED` | ⛔ 403 | ⛔ 403 `ACCOUNT_DISABLED` |
| `GET /bookings/my` | CUSTOMER | ⛔ 401 | ⛔ 403 | ⛔ 403 |
| `PATCH /bookings/{id}/cancel` | CUSTOMER | ⛔ 401 | ⛔ 403 | ⛔ 403 |
| `GET /provider/bookings` | PROVIDER | ⛔ 401 | ⛔ 403 | ⛔ 403 |
| `PATCH /provider/bookings/{id}/{accept,reject,on_the_way,start,in_progress,complete,mark-cash-paid}` | PROVIDER | ⛔ 401 | ⛔ 403 | ⛔ 403 |
| `GET /admin/bookings` | ADMIN | ⛔ 401 | ⛔ 403 | ⛔ 403 |
| `PATCH /admin/bookings/{id}/{assign,status,mark-cash-paid}` | ADMIN | ⛔ 401 | ⛔ 403 | ⛔ 403 |
| `POST /bookings/{id}/review` | CUSTOMER | ⛔ 401 | ⛔ 403 | ⛔ 403 |

Also: expired JWT → 401; JWT signed with another key → 401; JWT for a deleted user → 401;
JWT whose `role` claim is ADMIN but DB user is CUSTOMER → 403 (role is read from DB, not the token).

### 1.3 Ownership gate (inside the service)

| Actor | Rule | Expected |
|---|---|---|
| Customer `C2` on `C1`'s booking (cancel, review) | `customer_id` must match | ⛔ 403 `FORBIDDEN` |
| Provider `P2` on `P1`'s booking (any provider action, mark-cash-paid) | `provider_id` must match | ⛔ 403 |
| Any provider on an **unassigned** booking | `provider_id` is null | ⛔ 403 |
| Any actor on a non-existent booking id | — | ⛔ 404 `NOT_FOUND` (checked before ownership) |
| `P3` PENDING / `P4` REJECTED provider on a booking still assigned to them | must be VERIFIED (P-1) | ⛔ 403 expected · ✅ today 🐞 **SU-005 → T1-06** |
| Provider becomes non-VERIFIED (reject / disable / resubmit) while holding bookings | P-1 | REQUESTED / ACCEPTED / ON_THE_WAY → unassigned REQUESTED, history entry, customer + admin notified; IN_PROGRESS unchanged |
| `P5` DISABLED provider | `is_active=false` | ⛔ 403 `ACCOUNT_DISABLED` (deps) |

### 1.4 Status × action matrix (owner / assigned actor)

Columns are actions; rows are the booking's current status. Cell = expected result → new status.
Customer = owning customer, Provider = assigned verified provider, Admin = any admin.

| Current status ↓ / action → | Cust **cancel** | Prov **accept** | Prov **reject** | Prov **on_the_way** | Prov **start / in_progress** (OTP) | Prov **complete** | Prov **release** (P-3) | Admin **assign** | Prov / Admin **mark-cash-paid** | Cust **review** |
|---|---|---|---|---|---|---|---|---|---|---|
| REQUESTED (unassigned) | ✅ → CANCELLED_BY_CUSTOMER | ⛔ 403 (not assigned) | ⛔ 403 | ⛔ 403 | ⛔ 403 | ⛔ 403 | ⛔ 403 | ✅ → REQUESTED (+provider) | ⛔ 422 | ⛔ 422 |
| REQUESTED (assigned) | ✅ → CANCELLED_BY_CUSTOMER | ✅ → ACCEPTED | ✅ → REJECTED | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 (use reject) | ✅ re-assign → REQUESTED; old provider notified | ⛔ 422 | ⛔ 422 |
| ACCEPTED | ✅ → CANCELLED_BY_CUSTOMER | ⛔ 422 | ⛔ 422 | ✅ → ON_THE_WAY | ✅ → IN_PROGRESS (skipping ON_THE_WAY allowed) | ⛔ 422 | ✅ → unassigned REQUESTED, reason required, admin notified | ⛔ 422 | ⛔ 422 | ⛔ 422 |
| ON_THE_WAY | ✅ → CANCELLED_BY_CUSTOMER, provider notified (P-4) | ⛔ 422 | ⛔ 422 | ⛔ 422 | ✅ → IN_PROGRESS | ⛔ 422 | ✅ → unassigned REQUESTED, reason required, admin notified | ⛔ 422 | ⛔ 422 | ⛔ 422 |
| IN_PROGRESS | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ✅ → COMPLETED (provider enters extra ≥ 0, P-2) | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 |
| COMPLETED | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ✅ payment → PAID_CASH (status stays) · second call ⛔ 422 expected, ✅ today 🐞 SU-009 → T1-09 | ✅ once; 2nd ⛔ 409/422 |
| REJECTED | ⛔ 422 ❓ default | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ✅ → REQUESTED (new provider) | ⛔ 422 | ⛔ 422 |
| CANCELLED_BY_CUSTOMER | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 |
| CANCELLED_BY_PROVIDER (legacy) | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 |
| CANCELLED_BY_ADMIN | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 | ⛔ 422 |

422 = `BOOKING_INVALID_STATUS`. That is 10 statuses × 10 actions = 100 parametrised cases, plus the
ownership/role cases above.

### 1.5 Admin status override (`PATCH /admin/bookings/{id}/status`)

Expected (FSD §5 + AR-010): admin may only set `CANCELLED_BY_ADMIN` from REQUESTED / ACCEPTED / ON_THE_WAY /
IN_PROGRESS, and `COMPLETED` from IN_PROGRESS. Everything else ⛔ 422.

**Today the service applies any target status from any current status** (`bookings.py:307-327`,
no check) 🐞 **SU-003 ✅ fixed in BE-007**. Test grid: every current status × every target status (10 × 9 = 90 cases);
expected allow only in these cells:

| From \ To | COMPLETED | CANCELLED_BY_ADMIN |
|---|---|---|
| REQUESTED | ⛔ | ✅ |
| ACCEPTED | ⛔ | ✅ |
| ON_THE_WAY | ⛔ | ✅ |
| IN_PROGRESS | ✅ | ✅ |

All other pairs, including same-status and anything out of a terminal status, ⛔ 422.

### 1.6 Start OTP

| Case | Expected |
|---|---|
| Correct 4-digit OTP from ACCEPTED / ON_THE_WAY | ✅ → IN_PROGRESS |
| OTP with surrounding spaces | ✅ (stripped) |
| Missing / empty OTP | ⛔ 400 `VALIDATION_ERROR` |
| Wrong OTP | ⛔ 400, status unchanged |
| Wrong OTP on a booking in the wrong status | ⛔ 422 (status checked first) |
| 10 wrong attempts in a row | ⛔ locked / rate-limited expected · unlimited today 🐞 SU-009 |
| OTP visibility in responses | owner customer ✅ and admin ✅ see `otp`; provider (any endpoint, any status) always `null`; other customers never see the booking |
| OTP generated per booking, 4 digits, 1000–9999 | ✅ |

### 1.7 Booking creation (`POST /bookings`)

| Case | Expected |
|---|---|
| Valid, no provider | ✅ 201, REQUESTED, `provider_id=null`, admins notified |
| Valid, with verified public provider serving the category | ✅ 201, provider notified |
| `preferred_datetime` in the past | ⛔ 422 |
| `preferred_datetime` = now + 1h sent as `+05:30` | ✅ ; now − 1h sent as `+05:30` ⛔ 422 · today ✅ (offset discarded) 🐞 SU-009 |
| Inactive / unknown category | ⛔ 404 `CATEGORY_INACTIVE` |
| Provider PENDING / REJECTED / DISABLED / not public | ⛔ 404 `PROVIDER_NOT_VERIFIED` |
| Provider does not serve the category | ⛔ 422 |
| Provider UNAVAILABLE | ✅ allowed ❓ default (assignment is the admin's call; availability is advisory) |
| Client sends `total_amount` / `subtotal` / `platform_fee` / `discount` / item prices | ignored: stored total = ₹99 visit charge from settings (P-2); negative item price or quantity < 1 ⛔ 422 · today trusted 🐞 **SU-004 → T1-08** |
| Complete with extra amount < 0 | ⛔ 422; extra ≥ 0 → `final_amount` = ₹99 + extra |
| `locality` < 2 chars, `issue_description` > 1200 | ⛔ 422 |
| `latitude` / `longitude` outside ±90 / ±180 | ⛔ 422 expected (no bounds today) |
| Hindi text in address / description | ✅ stored and returned unchanged (UTF-8) |
| Created booking: `payment_mode=CASH_ON_SERVICE`, `payment_status=CASH_PENDING`, `status_history` has one entry `null→REQUESTED` | ✅ |

### 1.8 Concurrency

| Case | Expected |
|---|---|
| Customer cancel and provider accept on the same REQUESTED booking at the same time | exactly one succeeds, the loser gets ⛔ 409 `BOOKING_STATE_CHANGED`, nothing written · ✅ delivered (BE-008); automated with a stale-read simulation, true parallel run on real MongoDB still to do |
| Two `complete` calls in parallel | one ✅, one ⛔ |
| Admin assign while provider rejects | one ✅, one ⛔ |

Run with `asyncio.gather` on two clients against a real MongoDB (not mongomock).

### 1.9 Listing

| Case | Expected |
|---|---|
| `GET /bookings/my` | only `C1`'s bookings, newest first |
| `GET /provider/bookings` | only bookings with `provider_id=P1`, incl. REJECTED ones |
| `GET /admin/bookings?status=&category_id=&provider_id=` | filters combine (AND) |
| Customer phone/email in provider listing | visible to assigned provider (needed for the visit) — note it feeds SU-002 |

---

## 2. Auth

### 2.1 Registration

| Case | Expected |
|---|---|
| Customer with email only / phone only / both | ✅ 201 + token |
| Neither email nor phone | ⛔ 422 |
| Password < 8 chars | ⛔ 422 |
| Duplicate email (case-insensitive) or phone | ⛔ 409 `DUPLICATE_ACCOUNT` |
| Same phone written as `+91XXXXXXXXXX` vs `XXXXXXXXXX` | ⛔ 409 expected ❓ default · today different accounts (no normalisation) |
| Provider JSON registration | ✅ VERIFICATION `PENDING`, `is_public=false`, UNAVAILABLE, admins notified |
| Provider multipart without Aadhaar | ⛔ 400 |
| Provider multipart Aadhaar `.exe` / `.html` | ⛔ 400 |
| Provider with inactive / unknown `category_ids` | ✅, unknown ids silently dropped |
| Registration body with `role: "ADMIN"` | role ignored, account is CUSTOMER/PROVIDER |
| Hindi name | ✅ stored as-is |

### 2.2 Login & tokens

| Case | Expected |
|---|---|
| Correct email + password; correct phone + password | ✅ token, `role` from DB |
| Wrong password; unknown user | ⛔ 401 `INVALID_CREDENTIALS`, same message (no user enumeration) |
| Disabled user, correct password | ⛔ 403 `ACCOUNT_DISABLED` |
| Token after user is disabled | ⛔ 403 on next request |
| Token expiry = `JWT_ACCESS_TOKEN_MINUTES` | ⛔ 401 after expiry |
| Many failed logins | ⛔ 429 expected · no rate limit today (SU-009) |
| App boots with default `jwt_secret_key` when `ENVIRONMENT=production` | refuse to start expected · today starts (SU-009) |
| `GET /auth/me` never returns `password_hash` | ✅ |

### 2.3 Password reset

| Case | Expected |
|---|---|
| Reset requires proof of control of the email/phone (OTP or emailed token) | expected · **today email + phone alone reset any account and return a token** 🐞 **SU-002 (S1)** |
| `/password-reset/verify` with unknown email/phone | should not reveal whether an account exists · today 404 vs 200 (enumeration) |
| New password length | must match registration (≥ 8) · today ≥ 6 |
| Old tokens after reset | revoked ❓ default (ADR 0003 refresh-token design; today valid until expiry) |
| Disabled account | ⛔ 403 |

---

## 3. Provider verification

### 3.1 Verification state machine

```
register → PENDING_VERIFICATION ──approve──▶ VERIFIED (is_public, is_active)
                │                  └─reject──▶ REJECTED ──resubmit──▶ PENDING_VERIFICATION
                └──────────────── disable (any state) ──▶ DISABLED (is_active=false, not public)
VERIFIED ──resubmit──▶ PENDING_VERIFICATION (not public)
```

| Current \ action | admin approve | admin reject | admin disable | provider resubmit |
|---|---|---|---|---|
| PENDING_VERIFICATION | ✅ → VERIFIED, public | ✅ → REJECTED (+reason) | ✅ → DISABLED | ✅ stays PENDING |
| VERIFIED | ✅ no-op | ✅ → REJECTED; open bookings released per P-1 | ✅ → DISABLED; open bookings released per P-1 | ✅ → PENDING, hidden; open bookings released per P-1 |
| REJECTED | ✅ → VERIFIED | ✅ no-op | ✅ → DISABLED | ✅ → PENDING |
| DISABLED | ✅ → VERIFIED, re-activated (admin's explicit decision) | ✅ → REJECTED but still `is_active=false` | ✅ no-op | ⛔ 403 (account disabled) |

Each action: provider notified; non-admin caller ⛔ 403; unknown id ⛔ 404.

### 3.2 Visibility rules

| Case | Expected |
|---|---|
| `GET /providers` / `GET /providers/{id}` | only VERIFIED + `is_public` + `is_active`; others 404 |
| Public provider response | no bank details, no Aadhaar URL; `phone` is public today ❓ default: hide until a booking is assigned (feeds SU-002 social engineering) |
| `GET /providers/{id}/adhaar` & `/bank-proof` | admin ✅; owner ✅; other provider ⛔ 403; customer ⛔ 403; anonymous ⛔ 401 |
| Files in `uploads/private` reachable through `/uploads/...` | ⛔ 404 always |
| Profile photo / customer photo upload with `.html` / `.svg` filename and `image/png` content-type | ⛔ 400 expected · today stored and served from `/uploads` 🐞 **SU-008** |
| Skill-request proof viewable by admin at returned `proof_url` | ✅ expected · today 404 (saved outside `public/`) 🐞 SU-008 |

### 3.3 Categories / skills

| Case | Expected |
|---|---|
| Provider adds a category via skill request → admin approves | category added, provider stays VERIFIED |
| Duplicate pending skill request (case-insensitive) | ⛔ 400 |
| Skill request for a category already held | ⛔ 400 |
| Provider changes `category_ids` through `PATCH /provider/me` | ⛔ (must go through skill request) · today applied directly 🐞 **SU-006** |
| Resubmit with category names that don't exist | ⛔ 422 · today stored as-is 🐞 SU-006 |
| `?locality=.*` or `?locality=(a+)+$` | treated as literal text · today regex 🐞 SU-009 |
| Booking with a provider for a category added via the bypass | ⛔ (after SU-006 fix) |

---

## 4. Low-end device / network checks (manual, web + mobile)

Run on a ₹8–10k Android (2–3 GB RAM) or Chrome DevTools "Low-end mobile" + "Slow 3G", 360×640 viewport.

| Check | Pass criterion |
|---|---|
| Book a service end-to-end on Slow 3G | completes; every button shows a pending state; no double booking on double tap |
| Kill network after tapping "Book" | clear error in the current language; retry does not create a duplicate booking (needs an idempotency key — backend ❓ not yet ticketed) |
| Provider accept / start with OTP on patchy network | UI shows the status the server returned (Rule 8), never an optimistic one |
| Language switch to Hindi | every string translated, no clipped text at 360 px, numerals and dates readable |
| Cold start time (mobile) | < 5 s on the reference device |
| Image uploads (Aadhaar, photo) on 3G | progress shown; ≤ 2 MB client-side compression; failure is recoverable |
| Session expiry mid-flow | user lands on login and returns to the same screen after re-login |

---

## 5. Not yet covered (next iterations)

- Notifications service (read/unread, per-user isolation).
- Reviews: rating recalculation, admin hide/unhide.
- Admin dashboard counts: `open_statuses` (`services/admin.py:25`) omits ON_THE_WAY, so those bookings
  are not counted as open (listed in SU-009).
- Error tracking + uptime tooling proposal (OR-005 second half) — separate change.

---

## 6. Open questions for the Architect (defaults used in the tests)

| # | Question | Default in this plan |
|---|---|---|
| Q1 | Customer cancel of a REJECTED booking (waiting for re-assign) | ⛔ 422 — customer must wait for admin (or ask admin to cancel); admin cancel from REJECTED also ⛔ until decided |
| Q2 | Booking a provider whose availability is UNAVAILABLE | ✅ allowed |
| Q3 | Phone number normalisation (`+91` / `0` prefix) at registration | normalise to 10 digits, duplicates 409 |
| Q4 | Existing JWTs after a password reset | revoked (via ADR 0003 sessions) |
| Q5 | Public provider `phone` | hidden until assigned |
| Q6 | Booking idempotency key for retries on patchy networks | not ticketed — needed before the app ships (Phase 4) |
| Q7 | Endpoint name and body for P-3 "release job" | assumed `PATCH /provider/bookings/{id}/release` with `{"note": "<reason>"}`; tests will follow whatever backend ships |

---

## 7. Automation status (T1-16)

Run: `cd backend && python -m pytest tests/test_lifecycle_*.py`. Files: `tests/test_lifecycle_matrix.py`
(§1.2-1.5), `tests/test_lifecycle_policies.py` (§1.3, 1.6-1.8, 3.3), `tests/test_lifecycle_auth.py` (§2.1-2.2),
shared setup in `tests/lifecycle_support.py`. Cases that describe undelivered behaviour are
`xfail(strict=True)` and name their ticket; remove the mark when the ticket lands.

| Ticket | Cases waiting (xfail) |
|---|---|
| T1-06 | non-VERIFIED provider gets 403 (12); reject / disable / resubmit sends open jobs back to the queue (7) |
| T1-07 | profile PATCH cannot add categories; resubmit drops unknown names (2) |
| T1-08 | server-set ₹99 total; negative price; quantity < 1 (3) |
| T1-09 | customer cancel on ON_THE_WAY (1); provider release (10); OTP lock; IST past time; cash-paid idempotent; regex escape; ON_THE_WAY open count; reassign notifies old provider (6) |
| SU-011 | missing email/phone returns 422 instead of 500 (2) |
| delivered | T1-04 admin grid (81) and T1-05 stale-write (2) run as normal tests |
Not automated yet: reviews, notifications, provider documents, skill requests, §4 manual device checks.
