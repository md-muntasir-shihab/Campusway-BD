# QA Report - Admin Panel Fix

Date: 2026-03-04
Scope: sidebar route mapping + tab sync, alerts endpoint alignment, duplicate-key cleanup, encoding cleanup, admin overflow hardening.

## Implemented
- Route-first admin navigation is active via centralized map in `frontend/src/lib/appRoutes.ts`.
- Admin dashboard tab/query sync loop removed; legacy `?tab=` now one-time migrated to path route.
- Dashboard summary action buttons now navigate by route (`handleTabChange`) instead of local-only tab state.
- Sidebar + topbar actions now route to canonical `/_ _cw_admin_ _/*` paths (with active-state fallback by pathname).
- Added missing direct admin route entries in `frontend/src/App.tsx`:
  - `/__cw_admin__/featured`
  - `/__cw_admin__/student-dashboard-control`
  - `/__cw_admin__/live-monitor`
  - `/__cw_admin__/alerts`
  - `/__cw_admin__/contact`
  - `/__cw_admin__/file-upload`
  - `/__cw_admin__/backups`
  - `/__cw_admin__/users`
  - `/__cw_admin__/exports`
  - `/__cw_admin__/password`

## Alerts Integration
- Frontend admin alert wrappers now use canonical endpoint: `/{ADMIN_PATH}/home-alerts`.
- `AlertsPanel` migrated from raw `api.*('/alerts')` calls to shared wrappers.
- Added backend compatibility aliases for deprecated `/alerts*` routes.
- Alerts panel now has explicit load-error + retry state.

## Duplicate Key + Data Dedupe
- `adminGetUniversityCategories` now merges normalized duplicate category names and dedupes cluster groups.
- Public `getUniversityCategories` now also merges normalized duplicates.
- `UniversitiesPanel` home category options are normalized + deduped by lowercase key.
- Category option/chip keys now stable and duplicate-safe.
- Public `/universities` category option keys made deterministic.
- `StudentManagementPanel` duplicate-prone list keys were hardened with deterministic composite keys.
- Playwright console check on `/__cw_admin__/students` is now clean (no duplicate-key warning).

## Encoding Cleanup
- Removed mojibake user-visible text in:
  - `frontend/src/pages/HomeModern.tsx`
  - `frontend/src/components/admin/DashboardHome.tsx`
  - `frontend/src/pages/AdminDashboard.tsx` (corrupted comment blocks)

## Overflow Hardening
- `AlertsPanel`: mobile card rendering added; table text now wraps (`break-words`) for long title/message/schedule.
- `AdminTopbar`: dropdown widths made viewport-safe (`min(..., 100vw)`), header set `overflow-x-hidden`.
- `AdminSidebar`: existing `min-w-0`/truncate behavior retained and validated.

## Checks Run
- `npm --prefix frontend run lint` -> pass (warnings only, no errors)
- `npm --prefix frontend run build` -> pass
- `npm --prefix backend run build` -> pass

## Playwright MCP Smoke
Tested main routes:
- `/`
- `/universities`
- `/news`
- `/resources`
- `/subscription-plans`
- `/__cw_admin__/dashboard`
- `/__cw_admin__/universities`
- `/__cw_admin__/alerts`
- `/__cw_admin__/support-center`
- `/__cw_admin__/settings`
- `/__cw_admin__/settings/home-control`

Admin route/button navigation checks passed:
- Universities -> `/__cw_admin__/universities`
- Live Alerts -> `/__cw_admin__/alerts`
- Support Tickets -> `/__cw_admin__/support-center`
- Security Center -> `/__cw_admin__/settings/security-center`
- Dashboard -> `/__cw_admin__/dashboard`

Alerts functional check passed:
- Created a test alert from `/__cw_admin__/alerts` and list updated immediately.
- Support Center route mapping check passed (`/__cw_admin__/support-center`).
- Settings Center route mapping check passed (`/__cw_admin__/settings`).

Responsive 360 check (Playwright evaluate):
- `/`, `/__cw_admin__/dashboard`, `/__cw_admin__/alerts`, `/__cw_admin__/support-center`, `/__cw_admin__/settings`
- No horizontal overflow detected in tested pages.

## Remaining Observation
- Running dev server still returned `400` for `GET /api/universities?page=1&limit=36&featured=1` during home load in Playwright.
- Code-level backend fix was added to treat featured flags as truthy for `1|true|yes|on` and allow featured-mode query without mandatory category.
- If server process is long-lived, restart backend dev server to apply this controller patch.
