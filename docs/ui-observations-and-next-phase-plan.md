# GharTak UI Observations, Current Gaps, and Next Phase Plan

Date: 2026-06-17  
Status: Product/QA review only. No implementation changes made in this pass.

## 1. Context

This document captures observed behavior while using the current local GharTak UI and maps it against the approved product roadmap.

The current application is still in early Phase 7 development. So far, the implemented slices are:

- Foundation setup.
- Authentication and user management.
- Categories and provider onboarding.
- Basic customer discovery and booking API.
- Initial role-based UI separation.

The product is not yet at polished MVP UI quality. Several screens are functional scaffolds rather than final user journeys.

## 2. User Observations

### 2.1 Homepage

Observed:

- Homepage loads successfully.
- The hero/top section shows:
  - Book a Service.
  - Join as Provider.
- Clicking these buttons currently does nothing.
- Category tiles such as Electrician and Plumber appear.
- Clicking category tiles currently does nothing.
- Login/signup forms are visible at the bottom of the homepage.

Assessment:

- This is a valid UX gap.
- The homepage should not expose the full login/signup form inline.
- Hero CTAs and category cards should navigate users into the correct flow.
- Category cards should either start service discovery or redirect unauthenticated users to customer login/signup.

### 2.2 Customer Signup/Login

Observed:

- Customer signup works.
- Customer login works.
- After login, customer dashboard appears.
- Customer dashboard has:
  - Search Providers section.
  - Booking Request section.
- Service category dropdown is empty.
- Locality input is available.
- Booking request form includes address, preferred date/time, and issue description.

Assessment:

- Authentication is functioning.
- Empty category dropdown is expected if admin has not yet created service categories in the database.
- However, from a user perspective, this feels broken.
- The app needs seed categories for local development and MVP bootstrapping.
- Customer should not be expected to understand that admin setup is required first.

Required improvement:

- Seed default MVP categories.
- Show a clear empty state if no categories exist.
- Block booking form until category and verified provider are selected.
- Guide the user through service selection first, then provider selection, then booking request.

### 2.3 Provider Signup/Login

Observed:

- Provider signup/login is not working as expected.
- UI shows only "Request Failed."
- Backend logs show `409 Conflict`.

Assessment:

- A `409 Conflict` usually means duplicate email or phone already exists.
- The backend is correctly preventing duplicate accounts, but the UI error message is too vague.
- The logs are technically correct but not helpful enough for debugging business flows.

Required improvement:

- UI should show a clear message such as:
  - "An account already exists with this email or phone."
- Backend logs should include structured context:
  - endpoint.
  - error code.
  - user role being attempted.
  - non-sensitive contact indicator if safe.
- Provider signup page should clearly explain:
  - profile will go under admin review.
  - provider will not be public until approved.

## 3. User Suggestions

### 3.1 Homepage Should Be Marketing + Navigation, Not Forms

Suggested:

- Remove login/signup forms from the main homepage.
- Add top navigation buttons for:
  - Book a Service.
  - Join as Provider.
  - Login/Signup.
- Middle section should show visual carousel/sliding tabs:
  - services provided.
  - happy customers.
  - GharTak team.
- Footer should include:
  - contact us.
  - social links.
  - service areas.
  - provider join CTA.
  - basic trust copy.

Assessment:

- This is the right direction.
- The homepage should act as the public landing/discovery page.
- Forms should move to dedicated auth pages or modal flows.

Classification:

- MVP for navigation and auth separation.
- Nice to Have for image carousel if static image bands are faster.
- MVP for footer/contact basics.

### 3.2 Book a Service Flow

Suggested:

- If customer is logged in, show booking options.
- If not logged in, redirect to customer login/signup.
- Show all service categories from the GharTak provider ad image.

Assessment:

- Correct.
- The product should support intent-based routing.
- Book a Service should be customer-first.

Recommended MVP flow:

1. User clicks Book a Service.
2. System checks auth state.
3. If not logged in:
   - show customer login/signup.
