# ADMIN_BUG_ROOTCAUSE
Date: 2026-03-04

## Scope
Admin panel instability audit for:
- flicker on navigation
- wrong route on click
- mixed admin UI shells
- unexpected redirects
- mobile overlap/overflow

## Root Causes Found
1. Mixed admin UI shells were active at the same time.
- Evidence:
  - `frontend/src/App.tsx` routed many `/__cw_admin__/*` paths to legacy `AdminDashboardRoute`.
  - Other `/__cw_admin__/*` paths were routed to `AdminGuardShell` + `AdminShell`.
  - `/__cw_admin__/news/*` had a third custom shell (`AdminNewsConsole`).
- Impact: visible UI switching, inconsistent topbar/sidebar, perceived flicker.

2. Legacy tab-state dashboard was still acting as navigation controller.
- Evidence:
  - `frontend/src/pages/AdminDashboard.tsx` still used `forcedTab/forcedSubtab` + internal tab state.
  - Sidebar/topbar in that screen used tab-id logic.
- Impact: wrong page on click when tab IDs and routes diverged.

3. Admin navigation source-of-truth was split across files.
- Evidence:
  - route mapping in `App.tsx`
  - tab mapping in `frontend/src/lib/appRoutes.ts`
  - separate menu definitions in `AdminSidebar`, `AdminShell`, `AdminNewsConsole`
- Impact: route drift and button mismatch.

4. Legacy admin/news deep links depended on old route contract.
- Evidence:
  - e2e expectations and old links expected `/__cw_admin__/news/*` sub-sections as standalone pages.
- Impact: route mismatch after shell normalization.

5. Mobile overflow risk in subscription plan row actions.
- Evidence:
  - action group used `ml-auto` inline controls without full-width fallback on narrow screens.
- Impact: overlap/wrapping issues on 360px.

## Causes Not Found as Primary
1. Nested multiple `<BrowserRouter>` misuse: not found.
2. Basename mismatch: not found.
3. Global auth 401 infinite loop: guarded in interceptor; not primary for this incident.
4. `window.location`-driven sidebar navigation in canonical shell: not found.

## Fix Summary
1. Canonical admin route source introduced:
- `frontend/src/routes/adminPaths.ts`
- exact serial menu order and path map
- legacy admin path redirects map for compatibility

2. Admin routing normalized to one shell route family in `App.tsx`:
- dashboard/universities/news/exams/question-bank/students/student-groups/payments/resources/support now use shell-based pages.
- old tab-only admin routes redirected to canonical module routes.
- `/admin/*` kept as redirect-only compatibility.

3. Unified admin shell navigation:
- `frontend/src/components/admin/AdminShell.tsx` now uses `ADMIN_MENU_ITEMS` only.
- active state computed from canonical path matcher.
- serial menu only (no grouped categories).

4. News route compatibility stabilized:
- canonical `/__cw_admin__/news` uses unified shell.
- `/__cw_admin__/news/*` routes redirected to canonical `/__cw_admin__/news`.

5. Mobile overflow patch:
- `frontend/src/pages/AdminSubscriptionPlans.tsx` plan row now uses `min-w-0`, truncated name, wrapped action cluster.
