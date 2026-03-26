# QA Report - Subscription Plans

Date: 2026-03-03
Environment:
- Backend: `http://localhost:5003`
- Frontend (tested): `http://localhost:5176`
- Browser: Playwright Chromium (desktop + mobile where available)

## Scope Verified

- Subscription Plans public routing and build safety
- Home strict section/order contract with subscription banner present
- Admin Home settings propagation to public `/api/home`
- Legacy subscription assignment endpoint compatibility
- Logged-out subscription CTA behavior (`Contact Admin`, no forced login CTA)
- Build/lint stability after safe cleanup

## Automated Checks Run

1. Backend build
- Command: `npm run build` (backend)
- Result: PASS

2. Frontend lint
- Command: `npm run lint` (frontend)
- Result: PASS (warnings only, no errors)

3. Frontend build
- Command: `npm run build` (frontend)
- Result: PASS

4. E2E fixture prep
- Command: `npm run e2e:prepare` (backend)
- Result: PASS

5. Home contract/order regression suite
- Command:
  - `npx playwright test e2e/home-master.spec.ts e2e/step2-core.spec.ts --grep "api/home contract|home sections render|admin highlighted \+ featured updates"`
- Result: PASS (6 passed)
- Assertions covered:
  - `/api/home` strict top-level keys
  - Home section ordering (including subscription banner, resources, no Services heading)
  - Admin `/settings/home` reflected in `/api/home` immediately

6. Legacy subscription assignment compatibility
- Command:
  - `npx playwright test e2e/finance-support-critical.spec.ts --grep "admin creates student account and assigns subscription plan"`
- Initial result: FAIL (404)
- Fix applied:
  - Added `PUT /api/campusway-secure-admin/students/:id/subscription` compatibility route
  - Added legacy assignment handler mapping old payload to canonical assignment
  - Preserved legacy `200` response contract
- Re-run result: PASS (desktop); mobile project intentionally skipped by suite config

## Manual/HTTP Smokes

1. Public subscription page reachable
- Check: `GET http://localhost:5176/subscription-plans`
- Result: HTTP 200

2. Public subscription API reachable
- Check: `GET http://localhost:5003/api/subscription-plans`
- Result: HTTP 200

3. Legacy endpoint existence
- Check: authenticated `PUT /api/campusway-secure-admin/students/:id/subscription`
- Result: Returns validation response (route exists, no 404)

## Issues Found and Resolved

1. Legacy admin subscription update route missing
- Symptom: E2E expected endpoint returned `404`
- Resolution: Added compatibility route + mapping handler

2. Legacy status code mismatch
- Symptom: E2E expected `200`, received `201`
- Resolution: Conditional response status for legacy path preserved as `200`

3. Logged-out subscription CTA required admin contact (not login)
- Symptom: Logged-out plans flow still showed `Login to Subscribe` in public cards/banner.
- Resolution: Updated public subscription page and home subscription banner to show contact-first messaging and CTA (`/contact`), plus default settings moved to contact mode.

## Remaining Notes

- Lint has non-blocking warnings for unused `eslint-disable` comments in unrelated files.
- Legacy service API exports remain in place intentionally for safe backward compatibility during transition.

## Acceptance Snapshot

- Services-facing page components removed from active app flow.
- Subscription Plans routes and admin controls are active.
- Home + admin settings integration checks are passing.
- Builds and lint are green (with warnings only).
