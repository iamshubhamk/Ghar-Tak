# API changes

Human-readable log of every change to `openapi.json`. Backend appends a section per change, using the
change ID as the heading so inbox entries can link to it (`contracts/API_CHANGES.md#be-014`).

Template:

```
## BE-NNN — <title>
Date: YYYY-MM-DD | Breaking: yes/no
Added: METHOD /path — purpose
Changed: METHOD /path — field changes (old → new)
Deprecated: METHOD /path — replacement, removal not before YYYY-MM-DD
Migration path: (required if breaking — Rule 7)
Clients affected: mobile / web
```

---

## Baseline
Date: 2026-10-27 | Breaking: no
Initial export from the `dev` branch working copy: OpenAPI 3.1, 60 paths, 50 schemas, all under
`/api/v1`. The working copy includes an uncommitted change adding `latitude`/`longitude` to
`BookingCreateRequest` and `BookingResponse`.
Known quirks clients should be aware of:
- Error bodies are inconsistent: validation errors come back as `{"detail": {"error": {code, message, details}}}`,
  other HTTP errors as `{"detail": ...}`.
- `PATCH /provider/bookings/{id}/start` and `/in_progress` do the same thing (both need the customer's OTP).
- No refresh-token endpoint; access tokens last 60 minutes.

## AR-002
Date: 2026-10-28 | Breaking: no (behaviour change)
Changed: `POST /api/v1/auth/password-reset/verify` and `POST /api/v1/auth/password-reset` — now return
**403** with `{"detail": {"error": {"code": "PASSWORD_RESET_DISABLED", "message": "Password reset is not
available in the app yet. Please contact GharTak support.", "details": {}}}}` for any input, unless the
server setting `PASSWORD_RESET_SELF_SERVICE_ENABLED=true` (default false; local dev only). The check runs
before any database lookup, so known and unknown accounts get the same response (also closes the
account-existence leak on `/verify`). Request/response schemas are unchanged; `403` is added to both routes.
Why: the reset had no OTP, so anyone could take over any account (SU-002, ADR 0003 §8 interim fix). An
OTP-based reset comes later.
Clients affected: web (forgot-password flow must show the support message from the 403), mobile (do not
build a reset screen yet).

## AR-005
Date: 2026-10-29 | Breaking: no for mobile; one behaviour change for web (skill-proof links)
Added: `GET /api/v1/skill-requests/{request_id}/proof` — returns the proof file. Needs a login token:
ADMIN or the provider who owns the request (403 for anyone else, 401 when not logged in). Fetch it with the
Authorization header and show it as a blob, like Aadhaar and bank proofs.
Changed: `SkillRequestResponse.proof_url` — now `/api/v1/skill-requests/{id}/proof` (needs auth) instead of
`/uploads/skill_proof_...` (public, and 404 for admins). Same field, same type. Old requests keep their old
`proof_url`; the new route still serves them.
Changed (all upload routes: `POST /customer/me/photo`, `POST /provider/me/documents`,
`POST /provider/me/resubmit`, `POST /provider/me/skill-requests`, multipart `POST /auth/register/provider`):
the real file type is read from the file's first bytes (content type and filename are ignored).
- photos: jpg, png, webp, max 5 MB. Documents (Aadhaar, bank proof, skill proof): jpg, png, webp, pdf, max 10 MB.
- Wrong type: **415** `UPLOAD_TYPE_NOT_ALLOWED`. Too big: **413** `UPLOAD_TOO_LARGE`. Standard body
  `{"detail": {"error": {"code", "message", "details"}}}`. These replace the old 400 messages (400 with a
  plain string, or 400 `VALIDATION_ERROR` on registration).
- Stored names are server-chosen (`<uuid>.<jpg|png|webp|pdf>`, with an `adhaar_` / `bank_proof_` /
  `skill_proof_` prefix on private documents). Returned URLs keep their shape (`/uploads/<file>` for photos).
- `/uploads/*` now serves only .jpg/.jpeg/.png/.webp, with `X-Content-Type-Options: nosniff`. Everything
  else under it returns 404.
- Private downloads (`/providers/{id}/adhaar`, `/bank-proof`, skill proof) also send `nosniff`.
Deprecated: nothing. Old files already on disk are not moved or deleted.
Clients affected: web (admin skill-request viewer must fetch `proof_url` with the token; show the 413/415
message to users), mobile (handle 413/415 on photo and document upload; only jpg/png/webp/pdf).

## BE-006
Date: 2026-10-29 | Breaking: no (additive)
Changed: `POST /api/v1/bookings` — optional `latitude` (-90..90) and `longitude` (-180..180); values outside
the range give 422. `BookingResponse` (all booking endpoints) returns `latitude` and `longitude` (null when
not sent). These fields were already in the baseline export from the working copy; this change commits the
code and adds the range check and tests.
Clients affected: mobile (send the pin location when the customer picks one), web (parked).

## BE-007
Date: 2026-10-29 | Breaking: yes for the admin status override only (no client uses it yet); migration below
Changed: `PATCH /api/v1/admin/bookings/{id}/status` — admins are now bound by the same transition table as
everyone else. Allowed targets: `CANCELLED_BY_ADMIN` (from REQUESTED, ACCEPTED, ON_THE_WAY, IN_PROGRESS) and
`COMPLETED` (from IN_PROGRESS). Anything else returns **422** `BOOKING_INVALID_STATUS` with
`details: {current, requested, actor}`, and nothing is written (before, an admin could move any booking to any
status, for example reopen a COMPLETED one). `final_amount` is no longer saved when the change is refused.
Changed: all booking status errors now use one message format
"A booking that is X cannot be changed to Y by the <actor>." (code and HTTP status are unchanged: 422
`BOOKING_INVALID_STATUS`). Clients should show `detail.error.message`, not match on its text.
Deprecated: `PATCH /api/v1/provider/bookings/{id}/in_progress` — identical to `/start` (both need the
customer's start OTP). Marked `deprecated` in OpenAPI. Use `/start`. Removal not before 2027-03-01.
Migration path: the admin panel has no status-override screen yet (Q-W6), so nothing to migrate; build it
against the table above. Web's provider panel still calls `/in_progress`; switch it to `/start`.
Provider and customer rules are unchanged (the table is the same behaviour they had, now in one place:
`backend/app/services/booking_rules.py`).
Clients affected: web (switch `/in_progress` to `/start`; future admin override), mobile (use `/start`).

## BE-008
Date: 2026-10-29 | Breaking: no (new error response on existing routes)
Changed: every booking status change (`PATCH /provider/bookings/{id}/accept|reject|on_the_way|start|in_progress|complete`,
`PATCH /bookings/{id}/cancel`, `PATCH /admin/bookings/{id}/status`) and `PATCH /admin/bookings/{id}/assign`
is now applied only if the booking is still in the status the server checked (compare-and-set). If someone
else changed it in between, the call returns **409** `BOOKING_STATE_CHANGED`
("This booking was just updated by someone else. Please refresh and try again.") and writes nothing: no
status change, no history entry, no notification, no `final_amount`. Before, both sides could "succeed" and
the last write won. `assign` also fails with 409 if another admin assigned a different provider first.
The 409 is not in the OpenAPI response lists (it can come from any of these routes); the code is documented here.
Clients affected: mobile and web. On 409 `BOOKING_STATE_CHANGED`: reload the booking and show the status
the server now has (Rule 8); do not retry blindly. Normal 422 `BOOKING_INVALID_STATUS` is unchanged.

## BE-009
Date: 2026-10-31 | Breaking: no (bug fix)
Changed: validation errors (422 `VALIDATION_ERROR`) are now always JSON-safe. A request with neither email nor
phone to `POST /auth/register/customer`, `POST /auth/login` or any other `ContactMixin` model used to crash
with HTTP 500; it now returns 422 with `details.errors` (error entries from model validators no longer
include the raw Python exception). Clients affected: web, mobile (forms can now show the 422 message).

## BE-010
Date: 2026-10-31 | Breaking: no (additive field; new 403 on actions of non-verified providers)
Changed: every provider booking action (`PATCH /provider/bookings/{id}/accept|reject|on_the_way|start|in_progress|complete|mark-cash-paid`)
returns **403** `PROVIDER_NOT_VERIFIED` when the provider's `verification_status` is not `VERIFIED`
(PENDING_VERIFICATION, REJECTED, DISABLED). Admins can still mark cash paid.
Changed: when a provider stops being VERIFIED (`PATCH /admin/providers/{id}/reject`, `/disable`, provider
`POST /provider/me/resubmit`, re-verification request) their open bookings are handled automatically:
- REQUESTED, ACCEPTED and ON_THE_WAY bookings return to unassigned `REQUESTED` (`provider_id` null), with a
  `status_history` entry and notifications `BOOKING_RELEASED` to the customer and to all admins.
- IN_PROGRESS bookings stay with the provider and get `needs_admin_attention: true`; admins receive a
  `BOOKING_NEEDS_ATTENTION` notification.
- COMPLETED/cancelled bookings are untouched.
Added: `BookingResponse.needs_admin_attention` (boolean, default false) — show it in the admin queue.
Clients affected: web (admin queue: show the flag; provider panel: handle 403 PROVIDER_NOT_VERIFIED by
showing the profile status), mobile (same; customer sees the booking go back to "REQUESTED" and gets the
BOOKING_RELEASED notification).

## BE-011
Date: 2026-10-31 | Breaking: no (field ignored for one release, Rule 7)
Deprecated: `PATCH /api/v1/provider/me` field `category_ids` — now accepted but **ignored** (marked
`deprecated` in OpenAPI). A provider's skills change only through `POST /provider/me/skill-requests`, which an
admin approves. Other fields in the same request (`bio`, `experience_years`, `price_note`, `localities`) still
work. Removal of the field: not before 2027-03-01.
Changed: `POST /api/v1/provider/me/resubmit` — `categories` are checked against active categories (case-
insensitive, stored with the official spelling). An unknown or inactive name returns **422**
`VALIDATION_ERROR` with `details.unknown_categories` and nothing is saved.
Clients affected: web (stop sending `category_ids` in the profile editor; send only names from the active
category list on resubmit), mobile (same).

## BE-012
Date: 2026-10-31 | Breaking: no (old fields kept and documented as ignored/mapped, Rule 7)
Changed: prices are set by the server (policy P-2, launch offer). Every new booking has `visit_charge`
(setting `LAUNCH_VISIT_CHARGE_INR`, default 99), optional `offer_ends_at` (setting `LAUNCH_OFFER_ENDS_AT`),
`extra_amount` 0, and `total_amount = final_amount = visit_charge`.
Deprecated (ignored): `POST /bookings` fields `subtotal`, `platform_fee`, `discount`, `total_amount` are still
accepted but ignored; item `price` is shown to the provider but never used. Removal not before 2027-03-01.
Changed: `BookingItem.price` must be >= 0 and `quantity` >= 1, otherwise 422.
Added: `extra_amount` (>= 0, max 100000) and `extra_note` (max 300 chars) on
`PATCH /provider/bookings/{id}/complete`, `PATCH /admin/bookings/{id}/status` (when completing) and
`PATCH /provider|admin/bookings/{id}/mark-cash-paid`. Result: `final_amount = total_amount = visit_charge +
extra_amount`. Negative extra gives 422.
Deprecated: `final_amount` on the same requests. Still accepted and read as visit charge + (final_amount -
visit_charge), never below the visit charge. Prefer `extra_amount`.
Added to `BookingResponse`: `visit_charge`, `extra_amount`, `extra_note`, `offer_ends_at`. Bookings created
before this change have `visit_charge` null; their amounts are unchanged and `final_amount` still works as before.
Clients affected: mobile and web — customer UI shows "Visit charge Rs 99" (and the offer end date), never
computes a total; provider UI sends `extra_amount` + `extra_note` at completion instead of `final_amount`.

## BE-013
Date: 2026-10-31 | Breaking: no (new endpoints/fields; the cancel rules get wider, nothing is removed)
Added: `PATCH /api/v1/provider/bookings/{id}/release` body `{"note": "<reason, 3-500 chars>"}` — the assigned,
verified provider gives the job back. Allowed from ACCEPTED and ON_THE_WAY only (else 422
`BOOKING_INVALID_STATUS`; a missing note is 422 `VALIDATION_ERROR`). The booking becomes unassigned
`REQUESTED` (`provider_id` null), the note is saved in `status_history`, the customer gets a `BOOKING_RELEASED`
notification and every admin gets one too.
Added: `PATCH /api/v1/admin/bookings/{id}/reset-otp` (admin only, booking ACCEPTED or ON_THE_WAY) — issues a new
4-digit start code and clears the failed-attempt counter; the customer is notified.
Added: start code lock. After **5** wrong codes on `/start` (or `/in_progress`) the call returns **423**
`OTP_LOCKED` (also for the correct code) until an admin resets it. Wrong codes before that return 400
`VALIDATION_ERROR` with `details.attempts_left`. Admins get a `BOOKING_OTP_LOCKED` notification.
`BookingResponse.otp_locked` (boolean) tells the admin UI.
Changed: customer cancel `PATCH /bookings/{id}/cancel` is now also allowed from ON_THE_WAY (the assigned
provider is notified) and from REJECTED (Q1). Admin override `PATCH /admin/bookings/{id}/status` may now
cancel (`CANCELLED_BY_ADMIN`) a REJECTED booking. All other transitions are unchanged.
Changed: `POST /bookings` — `preferred_datetime` without a time zone is read as IST (Asia/Kolkata); a time
more than 5 minutes in the past returns **422** `VALIDATION_ERROR`. Stored in UTC.
Changed: `PATCH /provider/bookings/{id}/mark-cash-paid` (and the admin one) — a second call on an already paid
booking returns **422** `BOOKING_INVALID_STATUS` and changes nothing (before, it rewrote the amount and added
another history entry).
Changed: public `GET /providers` and `GET /providers/{id}` return `phone: null`. Admin and the provider
themselves still see it, and the assigned customer's booking response still includes the provider's phone.
Changed (no schema change): `locality` filter and skill-request names are matched as literal text (a `.*` no
longer matches everything); the admin dashboard `open_bookings` now counts ON_THE_WAY; reassigning a booking
sends the previous provider a `BOOKING_REASSIGNED_AWAY` notification.
Clients affected: mobile (release button, 423 handling, cancel in ON_THE_WAY/REJECTED, phone now only on a
booking), web (admin: reset-otp and otp_locked badge; provider: release; do not read provider phone on the
public list).

## BE-014
Date: 2026-10-31 | Breaking: no (off by default; local storage stays the default)
Added: Cloudflare R2 file storage, selected with `STORAGE_BACKEND=r2` (default `local`). Settings:
`R2_ACCOUNT_ID` (or `R2_ENDPOINT_URL`), `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, optional
`SIGNED_URL_TTL_SECONDS` (default 300). With `r2` selected and a setting missing, the app refuses to start.
Changed (only when STORAGE_BACKEND=r2): the private download routes `GET /providers/{id}/adhaar`,
`GET /providers/{id}/bank-proof` and `GET /skill-requests/{id}/proof` still check who is asking (401/403 as
before) but answer **302** with a short-lived signed URL (`Location`) instead of the file bytes, and
`Cache-Control: private, no-store`. `GET /uploads/{name}` (public photos) answers 302 to a signed URL for
image types only. URLs stored in the database do not change. Browsers and apps that fetch with a token must
follow the redirect; the bucket needs a CORS rule that allows GET from the web origin.
Clients affected: web (admin viewers that fetch documents as a blob: the redirect must be followed and the
bucket CORS allow the origin), mobile (follow the redirect when downloading). No change while storage is local.

## BE-015
Date: 2026-10-31 | Breaking: no (bug fixes; no schema change)
Fixed (SU-015): `POST /api/v1/provider/me/documents` now answers with the stored provider, so
`profile_photo_url` and the Aadhaar fields in the response show the files that were just uploaded (before, it
answered with the profile as it was before the upload).
Fixed (SU-016): a second account without a phone, or without an email, can now register. The unique indexes on
`users.email` and `users.phone` only cover real text values (partial indexes), so missing/null values no
longer collide. Duplicate real emails/phones are still rejected (409 `DUPLICATE_ACCOUNT`). This needs the
one-time database step described in `backend/scripts/migrate_contact_indexes.py` (infrastructure runs it; a
dry run first). Until it has run, an old database keeps its old indexes and the old behaviour; the API starts
normally either way and logs a warning.
Clients affected: none need to change. Web: the provider documents screen can trust the response now.

## BE-017
Date: 2026-11-01 | Breaking: no (additive; ADR 0003 §1-7)
Added: `POST /api/v1/auth/refresh` body `{"refresh_token"}` -> `TokenResponse` (new `access_token`, new
`refresh_token`, `expires_in`, `user`). Each refresh token works ONCE: use the new one next time.
- Errors (401 unless noted): `AUTH_REFRESH_INVALID` (unknown token), `AUTH_REFRESH_EXPIRED`,
  `AUTH_REFRESH_REUSED` (an already-used or revoked token came back: the whole login is ended, log in again),
  403 `ACCOUNT_DISABLED`. On any 401 from this endpoint the client must clear its tokens and show login.
- Retry tolerance: if the SAME refresh token is sent again within 60 seconds (the reply got lost on a bad
  connection) the server issues a fresh pair and cancels the pair it issued the first time. So always keep and
  use the newest pair; never use an older one.
Added: `POST /api/v1/auth/logout` body `{"refresh_token"?, "push_token"?}` -> **204**, no body. Ends that login
(the token and everything it was rotated into) and removes `push_token` from the user. Always 204, even for an
unknown or missing token. No auth header needed. The access token already issued stays valid until it expires
(60 minutes now), so also forget it on the device.
Changed: `TokenResponse` (login, `register/customer`, `register/provider`, `password-reset`) now also has
`refresh_token` and `expires_in` (seconds the access token lives; 3600 now). Old clients ignore them.
Added: request header `X-Client: mobile | admin_web` on login, both register endpoints and password reset. It
picks the refresh lifetime: `mobile` = 30 days sliding (renewed on every refresh), never more than 90 days from
login; anything else (including no header) = `admin_web` = 12 hours from login, not extended by refreshing.
Changed: access tokens now carry `typ: "access"`, `iat` and `jti`. Tokens issued before this change (no `typ`)
keep working until they expire. A refresh token is NOT accepted as an access token.
Changed: a password change or an admin disabling a provider ends all sessions of that user: their refresh
tokens are revoked, and access tokens issued before that moment are rejected with 401 `AUTH_REQUIRED`
(after a password reset the same call returns a new, working session).
Unchanged on purpose: the access token still lives 60 minutes. It drops to 15 only when mobile and web admin
both use refresh (ADR 0003 §7 step 3); that will be announced in its own entry.
Database: new collection `refresh_tokens` (only the SHA-256 hash of each token is stored) with a unique index
on `token_hash`, indexes on `user_id` and `family_id`, and a TTL index on `family_expires_at`. New
`users.tokens_valid_after` field is set only when a password changes or an account is disabled. Nothing existing
is dropped or rewritten.
Clients affected: mobile (M1 login/session, logout button), web admin (use refresh before the access token
expires and send `X-Client: admin_web`).

## BE-018
Date: 2026-11-01 | Breaking: yes, for registration without a phone number only (see migration path)
Changed: `POST /api/v1/auth/register/customer` and `POST /api/v1/auth/register/provider` (JSON and the
multipart form) now REQUIRE `phone`; `email` is optional. A missing or invalid phone returns 422
`VALIDATION_ERROR` ("Enter a valid 10-digit mobile number.").
- Accepted input: any common way of typing an Indian mobile number: `9876543210`, `+91 98765 43210`,
  `09876543210`, `919876543210`, with spaces/dashes/brackets. The server stores and returns it as **10 digits**
  (`9876543210`). The number must start with 6, 7, 8 or 9.
- Duplicates are detected across formats: registering `9876543210` when `+919876543210` already exists gives
  409 `DUPLICATE_ACCOUNT`.
Changed: `POST /api/v1/auth/login` still takes `email` OR `phone` (unchanged), but a `phone` is now matched in any
format, including accounts created earlier with `+91`, `91`, a leading `0`, or `+91 ` in front. Existing users
are NOT rewritten, so `user.phone` of an older account can still be in its old format: do not assume 10 digits.
Fixed: `POST /auth/register/provider` with an invalid JSON body answered 500; it now answers 422 like every
other validation error.
Migration path (Rule 7): the web sign-up form already sends `phone`; the old Android build is archived and is
not distributed, so no shipped client registers without a phone. Email-only registration stops working with
this change. If a client does register without a phone it gets a clear 422 and no data is created.
Not changed: password reset (still `email` + `phone`, disabled in production), existing accounts, the stored
format of existing phones. Email is still unique when present; a missing email is fine for any number of accounts.
Clients affected: mobile (phone-first sign-up and login screens), web (make the phone field required on sign-up).
