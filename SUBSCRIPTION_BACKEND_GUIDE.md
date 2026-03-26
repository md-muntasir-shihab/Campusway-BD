# CampusWay Subscription Backend Guide

## Scope
Backend endpoints and models for subscription plans, user subscriptions, and admin controls.

## Models
- `backend/src/models/SubscriptionPlan.ts`
- `backend/src/models/UserSubscription.ts`
- `backend/src/models/SubscriptionSettings.ts` (added)
- Payment linkage uses existing `ManualPayment` model

## Public/Student APIs
### GET `/api/subscription-plans`
Returns:
- `items[]` (enabled plans)
- `settings` (page title/subtitle/banner/currency/featured ordering)

### GET `/api/subscriptions/me` (JWT)
Returns contract-aligned:
- `status: active | expired | pending | none`
- `planName?`
- `expiresAtUTC?`
- `daysLeft?`

Status logic:
- no records -> `none`
- pending records -> `pending`
- active with expired time -> `expired`
- active with future expiry -> `active`

## Admin APIs
Plans:
- `GET /api/admin/subscription-plans`
- `POST /api/admin/subscription-plans`
- `GET /api/admin/subscription-plans/:id`
- `PUT /api/admin/subscription-plans/:id`
- `DELETE /api/admin/subscription-plans/:id`
- `PUT /api/admin/subscription-plans/reorder`
- `PUT /api/admin/subscription-plans/:id/toggle`
- `PUT /api/admin/subscription-plans/:id/toggle-featured` (added)

Settings:
- `GET /api/admin/subscription-settings` (added)
- `PUT /api/admin/subscription-settings` (added)

User subscriptions:
- `GET /api/admin/user-subscriptions` (added)
- `POST /api/admin/user-subscriptions/create` (added)
- `PUT /api/admin/user-subscriptions/:id/activate` (added)
- `PUT /api/admin/user-subscriptions/:id/suspend` (added)
- `PUT /api/admin/user-subscriptions/:id/expire` (added)
- `GET /api/admin/user-subscriptions/export` (added alias)

## Notes
- Existing logic supports manual payment records and activation flow.
- Public plan response now includes normalized `id` and settings object.
