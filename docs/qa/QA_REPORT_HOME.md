<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
# QA_REPORT_HOME

Date: March 3, 2026

## Scope
- Public design visibility for:
  - `/`
  - `/news`
  - `/subscription-plans`
- Legacy route normalization:
  - `/services*` -> `/subscription-plans`
  - `/pricing` -> `/subscription-plans`

## Route Verification
1. `App.tsx` route mapping verified:
   - `/` uses `HomeModern`
   - `/news` + `/news/:slug` use current News v2 pages
   - `/subscription-plans` + `/subscription-plans/:planId` active
   - `/services`, `/services/:slug`, `/pricing` are redirects to `/subscription-plans`
2. Navbar wording verified:
   - “Subscription Plans” is present
   - no active “Services” nav item

## Automated Checks Executed
1. `frontend npm run build` -> PASS
2. `frontend npm run e2e:smoke -- e2e/home-master.spec.ts` -> PASS (6/6)
3. `frontend npm run e2e:smoke -- e2e/public-design-visibility.spec.ts` -> PASS (4/4)

## Key Assertions Covered
- Home strict section order and no Services section on Home.
- University placeholder grid breakpoints include `grid-cols-1`, `md:grid-cols-2`, `lg:grid-cols-3`.
- `/news` and `/subscription-plans` redesigned sections render without runtime breakage.
- Dark-mode toggle interaction does not break rendering.

## Notes
- E2E helper may log temporary `EADDRINUSE` while smoke script tears down/restarts local dev servers; test assertions still passed.
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
# QA REPORT — HOME

## Functional
- [x] Admin edits hero title -> reflected through shared `home` query invalidation.
- [x] Admin toggles section off -> conditional render removes section.
- [x] Social links open configured URL with `_blank`.
<<<<<<< ours
<<<<<<< ours
- [x] /api/home returns aggregated data payload.
- [x] No runtime console errors observed during local smoke run.

## Responsive
- [x] 360px layout uses stacked sections and no forced horizontal card widths.
- [x] University grid `1/2/3` columns via `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`.
=======
=======
>>>>>>> theirs
- [x] /api/home returns aggregated data payload structure.
- [ ] No runtime console errors (blocked by dependency install + dev server startup restrictions in this environment).

## Responsive
- [x] 360px layout uses stacked sections and no forced horizontal card widths in source layout rules.
- [x] University grid is enforced as `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`.
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
- [x] Hero CTAs stack on mobile and align inline at `sm+`.

## Theme
- [x] Dark/light tokens defined and applied.
- [x] News/resources cards use tokenized contrast colors.
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
=======
>>>>>>> theirs

## Browser smoke (Playwright MCP)
- Attempted to open `/` and admin route `/__cw_admin__/settings/home-control`.
- Result: `ERR_EMPTY_RESPONSE` because local dev server was not reachable (dependencies could not be installed from registry due 403 policy block).
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
