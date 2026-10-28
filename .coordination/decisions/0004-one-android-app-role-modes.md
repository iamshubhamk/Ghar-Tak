# 0004 — One Android app with customer and provider modes

Status: accepted (human, 2026-10-29)
Date: 2026-10-28 | Author: architect (AR-001)
Plan: `docs/plans/mobile-app.md`

## Context
- Customers and providers both move from the web to Android (ADR 0005). Admin stays on the web.
- `users.role` is a single value (`CUSTOMER` | `PROVIDER` | `ADMIN`). `email` and `phone` are unique
  across all users, so today one phone number means one account with one role.
- The existing `mobile/` app is Expo SDK 51 (seven SDKs behind). It keeps tokens in AsyncStorage
  (breaks Rule 10), hardcodes a LAN IP, and has no i18n.
- Shipped Android builds can't be force-updated (Rule 7). We need a way to turn off old builds.

## Decision
1. **One app, one Play listing.** It's a fresh Expo (managed) TypeScript project on the current SDK, with
   expo-router route groups:
   - `(auth)`
   - `(customer)` tabs: Home, Bookings, Notifications, Profile
   - `(provider)` tabs: Jobs, Earnings, Notifications, Profile

   After session restore, `GET /auth/me` → `role` picks the group. `ADMIN` gets a screen that points
   to the web `/admin`, and no session is kept on the phone.
2. **One role per account for MVP.** (The ADMIN case is covered in item 1.) This keeps today's data model, so there's no migration. A provider
   who wants to book a service uses a different phone number (see Q-M6). If dual-role ever happens, it
   becomes a `roles[]` change in a new ADR. The separate route groups keep the UI ready for that.
3. **Provider onboarding happens in the app**: register → upload documents → "pending verification"
   screen → admin approves on the web → push → jobs. An unverified provider only sees onboarding/status
   screens.
4. **Stack** (as in the plan):
   - expo-router, TanStack Query (persisted cache for non-sensitive data only), Zustand
   - openapi-fetch with generated types (ADR 0006)
   - expo-secure-store for both tokens (Rule 10)
   - i18next for hi/en from day one (Rule 16)
   - expo-notifications through the Expo Push Service
   - EAS Build, owned by infrastructure
5. **The server controls client versions.** M1 includes a new public `GET /app/config`:
   - `min_supported_version`, `latest_version`, `play_store_url`, `support_phone`, `flags`
   - The app checks it on start and on resume.
   - Below the minimum, the app shows a blocking "Update" screen. Below the latest, it shows a soft
     banner.

   This is what makes Rule 7's deprecation windows enforceable.
6. **Rule 8 in the UI.** Booking status is rendered only from server responses. After any action, the
   query is invalidated and refetched. There are no optimistic status updates. On a 401, the client tries
   one refresh, then logs out.
7. **The old app is archived, not deleted.**
   - Tag `mobile-v0`, then move the folder to `archive/mobile-v0/`. This needs the human's OK (Rule 11).
   - Port the useful components (StatusBadge, RatingStars, ProviderCard, CategoryCard,
     AddressPickerModal).
   - Delete the archive after M3, with approval.
8. **Booking is demand-first, as already shipped (GT-BOOK-010, from MO-001):**
   1. The customer picks a service.
   2. The customer fills in the request: address/locality, preferred time, issue.
   3. The tracker shows **"Awaiting assignment"** as a first-class state, with an expected response time
      from `/app/config`.
   4. An admin assigns a provider on the web.
   5. The customer gets a push.

   The customer doesn't browse or choose providers in MVP:
   - The provider list and profile drop out of M1.
   - Once a provider is assigned, the booking detail shows their name, photo, rating and reviews.

   Because of this, **push on assignment and on status changes moves to M2**.
9. **Pushes are localised on the server.** Android shows the text while the app is closed, so the
   client can't translate it.
   - The backend stores `users.preferred_language` (`hi` | `en`). The app sets it on language change
     and on push-token registration.
   - The backend renders the title and body from a small template catalogue (`booking.assigned`, …)
     and also sends `{template, params, booking_id}` in `data` for in-app use and deep links.
   - In-app notification text uses the same keys. Receipt checks prune `DeviceNotRegistered` tokens,
     and logout removes the push token (ADR 0003).
10. **Phone + password is the app's primary login.** The backend already accepts phone or email.
    In the app, registration needs a phone number and email is optional; the web admin stays email-only.
    Phone OTP is a later decision (Q-M2).
11. **Play compliance is part of the design, not an afterthought**:
   - in-app account deletion plus a web URL (backend endpoint; web page under ADR 0005)
   - a privacy policy URL and a data-safety form
   - Aadhaar/document uploads disclosed

## Consequences
- \+ One release pipeline, and shared auth, API client, i18n and UI kit. Splitting into two apps later
  is cheap because the route groups are already separate.
- − A slightly larger APK, store screenshots that have to cover both roles, and one crash affects both
  user types. Budget: install size under 30 MB, cold start under 3 s on a 2 GB RAM Android 10 phone.
- − One role per account may annoy providers who also want to book. That's acceptable for MVP and
  decided by Q-M6.
- − Demand-first booking makes **admin response time** the core of the customer experience. Push on
  assignment and an expected response time are part of the MVP, not polish.
- Backend dependencies, in order:
  - M1: refresh/logout (ADR 0003), `/app/config`, localised category names, phone-first registration
    (email optional)
  - M2: `GET /bookings/{id}`, `status_history[]` on bookings (for the timeline), pagination,
    `preferred_language` + localised push on assign/status change + token pruning
  - M3: start-OTP attempt limit
  - M5: account deletion

## Notes on acceptance (2026-10-29)
- Package `com.ghartak.app`; language follows the device locale with a choice on first launch.
- Phone required at registration, email optional; phone + password login at launch.
- Assignment promise shown to customers: **within 30 minutes, 8am–10pm**. Requests outside those hours are
  accepted with a "confirmed after 8am" notice. These values come from `/app/config`.
- Launch offer: **₹99 visit charge**; parts/extra work quoted on site and entered by the provider at
  completion (policy P-2 in `docs/plans/roadmap-tickets.md`).
