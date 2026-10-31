# Plan — GharTak Android app

Status: **approved** (human, 2026-11-01; ADRs 0003, 0004, 0006; answers in `docs/plans/open-questions.md`). Owner: mobile.
Updated 2026-11-01 (MO-002) to match ADR 0004: demand-first booking, no provider browsing in M1, push on assignment in M2.

## 1. Recommendation in one paragraph

Build **one** Expo (managed) + TypeScript app on the current SDK (58, confirmed `npm view expo version` = 58.0.22 on 2026-11-01), with expo-router, TanStack Query,
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
- `app/(customer)/…` tabs: Home, Bookings, Notifications, Profile (no provider list or provider profile in M1)
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
| Login (phone + password primary) | `POST /auth/login` |
| Register customer (phone required, email optional) | `POST /auth/register/customer` |
| Register provider (multi-step) | `GET /categories`, `POST /auth/register/provider` |
| Forgot password | `POST /auth/password-reset/verify`, `POST /auth/password-reset` |
| Notifications | `GET /notifications`, `PATCH /notifications/{id}/read` |
| Push registration + language (background) | `POST /notifications/push-token` (also sends `preferred_language`) |

### Customer (demand-first, ADR 0004 item 8)
| Screen | Endpoints |
|---|---|
| Home (services, ₹99 visit offer, assignment promise) | `GET /categories` (localised names), `GET /app/config` |
| Service info | `GET /categories` |
| Request a service: address/locality, preferred time, issue | `GET/POST/PUT/DELETE /customer/me/addresses`, `POST /bookings` (no `provider_id`) |
| My bookings | `GET /bookings/my` |
| Booking detail / tracker: **"Awaiting assignment"** with expected response time, status timeline, start OTP, cancel; once assigned: provider name, photo, rating | `GET /bookings/{id}` (MISSING #4), `PATCH /bookings/{id}/cancel` |
| Leave review | `POST /bookings/{id}/review` |
| Profile (photo, addresses, language, logout, delete account) | `GET /auth/me`, `POST /customer/me/photo`, addresses endpoints |

Dropped from M1: category → provider list, provider profile page, provider reviews list (`/providers*`). The
customer never chooses a provider in MVP.

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
| 4 | `GET /bookings/{id}`, for the customer, the assigned provider, and admin, with `status_history[]` | M2 | P0 | Today the client has to fetch the whole list, and there's no history to draw a timeline from. Push deep links need it too. |
| 5 | Pagination (`limit`, `cursor`) on `/bookings/my`, `/provider/bookings`, `/providers`, `/notifications` | M2 | P1 | Payload size on 3G. Additive: keep the current unpaginated behaviour as the default. |
| 6 | `PATCH /customer/me` (name, phone, default locality) | M2 | P1 | Today only the photo can be changed. |
| 7 | Push on assignment and every status change, **localised on the server** (`preferred_language` + template keys, ADR 0004 item 9), receipt checks pruning `DeviceNotRegistered`, `DELETE /notifications/push-token` on logout | **M2** | P0 | Sending already exists (`send_expo_push`); the gaps are the Expo access token, pruning, logout removal and localisation. |
| 8 | **Account deletion**: `POST /auth/me/delete-request` (or `DELETE /auth/me`) + a web page | M5 | P0 | **Google Play requires** in-app account deletion and a web URL for apps that create accounts. |
| 9 | One error format for every error (`{error: {code, message, details}}`) | M1 | P1 | Today validation errors and other errors are shaped differently (see API_CHANGES baseline). |
| 10 | Drop the duplicate `/start` vs `/in_progress` (keep `/start`, deprecate the other) | M3 | P2 | Rule 7: deprecate, don't remove. |
| 11 | `GET /provider/me/earnings?period=` | M3 | P2 | Optional. The client can compute it for MVP. |
| 12 | Phone + OTP login | later | decided: later (Q-M2) | Patna users expect OTP login, but SMS costs money (the MVP rule is "no paid SMS"). Options: Firebase Phone Auth (free quota) or MSG91 (~₹0.15–0.25/SMS). Phone + password for M1. |
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
  until M3. (Human approved the move, Q-M1.) `ProviderCard` is no longer needed in M1.
- Worth porting: `StatusBadge`, `RatingStars`, `ProviderCard`, `CategoryCard`, `AddressPickerModal` (with
  expo-location), and the screen flows. Not ported: AsyncStorage token storage, the axios client,
  React Navigation setup, hardcoded URLs.

## 9. Milestones

| Milestone | Scope | Backend dependencies | Done when |
|---|---|---|---|
| **M1: Auth + home** | Fresh Expo app, i18n (hi/en), theme, typed API client, login/register (both roles, phone-first), session restore via secure store, refresh on 401, Home with services + offer + assignment promise, service info, force-update gate, offline banner | #1 refresh/logout, #2 app config, #3 localised categories | Works on a low-end Android device over throttled 3G. Debug APK shared via EAS internal distribution. |
| **M2: Booking + tracking** | Addresses, create booking (no provider), my bookings, booking detail with "Awaiting assignment", status timeline and start OTP, cancel, pull to refresh, **push on assignment/status change with deep link** | #4 booking by id + history, #5 pagination, #6 customer profile, #7 localised push | A customer can book and see each status the provider sets. qa-monitoring's lifecycle tests pass. |
| **M3: Provider flow** | Provider onboarding and document upload, pending-verification screen, jobs list, accept/reject/on-the-way/start (OTP)/complete/cash-paid, availability toggle, skills | #10 deprecation (optional), #11 (optional) | A full booking lifecycle runs end to end on two phones. |
| **M4: Reviews + notification centre** | Leave review, notification centre, provider-side push | - | A review can be left after completion; provider receives pushes for new assignments. |
| **M5: Play Store** | Release AAB, signing, store listing (hi/en), privacy policy, data-safety form, account deletion, Sentry, internal → closed → production tracks (release leads) | #8 account deletion | App is live on Play production. Crash-free sessions above 99% in closed testing. |

## 10. Decisions (answered by the human, 2026-10-29 to 2026-11-01)

1. Fresh start on SDK 58 and archive the old `mobile/` app: **yes** (Q-M1).
2. Phone + OTP login: **later**; phone + password at launch (Q-M2).
3. Package name: **`com.ghartak.app`**.
4. Play developer and Expo accounts: infrastructure tracks this.
5. Language: **follows the device locale**, with a choice on first launch.
6. Booking is **demand-first**; a provider who wants to book uses a different phone number (Q-M6).
