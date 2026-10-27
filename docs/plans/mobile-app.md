# Plan — GharTak Android app

Status: **proposed** (2026-10-27). Owner: mobile. Needs the human's approval before any code is written.

## 1. Recommendation in one paragraph

Build **one** Expo (managed) + TypeScript app on the current SDK (58), with expo-router, TanStack Query,
Zustand, expo-secure-store, expo-notifications, and EAS Build for Android. API types are generated from
`.coordination/contracts/openapi.json`. Start a **fresh project** instead of upgrading the existing
`mobile/` app (Expo SDK 51, seven SDKs behind). Port its screens and components where they're useful.

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Expo SDK 58, managed workflow**, TypeScript, Hermes | No native toolchain to maintain. EAS builds in the cloud, so no Android Studio is needed for releases. OTA updates are possible later. |
| Navigation | **expo-router** | File-based, typed routes, deep links built in (needed for push → booking detail). |
| Server data | **TanStack Query v5** + persisted cache (`@tanstack/query-async-storage-persister`, non-sensitive data only) | Caching, retries with backoff, refetch on reconnect. Last-known data still shows on patchy 3G. |
| Client state | **Zustand** (session: user, role, language) | Small and simple. No Redux boilerplate. |
| HTTP + types | **openapi-fetch** + **openapi-typescript** | About 6 KB, fully typed from the contract (see §6). |
| Token storage | **expo-secure-store** | Rule 10. AsyncStorage is never used for tokens. |
| Push | **expo-notifications** + Expo Push Service | Free. The backend sends through Expo's HTTP API, with no Firebase SDK in our code. EAS still needs FCM credentials for Android. |
| i18n | **i18next + react-i18next + expo-localization** | Rule 16. `hi` and `en` from day one. The device locale is the default and can be switched in Profile. |
| Forms | react-hook-form + zod | Light, works well with RN inputs, and gives one validation layer. |
| Images | expo-image | Disk caching, which matters on slow networks. |
| Errors | Sentry (`@sentry/react-native`). qa-monitoring decides. | Free tier is enough for MVP. |
| Builds | **EAS Build** (APK for internal testing, AAB for Play), owned by release | |

Low-end device budget: install size under 30 MB, cold start under 3 s on a ~₹8k phone (2 GB RAM,
Android 10), no heavy animation libraries, lists virtualised with `FlatList`/FlashList, images sized on
the server.

## 3. One app or two?

**One app**, with the experience picked by role after login (`GET /auth/me` → `role`):

- `app/(auth)/…` for login and register (choose customer or provider)
- `app/(customer)/…` tabs: Home, Bookings, Notifications, Profile
- `app/(provider)/…` tabs: Jobs, Earnings, Notifications, Profile
- Admins aren't supported in the app. They're sent to the web `/admin`.

Why: one Play listing, one release pipeline, shared auth, API client and UI kit. The provider side is a
small share of users. Downsides: slightly larger APK, and Play Store screenshots have to cover both roles.
Splitting later is cheap because the route groups are already separate.

## 4. Screens → endpoints

All paths are under `/api/v1`.

### Shared / auth
| Screen | Endpoints |
|---|---|
| Splash / session restore | `GET /auth/me`, `GET /health` |
| Language picker (first launch) | — (local) |
| Login (phone or email + password) | `POST /auth/login` |
| Register customer | `POST /auth/register/customer` |
| Register provider (multi-step) | `GET /categories`, `POST /auth/register/provider` |
| Forgot password | `POST /auth/password-reset/verify`, `POST /auth/password-reset` |
| Notifications | `GET /notifications`, `PATCH /notifications/{id}/read` |
| Push registration (background) | `POST /notifications/push-token` |

