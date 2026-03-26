# QA_REPORT_STEP1

Date: 2026-03-03
Primary local env:
- frontend: `http://127.0.0.1:5175`
- backend API target: `http://127.0.0.1:5003`
- e2e temp env: backend `5005` + frontend `5175` (script-managed)

## Scope
- Step 1: Admin panel stabilization, settings center, live sync, admin summary coverage
- No Step 2+ redesign items included

## Automated Smoke Results
Command:
- `npm --prefix frontend run e2e:smoke -- home-master.spec.ts admin-smoke.spec.ts public-smoke.spec.ts student-smoke.spec.ts`

Observed:
- Full smoke now passes: `26/26`
- Command:
  - `npm --prefix frontend run e2e:smoke -- home-master.spec.ts admin-smoke.spec.ts public-smoke.spec.ts student-smoke.spec.ts`
- Follow-up regression run also passes:
  - `npm --prefix frontend run e2e:smoke -- admin-smoke.spec.ts home-master.spec.ts`
  - Result: `8/8` passed

Re-check highlights from automated run:
1. `/api/home` strict contract keys present
2. Home section order test passed
3. Home resources section present and services section absent on home
4. University placeholder grid class rule verified (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)
5. Admin login + tab navigation smoke passed (including security tab route)
6. Student login + dashboard/profile smoke passed

## Manual Playwright MCP Walkthrough
Visited and interacted:
- `/`
- `/universities`
- `/news`
- `/resources`
- `/contact`
- `/login`
- `/subscription-plans`
- `/admin/login`
- `/admin/settings` (unauth redirect)

Manual findings:
1. No blank page or runtime crash on tested routes
2. No console errors during public flow traversal
3. Network calls for core pages returned `200` for key endpoints:
   - `/api/settings/public`
   - `/api/home`
   - `/api/home-settings/public`
   - `/api/resources`
   - `/api/news-v2/list`
   - `/api/subscription-plans/public`
4. Admin settings route redirect works for unauthenticated state:
   - `/admin/settings` -> `/admin/login`
5. `/admin/settings/home` runtime crash fixed and verified:
   - previous error: `Cannot read properties of undefined (reading 'defaultUniversityLogo')`
   - current result: page renders fully and saves successfully
6. Live sync check verified manually:
   - updated highlighted category in `/admin/settings/home` -> saved
   - reflected on public `/` category chips

## Bug Fixes Confirmed in Step 1
1. Home highlight/featured wiring
- `highlightedCategories[]` and `featuredUniversities[]` are served from `home_settings` and consumed by home aggregate.

2. Cluster sync field mismatch fix
- cluster date sync payload now uses `commerceExamDate` consistently.

3. Settings Center introduced as categorized hub
- `/admin/settings` with 7 required categories and subroutes implemented.

4. Admin topbar + shell consistency
- dedicated admin shell components integrated for settings pages and dashboard navigation.

5. Social links global manager
- CRUD available via admin routes
- public consumption unified through settings/public payload

6. Security Center admin access
- `/api/admin/security-settings*` now accessible to `admin` and `superadmin` roles.

7. Home Settings panel defensive normalization
- Added fallback/default merge path so incomplete or partial `home_settings` documents no longer crash admin UI.

8. Auth noise cleanup for public pages
- Forced-logout alert is now shown only for active authenticated users.
- Result: logged-out public flow no longer shows stale-token session-terminated modal; `/auth/me` 401 noise removed in this flow.

## STOP-GATE Checklist (Step 1)
- [x] Admin panel routes accessible and guarded
- [x] Admin topbar visible in admin shell pages
- [x] Settings Center and required subpages exist
- [x] Home highlights reflect from admin-controlled settings
- [x] Featured universities reflect from admin-controlled settings
- [x] Social links globally controlled from admin + rendered publicly
- [x] Admin dashboard summary endpoint integrated
- [x] No blocking console/runtime errors in tested admin/public/student smoke flows

## Known Non-Blocking Notes
1. Some social links in current DB use local placeholder URLs (e.g., `http://localhost:5175/`).
- Behavior works; content should be updated through Site Settings social manager.

2. Legacy endpoints still exist for backward compatibility in parts of admin panel.
- Active Step 1 flow uses new settings center routes and home settings APIs.
