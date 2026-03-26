# QA_REPORT_ADMIN_STABILITY
Date: 2026-03-04

## Scope
- Admin route stability and click navigation consistency
- Single admin layout enforcement
- Minimal serial sidebar menu
- Responsive behavior and overflow fixes
- Admin profile route accessibility

## Environment
- Frontend: `npm --prefix frontend run build` (passed)
- Backend: `npm --prefix backend run build` (passed)
- Lint: `npm --prefix frontend run lint` (passed with warnings only, 0 errors)

## Route/Navigation Verification
1. Canonical admin base
- `"/__cw_admin__/*"` used as primary admin route contract.
- `/admin/*` remains redirect-only compatibility.

2. Sidebar menu order (serial, no nested groups)
- Dashboard
- Home Control
- Site Settings
- Banner Manager
- Universities
- News
- Exams
- Question Bank
- Students
- Student Groups
- Subscription Plans
- Payments
- Resources
- Support Center
- Reports
- Security Center
- System Logs
- Admin Profile

3. Wrong-page-on-click regression
- Fixed by central path registry in `frontend/src/routes/adminPaths.ts`.
- `AdminShell` active state now path-driven (`isAdminPathActive`), not legacy tab-state.

## Functional Checks
1. Admin profile click
- Topbar avatar action now routes to `"/__cw_admin__/settings/admin-profile"` from canonical path map.

2. Legacy route stability
- legacy admin module routes map to valid canonical pages via `LEGACY_ADMIN_PATH_REDIRECTS`.
- no dead route bounce observed in route smoke tests.

3. News route contract
- canonical page: `"/__cw_admin__/news"`.
- legacy nested news routes redirect to canonical news page.

## Responsive and Overflow Checks
1. Admin shell
- single sticky topbar + drawer sidebar behavior retained.
- menu uses truncation and min-width guards.

2. Subscription plan list row
- long names truncated safely.
- action buttons wrap on small widths instead of overlapping.
- currency text encoding corrected (`৳`).

## Automated Test Evidence
1. Full selected admin-related e2e run:
- command:
  - `npm --prefix frontend run e2e -- --project=chromium-desktop --grep "Admin Smoke|admin"`
- result:
  - 19 passed, 2 failed initially (stale route assumptions in tests).

2. Patched route-aware tests and re-ran:
- command:
  - `npm --prefix frontend run e2e -- --project=chromium-desktop frontend/e2e/news-admin-routes.spec.ts frontend/e2e/runtime-flags.spec.ts`
- result:
  - 3 passed, 0 failed.

## Residual Notes
1. Legacy components/files kept on disk for rollback safety but no longer used by canonical admin routes.
2. Lint warnings are non-blocking and unrelated to admin route stability regression.
