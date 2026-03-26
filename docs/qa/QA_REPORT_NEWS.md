# QA_REPORT_NEWS

Date: 2026-03-05

## Scope
News module hardening validation for:
- backend contract aliases
- admin route consistency
- public fallback behavior
- query invalidation freshness

## Build Results
- Frontend build: `npm --prefix frontend run build` -> PASS
- Backend build: `npm --prefix backend run build` -> FAIL (pre-existing global TypeScript/AuthRequest incompatibilities not specific to news module)

## Contract/Behavior Checks
- [x] `/api/news/settings` returns `pageTitle/pageSubtitle` and `newsPageTitle/newsPageSubtitle`
- [x] News item outputs include `coverSource` alias with existing `coverImageSource`
- [x] News item outputs include `isAiSelected` alias with existing `aiSelected`
- [x] `/__cw_admin__/news/sources` is primary UI route
- [x] Legacy `/__cw_admin__/news/rss-sources` remains parse-compatible
- [x] Admin sidebar includes direct links for `rejected` and `ai-selected`
- [x] Mutation invalidation expanded for `newsList/newsDetail/newsSources/adminNews*`
- [x] Public settings client normalizes title/subtitle aliases
- [x] Public image fallback honors `coverImageSource` and `coverSource`
- [x] Admin AI toggle uses `aiSelected` or `isAiSelected` safely

## Responsive/Theme Matrix
- [ ] 360 manual click-through (all visible controls)
- [ ] 768 manual click-through
- [ ] 1024 manual click-through
- [ ] 1440 manual click-through
- [ ] Dark/light visual sign-off screenshots

## Runtime/Console
- [ ] Full Playwright deep smoke pending this pass
- [ ] Console error sweep pending this pass

## Known Blockers / Dependencies
- Backend TypeScript baseline has cross-module type conflicts (`AuthRequest` vs Express `Request`) causing build failure.
- These errors are outside the news hardening scope and must be resolved to produce a full backend green build.

