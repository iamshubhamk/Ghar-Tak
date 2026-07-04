# Phase 7 - P2 MVP Hardening Pass

Status: Implemented.

## Implemented Stories

| Story ID | Title | Status |
|---|---|---|
| GT-DISC-004 | Show Provider Rating | Implemented |
| GT-BOOK-008 | Admin Update Booking Status | Implemented |
| GT-REV-004 | Admin Hide Review | Implemented |
| GT-ADM-001 | Admin Dashboard Summary | Implemented |
| GT-ADM-002 | View All Customers | Implemented |
| GT-ADM-004 | View All Bookings | Implemented |
| GT-NOTIF-001 | In-App Notifications | Implemented |
| GT-NOTIF-002 | Provider Application Notification | Implemented |
| GT-NOTIF-003 | Booking Status Notifications | Implemented |

## Notes

- Admin dashboard now shows customers, providers, open bookings, and completed bookings.
- Admin can filter bookings by status, service category, and provider.
- Admin can update booking status manually when operational follow-up is needed.
- Admin can view customer contact/locality details.
- Admin can hide or restore reviews; hidden reviews no longer count toward public ratings.
- In-app notifications are stored locally and displayed in customer, provider, and admin dashboards.
- Provider applications and booking status changes create in-app notifications.
- SMS and email remain deferred, but the notification events now have a single backend path that can later feed paid adapters.

