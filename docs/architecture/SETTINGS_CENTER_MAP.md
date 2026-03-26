# SETTINGS_CENTER_MAP

Date: 2026-03-03

## Settings Entry Point
- Route: `/__cw_admin__/settings`
- UI: Settings Center category grid (card-based)
- Guard: admin auth required; unauthorized users are redirected to `/__cw_admin__/login`

## Category -> Route Mapping (Implemented)
1. Home Control
- Route: `/__cw_admin__/settings/home-control`
- UI: `HomeSettingsPanel`
- Data source: `home_settings` (single-doc)
- Features:
  - section visibility toggles
  - highlighted categories (ordered)
  - featured universities (ordered + badge text)
  - per-section reset to defaults

2. Reports
- Route: `/__cw_admin__/settings/reports`
- UI host: `AdminGuardShell`
- Linked module panel: reports dashboard panel in admin shell

3. Banner Manager
- Route: `/__cw_admin__/settings/banner-manager`
- UI host: `AdminGuardShell`
- Linked module panel: banner manager panel in admin shell

4. Security Center
- Route: `/__cw_admin__/settings/security-center`
- UI host: `AdminGuardShell`
- Linked module panel: security center panel in admin shell
- Backend access: `/api/admin/security-settings*` and `/api/campusway-secure-admin/security-settings*`

5. System Logs
- Route: `/__cw_admin__/settings/system-logs`
- UI host: `AdminGuardShell`
- Linked module panel: system logs panel in admin shell

6. Site Settings
- Route: `/__cw_admin__/settings/site-settings`
- UI host: `AdminGuardShell`
- Linked module panel: site settings + global social links manager
- Global social manager fields:
  - `platformName`
  - `iconUploadOrUrl`
  - `targetUrl`
  - `description`
  - `enabled`
  - `placements[]` (`header|footer|home|news|contact`)

7. Admin Profile
- Route: `/__cw_admin__/settings/admin-profile`
- UI host: `AdminGuardShell`
- Linked module panel: admin profile panel

## Core Admin Routes (Step 1)
- `/__cw_admin__/login`
- `/__cw_admin__/dashboard`
- `/__cw_admin__/universities`
- `/__cw_admin__/news`
- `/__cw_admin__/exams`
- `/__cw_admin__/question-bank`
- `/__cw_admin__/students`
- `/__cw_admin__/subscription-plans`
- `/__cw_admin__/resources`
- `/__cw_admin__/support-center`
- `/__cw_admin__/settings`

## Route Mapping Note (2026-03-04)
- Admin navigation is route-driven using centralized path registry in `frontend/src/routes/adminPaths.ts`.
- Canonical admin UI contract is `/__cw_admin__/*` with redirect-only legacy compatibility.
- Legacy query-style tab links (`?tab=...`) are no longer used in canonical admin navigation.

## Query Invalidation and Live Sync Rules
- Home settings update/reset:
  - invalidates `['home']`, `['home-settings']`, `['home_settings']`
- Social links create/update/delete:
  - invalidates `['site-social-links']`, `['public_settings']`, `['site_settings']`, `['website-settings']`, `['home']`
- Site settings update:
  - invalidates `['public_settings']`, `['site_settings']`, `['website-settings']`, `['home']`
- Universities mutation:
  - invalidates `['universities']`, `['home']`, `['home-settings']`, `['home_settings']`
- News mutation:
  - invalidates `['news']`, `['home']`
- Exams mutation:
  - invalidates `['exams']`, `['home']`, `['student_dashboard']`
- SSE bridge:
  - `/api/home/stream` events trigger home/settings cache refresh in public + student + admin scope

## Single Source of Truth Rule
- Home and global social rendering consume backend-controlled settings only.
- News visual settings are kept under settings routes, not embedded inside public news page logic.
