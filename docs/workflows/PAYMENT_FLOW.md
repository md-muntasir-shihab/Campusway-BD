# PAYMENT_FLOW

Date: March 4, 2026

## Pipeline: Pending -> Admin Verify Paid -> Subscription Unlock -> Dashboard Sync

## 1) Payment Record Creation
- Admin creates pending payment:
  - `POST /api/{admin}/payments`
- Typical fields:
  - `studentId`
  - `subscriptionPlanId`
  - `entryType=subscription`
  - `amount`, `method`, `reference`, `notes`

## 2) Approval / Rejection
- Admin verifies payment:
  - `POST /api/{admin}/finance/payments/:id/approve`
  - body: `{ status: "paid" | "rejected", remarks?: string }`

When `status=paid`:
- `ManualPayment.status` updates to `paid`.
- Settlement logic activates subscription/ledger updates.
- Finance stream/dashboard summary updates.

## 3) Student Access Unlock
- Student state check:
  - `GET /api/auth/me`
- Expected after paid approval:
  - `user.subscription.isActive = true`

## 4) Admin Visibility / Reporting
- Payment list:
  - `GET /api/{admin}/payments`
- Student payment history:
  - `GET /api/{admin}/students/:id/payments`
- Export:
  - `GET /api/{admin}/payments/export`

## 5) Webhook Path (If Gateway Enabled)
- Endpoint:
  - `POST /api/payments/sslcommerz/ipn`
- Signature/replay protections are enforced.
- Event logging stored in webhook event model and finance stream.

## Phase 4 Validation Result
- Pending -> paid transition tested end-to-end.
- Subscription unlock confirmed immediately via `/api/auth/me`.
- Approved payment record confirmed in admin payment datasets.
