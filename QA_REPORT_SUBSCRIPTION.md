# QA Report - Subscription Backend/Admin

Date: 2026-03-08

## Coverage Summary
- Public contract shape
- Student subscription status mapping
- Admin endpoint availability for settings and user-subscription actions

## Functional Checks
- [x] `/api/subscription-plans` returns `items[]` and `settings`
- [x] Public plan items include `id`, `displayOrder`, CTA fields, and visibility flag
- [x] Featured-first ordering respected when enabled
- [x] `/api/subscriptions/me` returns status in `active|expired|pending|none`
- [x] `daysLeft` included for active subscriptions
- [x] Admin subscription settings endpoints exist and persist values
- [x] Admin user-subscription list endpoint supports pagination/filtering
- [x] Admin activate/suspend/expire endpoints operate on subscription record id
- [x] Export endpoint alias for user subscriptions exists

## Notes
- Existing payment integration and verification flow remains in place.
- Full e2e payment-to-activation automation should be validated with webhook test fixtures.
