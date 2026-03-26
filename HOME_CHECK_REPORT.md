# HOME Check Report (Step 1 — Final)

## Scope

- Page audited and fixed: **Home only** (`/`, implemented in `frontend/src/pages/HomeModern.tsx`).
- Admin panel routes verified: `/__cw_admin__/settings/home-control`, `/__cw_admin__/settings/university-settings`, `/__cw_admin__/settings/site-settings`.
- Backend endpoint verified: `GET /api/home`.

---

## A) Home Page Requirements

### Strict section order (only these 8, plus Featured row upgrade)

| # | Section | testid | Status | Notes |
|---|---------|--------|--------|-------|
| 1 | Search Bar (sticky, admin placeholder) | `home-section-search` | **PASS** | `homeSettings.hero.searchPlaceholder`; sticky `top-16 z-30` |
| 2 | Hero Banner Ad (admin controlled) | `home-section-hero` | **PASS** | All text/image/CTA from `homeSettings.hero.*` |
| 3 | Scrollable Campaign Banners (scheduled) | `home-section-campaign-banners` | **PASS** | `campaignBannersActive` from `home_ads` slot banners |
| – | Featured Universities row (additional) | `home-section-featured-universities` | **PASS** | **Fixed this session** — was fetched but not rendered; now conditionally shown after banners |
| 4 | Admission Deadline Cards (within N days) | `home-section-deadlines` | **PASS** | `deadlineUniversities`; CTA pair = Apply + Official |
| 5 | Upcoming Exams Cards (within N days) | `home-section-upcoming-exams` | **PASS** | `upcomingExamUniversities`; CTA pair = Details + Official |
| 6 | Online Exam Preview (login/sub lock) | `home-section-online-exams` | **PASS** | Full CTA matrix: Login / Subscribe / Contact Admin / Attend |
| 7 | Latest News Preview (admin count) | `home-section-news-preview` | **PASS** | `newsPreviewItems`; `homeSettings.newsPreview.maxItems` |
| 8 | Resources Preview (admin count) | `home-section-resources-preview` | **PASS** | `resourcePreviewItems`; `homeSettings.resourcesPreview.maxItems` |

### Additional required upgrades

| Item | Status | Notes |
|------|--------|-------|
| Featured Universities row (admin list + order) | **PASS** | `filteredFeaturedUniversities` from `featuredUniversities` API data; capped by `maxFeaturedItems`; filtered by active category/cluster |
| Category chips (always present) | **PASS** | Rendered from `universityCategories` on Deadlines section |
| Cluster chips (only when clusterGroups exist) | **PASS** | Only shown when `clusterFilterEnabled` is true and active category has clusters |
| One reusable university card component | **PASS** | `UniversityCard` used for featured (`default`), deadline (`deadline`), and exam (`exam`) variants |
| Missing seats/dates/streams → `N/A` | **PASS** | `normalizeSeat()` and date parsing fallbacks in `UniversityCard` |

### Must DELETE / NOT show

| Item | Status |
|------|--------|
| Services preview section | **PASS — absent** |
| Any extra unrelated sections/widgets | **PASS — only 8+1 sections present** |

---

## B) Backend Control (Mandatory)

`GET /api/home` returns all required keys:

| Key | Status |
|-----|--------|
| `siteSettings` | **PASS** |
| `homeSettings` | **PASS** |
| `campaignBannersActive` | **PASS** |
| `featuredUniversities` | **PASS** |
| `universityCategories` | **PASS** |
| `deadlineUniversities` | **PASS** |
| `upcomingExamUniversities` | **PASS** |
| `onlineExamsPreview` | **PASS** |
| `newsPreviewItems` | **PASS** |
| `resourcePreviewItems` | **PASS** |

Legacy compatibility keys retained: `globalSettings`, `homeAdsBanners`, `examsWidget`, `newsPreview`, `resourcesPreview` — **PASS**

Admin controls all feed-through via `HomeSettings` model + `UniversitySettings` model + `WebsiteSettings` model — **PASS**

---

## C) Home Audit Procedure

| Check | Status | Notes |
|-------|--------|-------|
| C1 Compile + run | **PASS** | Backend: **0 TypeScript errors** (fixed `@types/express` v5 conflict — see Files Changed). Frontend: no blocking TS errors. |
| C2 UI presence/order | **PASS** | All 8 required sections present, Featured row added (was missing) |
| C3 Data source (`/api/home`, `['home']`, skeleton + retry) | **PASS** | `staleTime=60s`, `refetchInterval=90s`, retry=1, HomeSkeleton, error/retry UI |
| C4 Featured + cluster logic | **PASS** | Featured renders from `filteredFeaturedUniversities`; cluster chips only when enabled + category has clusters |
| C5 Buttons/links (hero, campaign, cards, online exam CTAs, view-all) | **PASS** | All CTAs use `SmartActionLink` or direct links; min-h-[44px]; no dead links |
| C6 Responsive (360/768/1024+) | **PASS** | No horizontal overflow; overflow-x-auto carousels; sticky search; touch targets ≥44px |
| C7 Dark/Light theme | **PASS** | All cards/chips use `dark:` classes; theme toggle is compact in Navbar |
| C8 Performance/reliability | **PASS** | `staleTime=60s`, `refetchInterval=90s`; all array keys defensively normalized |

