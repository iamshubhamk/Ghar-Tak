# 0003 — Rotating refresh tokens, logout, and a real password-reset check

Status: proposed
Date: 2026-10-28 | Author: architect (AR-001)
Touches auth → needs the human's approval (Rule 11).

## Context
- Today: one HS256 JWT access token (`sub`, `role`, `exp`), 60 minutes, returned by login, both register
  endpoints and password reset (`TokenResponse`). No refresh, no logout, no revocation.
  `get_current_user` loads the user from Mongo on every request and rejects `is_active: false`, so
  disabling an account already takes effect on the next request.
- The Android app (ADR 0004) can't log people out every hour. On patchy 3G a refresh request often
  reaches the server while its response never comes back, so a refresh scheme has to cope with retries.
- The admin web (ADR 0005) keeps its JWT in `localStorage`.
- **Security bug found while reviewing (2026-10-28):** `POST /auth/password-reset` sets a new password
  and returns a login token for anyone who sends a matching **email + phone** pair. There's no OTP or
  emailed link. Providers see `customer_phone` on their bookings, and emails are easy to guess. This is
  an account-takeover path, admin included. `/password-reset/verify` also tells callers whether an
  email+phone pair exists.

## Decision
1. **Access token:** a JWT as today, plus `typ: "access"`, `iat` and `jti`. The lifetime goes **60 → 15
   minutes**, but only after both clients refresh (step 7 below).
2. **Refresh token:** an opaque random value (32 bytes, base64url), **not** a JWT. Only its SHA-256
   hash is stored, in a new `refresh_tokens` collection:
   `{id, user_id, family_id, token_hash (unique), client: "mobile"|"admin_web", created_at,
   expires_at, family_expires_at, rotated_at, replaced_by, revoked_at, revoke_reason}`.
   Indexes: `token_hash` unique, `user_id`, and a TTL index on `family_expires_at`. These are new indexes
   only. Nothing existing is dropped or rewritten.
3. **Lifetimes** (settings, not constants):
   - mobile: 30 days sliding, 90 days absolute per family (one login = one family).
   - admin_web: 12 hours absolute, no sliding (see Q-A3).
4. **Rotation with reuse detection:** every `POST /auth/refresh` issues a new pair and marks the old
   token `rotated_at`.
   - If a rotated token comes back **within a 60-second grace window**, the server treats it as a 3G retry.
     It issues a fresh pair and revokes the child it issued before, so only the newest pair works.
   - If it comes back after the window, or the token was revoked, the server treats it as theft. It
     revokes the whole family and returns 401 `AUTH_REFRESH_REUSED`.
5. **Endpoints** (additive, so no Rule 7 migration is needed):
   - `POST /auth/refresh` `{refresh_token}` → `{access_token, refresh_token, token_type, expires_in, user}`
   - `POST /auth/logout` `{refresh_token, push_token?}` → 204. Revokes the family and removes the push
     token if one is sent. Always succeeds, even with an unknown token, so it reveals nothing.
   - Login, register and password reset add `refresh_token` and `expires_in` to `TokenResponse`. Old
     web code ignores the extra fields.
   - Clients send `X-Client: mobile | admin_web` on login, register and password reset to choose the
     lifetime. Anything else is treated as `admin_web` (the shorter one).
6. **Revoke all of a user's families** when the password changes, when an admin disables the user, and
   on account deletion (Play requirement, ADR 0004).
7. **Rollout order:**
   1. Backend ships the endpoints with access still at 60 minutes.
   2. Mobile M1 and web `/admin` start using refresh.
   3. Backend switches access to 15 minutes.
   4. Existing logged-in web users have no refresh token, so they log in once more after their current
      token expires. No other migration is needed.
8. **Password reset is fixed before the app launches.** Until there's a real proof of ownership, nobody
   may use email+phone alone to reset a password:
   - Interim: disable the self-service reset in production (feature flag) and have support/admin reset
     on request. Admin accounts can never use self-service reset.
   - Target: a one-time code sent by email (free via an SMTP free tier). Or, if Q-M2 says yes, an SMS
     OTP, with attempt limits.
   - `/password-reset/verify` stops revealing whether an account exists.
9. Login, refresh and reset get basic rate limiting per IP and per account. Backend proposes the
   mechanism, kept simple: in-process for one instance, Mongo-backed if we scale out.

## Consequences
- \+ Mobile sessions last weeks. Logout and "disable user" really cut access. A stolen refresh token is
  caught the first time the real client refreshes after the thief.
- \+ No Redis or other new infrastructure: one Mongo collection with a TTL index.
- − One Mongo read and write per refresh (every ~15 minutes per active user). That's negligible at
  Patna scale.
- − Admin still uses bearer tokens in browser storage, so XSS risk remains until a cookie session
  (future ADR). Mitigations: 12-hour absolute lifetime and a strict CSP on `/admin` (ADR 0005).
- Follow-up, not decided here: `python-jose` is barely maintained, so moving to `PyJWT` is a candidate
  backend chore. Signing stays HS256 because there's only one service.
- Tests (Rule 9): rotation, the grace window, reuse → family revoked, logout, revoke on password change
  and on disable, and expiry.
