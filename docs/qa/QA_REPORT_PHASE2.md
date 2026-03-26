# QA_REPORT_PHASE2

Date: 2026-03-03

## Scope
Phase 2 validation for admin routing stability, shared admin shell behavior, settings center ownership, UI-field binding traceability, React Query sync, and removal of duplicate/broken controls.

## C1 Static Pack
- `npm --prefix frontend run lint` => PASS (warnings only)
- `npm --prefix frontend run build` => PASS
- `npm --prefix backend run build` => PASS

## C3 + Admin Stability Smoke
Executed:
- `npm --prefix frontend run e2e:smoke -- --project=chromium-desktop --grep "Admin Responsive Matrix"` => PASS
- `npm --prefix frontend run e2e:smoke -- --project=chromium-desktop --grep "Admin Smoke"` => PASS

## P2 Stop-Gate Checklist

### P2.0 Admin Routing & Stability
- [x] Canonical `/admin/*` route tree active in app router.
- [x] Legacy `/campusway-secure-admin` route compatibility redirect retained.
- [x] Not-logged-in -> `/admin/login` enforced in guard shell.
- [x] Wrong role -> `/admin/access-denied` enforced.
- [x] Refresh/direct-entry route stability verified in responsive/admin smoke suites.

### P2.1 Admin Layout
- [x] Shared admin shell/guard components in place (`AdminGuardShell`, `AdminShell`) with sticky topbar + sidebar behavior.
- [x] Compact theme toggle in admin top bars.
- [x] Mobile drawer trigger and desktop fixed navigation validated through responsive matrix.

### P2.2 Settings Center
- [x] `/admin/settings` hub implemented with required category cards.
- [x] Required subroutes active:
  - `/admin/settings/home-control`
  - `/admin/settings/site-settings`
  - `/admin/settings/banner-manager`
  - `/admin/settings/security-center`
  - `/admin/settings/system-logs`
  - `/admin/settings/reports`
  - `/admin/settings/admin-profile`
- [x] Legacy settings aliases redirected to canonical paths.

### P2.3 Line-by-Line Connection
- [x] Typed registry implemented: `frontend/src/lib/adminBindings.ts`.
- [x] Documentation delivered: `ADMIN_BINDINGS_MAP.md`.
- [x] Required domains mapped (branding, social, defaults, home control, plans, news/rss/ai/share, exam gating, students/groups/import, support unread, security/logs).
- [x] Unmappable duplicate UI removed (`Quick Social URL Map`).

### P2.4 React Query Sync
- [x] Central key registry implemented: `frontend/src/lib/queryKeys.ts`.
- [x] Invalidation groups defined for home/site/social/news/plans/university saves.
- [x] Core admin modules wired to query keys + invalidations.

### P2.5 Broken Control Removal
- [x] Inventory delivered: `SETTINGS_INVENTORY.md`.
- [x] Duplicate social URL control removed from site settings panel.
- [x] Single-writer pattern retained via Social Links Manager CRUD.

## P2.6 Admin QA Micro Tests (Executed)

### Required save-flow evidence
- [x] Site Settings save + public reflection:
  - `Admin Phase2 Micro Saves` test `site settings save reflects on public settings payload` PASS
- [x] Home Control save + public reflection:
  - `Admin Phase2 Micro Saves` test `home control toggle save reflects on /api/home` PASS
  - `Step 2 Core Pack` home highlighted/featured sync PASS
- [x] News Sources save:
  - `Admin Phase2 Micro Saves` test `news source save reflects on public sources list` PASS
- [x] Subscription Plan create:
  - `Admin Phase2 Micro Saves` test `subscription plan create ...` PASS
  - `Finance + Support Critical Flows` plan create flow PASS
- [x] Support Center unread simulation:
  - `Admin Phase2 Micro Saves` creates student ticket + checks summary unread count progression PASS
  - `Finance + Support Critical Flows` support ticket create/update/reply PASS

### Theme + responsive evidence for admin pages
- [x] 360/768/1024/1440 viewport matrix validated (`Admin Responsive Matrix`).
- [x] Admin routes include required settings/news/support/plans pages.
- [x] Theme toggle presence validated in admin shell/topbar routes.

## Additional API/Contract Deliverable
- [x] `API_CONTRACT.md` updated to admin-used endpoint scope.

## Notes
- One flaky admin heading locator issue was fixed in `frontend/e2e/admin-smoke.spec.ts` by selecting `.first()`.
- Non-blocking lint warnings remain unrelated to admin behavior.
