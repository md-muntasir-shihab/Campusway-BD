# Subscription Plans Workflow

Date: 2026-03-03

## Module Goal

CampusWay uses a unified **Subscription Plans** module (replacing Services in active user/admin flows) for:
- Public plan discovery and conversion
- Student subscription status and exam access gating
- Admin plan CRUD, ordering, assignment, suspension, and export
- Home banner integration with live updates

## Primary Data Contracts

### `subscription_plans`
- `name`
- `type` (`free|paid`)
- `priceBDT`
- `durationDays`
- `bannerImageUrl`
- `shortDescription`
- `features[]`
- `tags[]`
- `enabled`
- `isFeatured`
- `displayOrder`
- `contactCtaLabel`
- `contactCtaUrl`

Backward compatibility fields are still read (`code`, `price`, `isActive`, `sortOrder`, `priority`) and normalized in API responses.

### `user_subscriptions`
- `userId`
- `planId`
- `status` (`active|expired|pending|suspended`)
- `startAtUTC`
- `expiresAtUTC`
- `activatedByAdminId`
- `paymentId`
- `notes`

`user.subscription` remains a denormalized cache for fast checks and legacy compatibility.

## Key APIs

### Public
- `GET /api/subscription-plans`
- `GET /api/subscription-plans/:id`

### Student
- `GET /api/subscriptions/me`
- `POST /api/subscriptions/:planId/request-payment`
- `POST /api/subscriptions/:planId/upload-proof`

### Admin
- `GET /api/campusway-secure-admin/subscription-plans`
- `GET /api/campusway-secure-admin/subscription-plans/:id`
- `POST /api/campusway-secure-admin/subscription-plans`
- `PUT /api/campusway-secure-admin/subscription-plans/:id`
- `DELETE /api/campusway-secure-admin/subscription-plans/:id`
- `PUT|PATCH /api/campusway-secure-admin/subscription-plans/:id/toggle`
- `PUT /api/campusway-secure-admin/subscription-plans/reorder`
- `POST /api/campusway-secure-admin/subscriptions/assign`
- `POST /api/campusway-secure-admin/subscriptions/suspend`
- `GET /api/campusway-secure-admin/subscription-plans/export`
- `GET /api/campusway-secure-admin/subscriptions/export`

### Legacy compatibility alias
- `PUT /api/campusway-secure-admin/students/:id/subscription`
  - Accepts legacy payload (`planCode`, `isActive`, `startDate`, `expiryDate`)
  - Resolves plan and delegates to canonical assignment flow
  - Preserves legacy `200` response contract

## Frontend Flow

### Public
- Route: `/subscription-plans`
  - Query key: `['public-subscription-plans']`
  - 3/2/1 responsive grid
  - Plan card with state-aware CTA (`logged out`, `active`, `expired`, `pending`, `suspended`)
- Route: `/subscription-plans/:planId`
  - Detail view for selected plan
- Legacy redirects:
  - `/pricing` -> `/subscription-plans`
  - `/services` and `/services/:slug` -> `/subscription-plans`

### Student
- Dashboard widget: "My Subscription"
  - Query key: `['subscriptions.me']`
  - Shows plan/status/expiry + renew/contact CTA
- Profile badge (active plan)

### Admin
- Route: `/admin/subscription-plans`
  - CRUD, toggle, reorder, assign, suspend, export
- Settings integration:
  - `/admin/settings/home` controls featured plan IDs for home banner
  - `/admin/settings/site` controls page title/subtitle/default banner/CTA mode

## Home Integration

- Home aggregate includes `subscriptionPlans` + `subscriptionBannerState`.
- Home settings support `subscriptionBanner.planIdsToShow`.
- Admin settings save invalidates:
  - `['public-subscription-plans']`
  - `['subscriptions.me']`
  - `['home']`

## Exam Gating Logic

- No blanket global subscription hard-lock.
- Subscription is enforced only when exam requires it (`subscriptionRequired` or allowed-plan policy).
- Responses include gate metadata (`subscriptionRequired`, `subscriptionActive`, `accessDeniedReason`).

## Security/Validation

- URL validation for banner/CTA fields.
- Guardrails: non-negative price, `durationDays > 0`.
- Role protection on admin routes.
- Rate limiters on assignment/suspension and student payment-proof paths.

## Migration Utility

Script: `backend/src/scripts/migrate-subscription-plans-v2.ts`
- Normalizes existing plans to v2 fields.
- Backfills `user_subscriptions` from legacy `user.subscription` cache where missing.

Run with:
- `npm run migrate:subscription-plans-v2` (from `backend`)