4. If logged in as customer:
   - show service category selection.
   - show verified providers.
   - allow booking.
5. If logged in as provider/admin:
   - show a helpful role-specific message or switch-account option.

Categories from the provider ad image that should be considered:

- Electrician.
- Plumber.
- Carpenter.
- Painter.
- Driver.
- Tutor.
- Photographer.
- Freelancer.
- Event Staff.
- Other Service.

Current approved MVP category list also includes:

- AC Repair.
- Appliance Repair.
- House Cleaning.

Recommended MVP seed categories:

- Electrician.
- Plumber.
- Carpenter.
- Painter.
- AC Repair.
- Appliance Repair.
- House Cleaning.
- Driver.
- Tutor.
- Event Staff.
- Other Service.

Post-MVP or later classification:

- Photographer.
- Freelancer.

Reason:

- Photographer/Freelancer are broad and may require different booking/pricing flows.

### 3.3 Join as Provider Flow

Suggested:

- Join as Provider should open provider login/signup.
- After signup, provider should see profile under review.
- If already logged in as provider, show:
  - completed bookings.
  - active bookings.
  - ratings/reviews.

Assessment:

- Correct.
- Provider onboarding needs its own focused path.
- The current combined auth form is too generic.

Recommended MVP flow:

1. User clicks Join as Provider.
2. System opens provider auth flow.
3. Provider signs up.
4. Provider selects services and localities.
5. Provider sees "Profile Under Review."
6. Admin approves provider.
7. Provider dashboard unlocks:
   - active bookings.
   - completed bookings.
   - availability toggle.
   - profile information.

Not yet implemented:

- Completed bookings separation.
- Ratings/reviews display.
- Provider under-review screen as a polished state.

### 3.4 Error Handling

Suggested:

- UI and logs should clearly show issues instead of generic "Request Failed" and `409 Conflict`.

Assessment:

- Correct and important.
- This should be treated as MVP quality work, not polish.

Required improvements:

- Frontend should display backend error messages.
- Backend should return consistent error responses.
- Backend should log structured application errors.
- Duplicate account should show user-friendly copy.
- Empty category/provider states should explain what action is needed.

## 4. What Should Have Been Added by Now

Based on the current development phase, the following should already exist or be added before moving deeper into booking/payment/reviews.

### 4.1 Role-Based Navigation

Should be present:

- Public homepage.
- Dedicated customer login/signup path.
- Dedicated provider login/signup path.
- Logged-in role detection.
- Separate customer/provider/admin dashboards.

Current status:

- Partially implemented.
- Still needs proper navigation and route-like UI states.

Priority:

- MVP.

### 4.2 Functional Homepage CTAs

Should be present:

- Book a Service button should open customer auth or customer dashboard.
- Join as Provider button should open provider auth.
- Category cards should start customer booking intent.

Current status:

- Not implemented.

Priority:

- MVP.

### 4.3 Seed Categories

Should be present:

- Default categories should be available in local development.
- Admin should not have to manually create categories before customer testing.

Current status:

- Not implemented.
- Empty dropdown occurs if DB has no categories.

Priority:

- MVP.

Recommended seed categories:

- Electrician.
- Plumber.
- Carpenter.
- Painter.
- AC Repair.
- Appliance Repair.
- House Cleaning.
- Driver.
- Tutor.
- Event Staff.
- Other Service.

### 4.4 Clear Empty States

Should be present:

- No categories yet.
- No verified providers yet.
- Provider pending approval.
- No bookings yet.
- No active bookings.

Current status:

- Partially implemented.
- Needs better copy and flow blocking.

Priority:

- MVP.

### 4.5 Better Error Messages

Should be present:

- Duplicate email/phone should show exact user-friendly message.
- Provider not verified should show clear explanation.
- Missing category/provider should block booking with clear message.

Current status:

- Backend has structured error format in many places.
- Frontend still shows generic messages in some flows.

