# QA_REPORT_PHASE1

Date: 2026-03-03

## Scope
Phase 1 validation for global theme system (light/dark/system), tokenized styles, core UI theming, navbar/theme-toggle stability, and page-level visual health.

## C1 Static Pack
- `npm --prefix frontend run lint` => PASS (5 warnings, 0 errors)
- `npm --prefix frontend run build` => PASS
- `npm --prefix backend run build` => PASS

## C2/C3 Smoke Evidence
Executed with seeded smoke runner (`npm --prefix frontend run e2e:smoke -- ...`):
- `--project=chromium-desktop --grep "Home Master Smoke"` => PASS (3/3)
- `--project=chromium-desktop --grep "Admin Responsive Matrix"` => PASS (4/4)
- `--project=chromium-mobile --grep "Admin Responsive Matrix"` => PASS (4 skipped by test design)
- `--project=chromium-desktop --grep "Public Design Visibility"` => PASS (3/3)
- `--project=chromium-desktop --grep "Public Smoke"` => PASS (10/10)
- `--project=chromium-desktop --grep "Student Smoke"` => PASS
- `--project=chromium-desktop --grep "Admin Smoke"` => PASS (after selector hardening)

## Stop-Gate Checklist

### P1.0 Baseline Theme Strategy
- [x] `html.dark` class-based dark mode active.
- [x] `light | dark | system` modes active.
- [x] `localStorage["campusway_theme"]` used.
- [x] First-load behavior resolves saved mode, else system.
- [x] Compact icon-only toggle (`h-8 w-8`) on public navbar, student header, admin topbar/shell.
- [x] Reload persistence validated by automated test (`Public Design Visibility`: theme persistence test).

### P1.1 Theme Tokens
- [x] Single token source defined in `frontend/src/styles/theme.css`.
- [x] Required vars present: `--bg --surface --surface2 --text --muted --border --primary --primaryFg --danger --warning --success --shadowColor`.
- [x] Legacy `--color-*` aliases preserved for migration.
- [x] Utility helpers present: `.cw-bg .cw-surface .cw-text .cw-muted .cw-border`.
- [x] Premium dark surface (not pure black) verified.

### P1.2 Global Component Theming
- [x] Button variants standardized in `frontend/src/styles/index.css`.
- [x] Card baseline (`rounded-2xl`, tokenized border/surface/shadow).
- [x] Form controls tokenized with visible focus.
- [x] Table/overflow responsiveness validated by responsive suite.

### P1.3 Typography & Rich Content
- [x] News/public content rendering healthy on both themes (`/news` coverage via public smoke + design visibility).

### P1.4 Known UI Bugs
- [x] Student avatar round fix enforced (`rounded-full aspect-square object-cover`) in student header/navbar.
- [x] Theme toggle compacted and deduplicated in core nav shells.
- [x] Navbar/topbar persistence validated through route transition suites.

### P1.5 Theme QA Matrix
Widths validated:
- [x] `360px`
- [x] `768px`
- [x] `1024px`
- [x] `1440px`

Required routes (both themes covered by combined smoke + theme toggle/persistence flow):
- [x] Public `/`
- [x] Public `/universities`
- [x] Public `/news`
- [x] Public `/subscription-plans`
- [x] Student `/login`
- [x] Student `/dashboard`
- [x] Admin `/admin/login`
- [x] Admin `/admin/dashboard`

## Issues Fixed During QA
- Fixed API base bypass in `adminGetStudents` by changing hardcoded `'/admin/students'` to `/${ADMIN_PATH}/students`.
- Hardened flaky admin smoke selector (`Security Center` heading strict-mode collision).
- Added stable theme toggle test id usage and persistence regression coverage.
- Extended public smoke route list to include strict Phase-1 required routes.

## Residual Notes
- Lint has 5 non-blocking warnings (unused eslint-disable directives) unrelated to Phase 1 functionality.
- Mobile admin responsive project run is intentionally skipped by spec logic; desktop matrix includes explicit 360 viewport coverage.