### Customer
| Screen | Endpoints |
|---|---|
| Home (categories, search) | `GET /categories` |
| Category → provider list | `GET /providers?category_id&locality` |
| Provider profile + reviews | `GET /providers/{id}`, `GET /providers/{id}/reviews` |
| Book: address, time, issue, confirm | `GET/POST/PUT/DELETE /customer/me/addresses`, `POST /bookings` |
| My bookings | `GET /bookings/my` |
| Booking detail / tracker (status timeline, start OTP, cancel) | `GET /bookings/my` (filtered on the client, see MISSING #4), `PATCH /bookings/{id}/cancel` |
| Leave review | `POST /bookings/{id}/review` |
| Profile (photo, addresses, language, logout) | `GET /auth/me`, `POST /customer/me/photo`, addresses endpoints |

### Provider
| Screen | Endpoints |
|---|---|
| Verification status / pending screen | `GET /provider/me` |
| Upload documents (Aadhaar, photo, bank proof) / resubmit | `POST /provider/me/documents`, `POST /provider/me/resubmit` |
| Jobs list (new / active / done) | `GET /provider/bookings` |
| Job detail + actions | `PATCH /provider/bookings/{id}/accept`, `/reject`, `/on_the_way`, `/start` (with customer OTP), `/complete`, `/mark-cash-paid` |
| Availability toggle | `PATCH /provider/me/availability` |
| Edit profile / skills | `PATCH /provider/me`, `GET/POST /provider/me/skill-requests` |
| Earnings | computed from `GET /provider/bookings` for now (see MISSING #11) |

Not in the app at launch: wallet and saved payment methods (`/customer/me/wallet`,
`/customer/me/payment-methods`). The MVP is cash on service.

## 5. Missing or changed endpoints (requests to backend)

Each one becomes an entry in `.coordination/inbox/backend.md` after approval. **P0 = needed for the milestone
shown.**

| # | Endpoint / change | Needed for | Priority | Notes |
|---|---|---|---|---|
| 1 | `POST /auth/refresh`, `POST /auth/logout` (rotating refresh tokens) | M1 | P0 | Today there's a 60-minute access token only, so users would be logged out every hour on mobile. **Auth change → human approval + ADR (Rule 11).** |
| 2 | `GET /app/config`: `min_supported_version`, `latest_version`, `play_store_url`, `support_phone`, feature flags | M1 | P0 | The force-update path that Rule 7 relies on. Without it we can't retire old builds. |
| 3 | Localised category names (`name_hi` or `names: {en, hi}`) | M1 | P0 | Rule 16. Additive, not breaking. |
| 4 | `GET /bookings/{id}`, for the customer, the assigned provider, and admin | M2 | P0 | Today the client has to fetch the whole list to show one booking. Push deep links need it too. |
| 5 | Pagination (`limit`, `cursor`) on `/bookings/my`, `/provider/bookings`, `/providers`, `/notifications` | M2 | P1 | Payload size on 3G. Additive: keep the current unpaginated behaviour as the default. |
| 6 | `PATCH /customer/me` (name, phone, default locality) | M2 | P1 | Today only the photo can be changed. |
| 7 | Send pushes on booking status changes (Expo Push API) + `DELETE /notifications/push-token` on logout | M4 | P0 | Tokens are stored today but nothing sends a push. Needs an Expo access token (env secret, release). |
| 8 | **Account deletion**: `POST /auth/me/delete-request` (or `DELETE /auth/me`) + a web page | M5 | P0 | **Google Play requires** in-app account deletion and a web URL for apps that create accounts. |
| 9 | One error format for every error (`{error: {code, message, details}}`) | M1 | P1 | Today validation errors and other errors are shaped differently (see API_CHANGES baseline). |
| 10 | Drop the duplicate `/start` vs `/in_progress` (keep `/start`, deprecate the other) | M3 | P2 | Rule 7: deprecate, don't remove. |
| 11 | `GET /provider/me/earnings?period=` | M3 | P2 | Optional. The client can compute it for MVP. |
| 12 | Phone + OTP login | later | **open question** | Patna users expect OTP login, but SMS costs money (the MVP rule is "no paid SMS"). Options: Firebase Phone Auth (free quota) or MSG91 (~₹0.15–0.25/SMS). Phone + password for M1. |
| 13 | Provider time-slot availability | later | P2 | Today it's an AVAILABLE/UNAVAILABLE toggle only. Fine for MVP. |

## 6. Keeping types in sync with the backend

1. The backend owns `.coordination/contracts/openapi.json` and re-exports it on every contract change
   (`python -m scripts.export_openapi`).
2. Mobile runs `npm run gen:api`, which is
   `openapi-typescript ../.coordination/contracts/openapi.json -o src/api/schema.d.ts`.
   The generated file is committed.
3. All requests go through one `openapi-fetch` client (`createClient<paths>()`), so a wrong path, a wrong
   method or a missing field is a **TypeScript error**. No hand-written request or response types.
4. CI (release owns this) runs `gen:api` and fails if `git diff --exit-code src/api/schema.d.ts` isn't empty,
   so a contract change can't be merged without updating mobile's types.
5. When backend's `/handoff` touches the contract, mobile gets an inbox entry. Mobile regenerates, fixes type
   errors, and marks it done.

The web admin panel can follow the same pattern later.

## 7. Cross-cutting rules for the app

- The API base URL comes from `app.config.ts` + EAS env (`EXPO_PUBLIC_API_URL`), with separate dev and prod
  profiles. No hardcoded IPs.
- Booking status UI only renders server state. After an action, invalidate the query and show what the
  server returned (Rule 8). Don't update the status optimistically.
- On a 401: try a refresh once, otherwise log out.
- Offline: a banner when offline, cached data stays visible, and mutations are disabled while offline
  (no queued offline bookings in MVP).
- Accessibility: touch targets at least 48 dp, font scaling supported, enough contrast for outdoor use.

## 8. What happens to the existing `mobile/` app

- Tag the current commit `mobile-v0`, then move the folder to `archive/mobile-v0/`, kept as reference
  until M3. (Moving files needs the human's OK, Rule 11.)
- Worth porting: `StatusBadge`, `RatingStars`, `ProviderCard`, `CategoryCard`, `AddressPickerModal` (with
  expo-location), and the screen flows. Not ported: AsyncStorage token storage, the axios client,
  React Navigation setup, hardcoded URLs.

## 9. Milestones

| Milestone | Scope | Backend dependencies | Done when |
|---|---|---|---|
| **M1: Auth + browse** | Fresh Expo app, i18n (hi/en), theme, typed API client, login/register (both roles), session restore via secure store, Home → category → providers → provider profile, force-update gate | #1 refresh/logout, #2 app config, #3 localised categories | Works on a low-end Android device over throttled 3G. Debug APK shared via EAS internal distribution. |
| **M2: Booking + tracking** | Addresses, create booking, my bookings, booking detail with status timeline and start OTP, cancel, pull to refresh, offline banner | #4 booking by id, #5 pagination, #6 customer profile | A customer can book and see each status the provider sets. qa-monitoring's lifecycle tests pass. |
| **M3: Provider flow** | Provider onboarding and document upload, pending-verification screen, jobs list, accept/reject/on-the-way/start (OTP)/complete/cash-paid, availability toggle, skills | #10 deprecation (optional), #11 (optional) | A full booking lifecycle runs end to end on two phones. |
| **M4: Reviews + push** | Leave review, provider reviews list, push notifications with deep links to booking detail, notification centre | #7 push sending + token removal | A push arrives within about 10 s of a status change, and tapping it opens the booking. |
| **M5: Play Store** | Release AAB, signing, store listing (hi/en), privacy policy, data-safety form, account deletion, Sentry, internal → closed → production tracks (release leads) | #8 account deletion | App is live on Play production. Crash-free sessions above 99% in closed testing. |

## 10. Open questions for the human

1. OK to start fresh on SDK 58 and archive the existing `mobile/` app?
2. Phone + OTP login: needed at launch, or is phone + password fine until after the Play launch?
3. Package name: `com.ghartak.app`? (It can't be changed after the first Play upload.)
4. Do you already have a Google Play developer account (one-time US$25) and an Expo account?
5. Is Hindi the default language, or should it follow the device locale? (Proposed: device locale, with a
   choice on first launch.)
