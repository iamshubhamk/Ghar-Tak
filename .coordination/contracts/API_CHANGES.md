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