Priority:

- MVP.

### 4.6 Provider Under Review State

Should be present:

- After provider signup, show a dedicated under-review screen.
- Explain that admin approval is required.
- Hide booking-management features until provider is approved.

Current status:

- Backend supports pending verification.
- Frontend needs polished pending state.

Priority:

- MVP.

## 5. What Should Be Added in the Next Phase

Recommended next phase: **Navigation, Public Homepage, and Role Flow Hardening**.

This should happen before adding more deep marketplace features.

### 5.1 Public Homepage Redesign

Deliverables:

- Clean landing page without inline auth forms.
- Header navigation:
  - GharTak logo.
  - Book a Service.
  - Join as Provider.
  - Login.
- Hero section with brand message.
- Service category preview.
- Visual section for services/customers/team.
- Footer with contact and trust information.

Classification:

- MVP.

Notes:

- Use available client brand colors: navy and orange.
- Use existing client logo where possible.
- If no final images are available, use styled placeholders first and replace later.

### 5.2 Auth Flow Separation

Deliverables:

- Customer login/signup view.
- Provider login/signup view.
- Admin login view, if needed.
- No mixed customer/provider/admin forms on homepage.

Classification:

- MVP.

### 5.3 Intent-Based Navigation

Deliverables:

- Book a Service:
  - if logged out, open customer auth.
  - if customer logged in, open customer booking.
  - if provider/admin logged in, show role mismatch guidance.
- Join as Provider:
  - if logged out, open provider auth.
  - if provider logged in, open provider dashboard.
  - if customer/admin logged in, show role mismatch guidance.
- Category click:
  - starts booking intent for selected category.

Classification:

- MVP.

### 5.4 Seed Data

Deliverables:

- Add seed script for default service categories.
- Add README instructions.
- Optional seed sample admin.
- Optional seed sample provider for demo.

Classification:

- MVP.

### 5.5 Customer Booking UX Hardening

Deliverables:

- Category selection should be required.
- Provider search should not run with empty categories.
- Booking form should be disabled until provider is selected.
- Customer should see clear steps:
  1. Choose service.
  2. Choose provider.
  3. Enter address/time/problem.
  4. Submit booking.

Classification:

- MVP.

### 5.6 Provider Dashboard Hardening

Deliverables:

- Pending review screen.
- Active bookings tab.
- Completed bookings tab.
- Availability status.
- Profile completeness indicator.

Classification:

- MVP for pending/active/completed.
- Nice to Have for profile completeness.

### 5.7 Error and Logging Improvements

Deliverables:

- Frontend error banner/component.
- Backend structured logs for handled application errors.
- Friendly messages for:
  - duplicate account.
  - no categories.
  - no verified providers.
  - provider pending approval.
  - invalid booking transition.

Classification:

- MVP.

## 6. Recommended Development Order

1. Add seed categories script.
2. Refactor frontend into view states:
   - public home.
   - customer auth.
   - provider auth.
   - customer dashboard.
   - provider dashboard.
   - admin dashboard.
3. Wire homepage CTA buttons.
4. Wire category cards into customer booking intent.
5. Improve provider pending-review UX.
6. Improve customer booking UX steps.
7. Improve error display.
8. Improve structured logging.

## 7. Not Recommended Yet

Do not add these before fixing navigation and core UX:

- Online payments.
- SMS.
- Real-time chat.
- Advanced analytics.
- Mobile app.
- Complex scheduling.
- Loyalty/referral programs.

Reason:

- The current bottleneck is not feature count. The bottleneck is clear, reliable user flow.

## 8. Summary

The current implementation proves that core backend pieces are beginning to work, but the UI is still too close to a developer test console. The next phase should focus on turning it into a real product experience:

- clean public homepage.
- separated auth flows.
- role-aware dashboards.
- seeded categories.
- actionable errors.
- clear booking journey.

This should be completed before moving to reviews, payments, or advanced admin features.