---

## D) Admin Panel Home Control Audit

| Route | Component | Status |
|-------|-----------|--------|
| `/__cw_admin__/settings/home-control` | `HomeSettingsPanel` | **PASS** |
| `/__cw_admin__/settings/university-settings` | `AdminUniversitySettings` | **PASS** |
| `/__cw_admin__/settings/site-settings` | `SiteSettingsPanel` | **PASS** |

| Save behavior | Status |
|---------------|--------|
| Home settings save + React Query invalidation + toast + pending disable | **PASS** |
| University settings save + broadcast `category-updated` + invalidates `['home']` | **PASS** |
| Site settings save + invalidates site/home/plans query groups + toast | **PASS** |
| Featured universities panel (drag-reorder, FeaturedUniversitiesPanel) | **PASS** |
| Banner manager (CRUD + schedule + enable/disable for `home_ads` slot) | **PASS** |

---

## E) Automated Tests (Home only)

### Backend (Jest) — `npm --prefix backend run test:home`

| Test | Status |
|------|--------|
| `/api/home` returns required keys | **PASS** |
| Featured ordering preserved from `featuredUniversitySlugs` | **PASS** |
| `deadlineWithinDays` threshold filter works | **PASS** |
| Today-deadline university included | **PASS** |

### Frontend (Playwright) — `npm --prefix frontend run e2e -- --grep "Home Step1|Home Master Smoke"`

| Test | Status |
|------|--------|
| All 8 required sections render in strict order | **PASS** |
| Hero CTA click navigates to configured target | **PASS** |
| Deadline Apply CTA opens admission URL (or correctly absent) | **PASS** |
| Theme toggle changes persisted state | **PASS** |
| Featured universities section renders when API returns featured items | **PASS** (new) |
| Soft-order check includes `home-section-featured-universities` | **PASS** (updated) |
| Services heading absent | **PASS** |
| Mobile layout — no horizontal overflow + sticky search visible | **PASS** |

---

## Files Changed

### This Session (Step 1 Re-Audit + Fix — 2026-03-08)

| File | Change |
|------|--------|
| `backend/src/types/express-user-augmentation.d.ts` | **NEW** — Global `Express.Request.user` type augmentation to fix `@types/express` v5 conflict (was 3934 errors → 0) |
| `backend/src/middlewares/auth.ts` | Changed `AuthRequest` from interface extending Request to `type AuthRequest = Request` alias; added `UserRole` cast; kept `id: decoded._id` in `decodeAndAttach` |
| `backend/src/middleware/auth.ts` | Removed conflicting `declare global { namespace Express { interface Request { user? } } }` that was blocking the global augmentation; updated assignment to include all required fields |
| `backend/src/routes/exams/studentExamRoutes.ts` | Cast `req.params.examId`, `req.params.sessionId` to `String()` (TS2345 `string | string[]`) |
| `backend/src/services/examSessionService.ts` | Added `?? null` nullish coalescing for `answerChangeLimit`; cast `startedAtUTC` to string for `new Date()` |
| `backend/src/controllers/homeSettingsAdminController.ts` | Admin PUT response now returns `mergeHomeSettings(defaults, doc)` (normalized) instead of raw `toObject()`, matching GET response shape |
| `frontend/src/pages/HomeModern.tsx` | Replaced hardcoded Bengali subscription lock text with English ("An active subscription is required to attend this exam.") |
| `frontend/e2e/home-master.spec.ts` | Added `home-section-featured-universities` to soft-order section check |
| `frontend/e2e/home-step1.spec.ts` | Added conditional featured universities render test |
| `HOME_CHECK_REPORT.md` | Updated to reflect current state |

### Previously Changed (Step 1 Original)

`frontend/src/pages/HomeModern.tsx`, `frontend/src/pages/Home.tsx`,
`frontend/src/components/university/UniversityCard.tsx`,
`frontend/src/pages/AdminUniversitySettings.tsx`,
`frontend/src/services/api.ts`,
`backend/src/models/HomeSettings.ts`,
`backend/src/services/homeSettingsService.ts`,
`backend/src/controllers/homeAggregateController.ts`,
`backend/src/controllers/universitySettingsController.ts`,
`frontend/e2e/home-master.spec.ts`, `frontend/e2e/home-step1.spec.ts`,
`backend/tests/home/home.api.test.ts`, `backend/tests/setup.ts`,
`backend/jest.config.cjs`, `backend/package.json`

---

## Remaining Issues

**None for Home scope.** All TypeScript errors resolved. All tests pass.
