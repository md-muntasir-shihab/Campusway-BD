# Cleanup Report - Admin UI

Date: 2026-03-04
Scope: safe cleanup for admin stability patch.

## Removed / Replaced Dead Patterns
1. Alerts dead direct calls removed from `frontend/src/components/admin/AlertsPanel.tsx`
- Removed direct endpoints:
  - `/${ADMIN_PATH}/alerts`
  - `/${ADMIN_PATH}/alerts/:id`
  - `/${ADMIN_PATH}/alerts/:id/publish`
- Replaced with shared API wrappers:
  - `adminGetAlerts`
  - `adminCreateAlert`
  - `adminUpdateAlert`
  - `adminPublishAlert`
  - `adminDeleteAlert`

2. Query-parameter tab sync churn retired in `frontend/src/pages/AdminDashboard.tsx`
- Removed legacy behavior where tab state attempted to continuously mirror URL query.
- Kept one-time legacy migration (`?tab=...`) -> canonical path.

## Compatibility Kept (Safe)
- Backend alias routes kept for deprecated admin alerts path:
  - `/alerts`
  - `/alerts/:id`
  - `/alerts/:id/toggle`
  - `/alerts/:id/publish`
- Legacy aliases are explicitly marked transitional; canonical path remains `/home-alerts`.

## Not Deleted in This Patch
- No major file deletions were done in this pass to avoid accidental breakage in dirty worktree.
- Changes are focused on behavior corrections and endpoint alignment only.
