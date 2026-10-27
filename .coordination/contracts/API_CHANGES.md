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
