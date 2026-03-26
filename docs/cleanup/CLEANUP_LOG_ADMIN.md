# CLEANUP_LOG_ADMIN
Date: 2026-03-04

## Goal
Admin stability cleanup without destructive removal of uncertain legacy modules.

## Safe Cleanup Applied
1. Route cleanup (non-destructive)
- Removed legacy `AdminDashboardRoute` usage from `frontend/src/App.tsx`.
- Replaced route targets with canonical shell pages:
  - dashboard, universities, news, exams, question-bank, students, student-groups, payments, resources, support-center.

2. Legacy route compatibility retained via redirect
- `/admin/*` -> `/__cw_admin__/*` (existing compatibility kept).
- legacy admin module paths under `/__cw_admin__/...` now redirect to canonical pages via `LEGACY_ADMIN_PATH_REDIRECTS`:
  - featured, student-dashboard-control, live-monitor, alerts, contact, file-upload, backups, users, exports, password, security, audit.

3. Navigation source consolidation
- Added `frontend/src/routes/adminPaths.ts` as path registry.
- Updated `AdminShell` to read from a single serial menu registry.

4. News route contract cleanup
- canonical page: `/__cw_admin__/news`
- nested legacy news paths redirected to canonical news page.

## Files Not Deleted (Intentional)
1. `frontend/src/pages/AdminDashboard.tsx`
2. `frontend/src/components/admin/AdminSidebar.tsx`
3. `frontend/src/components/admin/AdminTopbar.tsx`
4. `frontend/src/pages/admin-news/AdminNewsConsole.tsx`

Reason:
- Existing worktree is heavily modified.
- Kept for rollback safety and to avoid accidental deletion of in-progress logic.
- Not used by canonical admin routes after this patch.

## Verification
1. `npm --prefix frontend run build` passed.
2. `npm --prefix backend run build` passed.
3. Admin route smoke specs passed after route updates:
  - `frontend/e2e/news-admin-routes.spec.ts`
  - `frontend/e2e/runtime-flags.spec.ts`
