# Debug Report — 2026-08-30

Full-stack diagnostic pass over the monorepo (typecheck, lint, build, unit tests) with fixes for everything that was demonstrably broken in-repo.

---

## Summary

| Check | Before | After |
|---|---|---|
| Backend `npm ci` | ❌ fails (lockfile out of sync) | ✅ fixed |
| Backend build / typecheck | ✅ | ✅ |
| Backend tests | 718 pass / 84 files fail — **all** `ECONNREFUSED 127.0.0.1:27017` (no MongoDB available; documented below) | unchanged (environmental) |
| Frontend build | ✅ | ✅ |
| Frontend lint / typecheck | ✅ (0 errors) | ✅ (0 errors) |
| Frontend unit tests | ❌ **hangs forever** — CI job ran 6h0m and was killed (see CI run 30189048049); never prints a summary | ✅ completes in ~5 min: **795 passed / 33 failed** across 82 files |

---

## 1. CI-killer fixed: frontend test suite hung forever

**Symptom:** `npx vitest run` never finished — locally or on GitHub Actions. The last CI run on `main` shows `Frontend Tests in 6h0m16s` (killed by the job timeout). Root cause chain, found by per-file bisection + V8 profiling + console-trace:

**Culprit file:** `frontend/src/__tests__/properties/uiAccessBugCondition.prop.test.tsx`

Two independent defects in that file combined into the hang:

1. **Infinite redirect loop in Test 4.** `ProtectedRoute` was rendered *bare* inside `<MemoryRouter>` (no `<Routes>`). When unauthenticated, the component renders `<Navigate to="/login?returnTo=…">`; because no `<Route>` boundary ever unmounts it, every redirect re-renders the *same* instance, recomputes `returnTo` from the new location (`/login?returnTo=%2Flogin…`), and navigates again — an endless `Maximum update depth exceeded` loop (verified via `--disable-console-intercept`; the worker spends its life blocked writing the error flood to the pipe, which is why the run produced no output and no timeout — see `frontend/vitest.config.ts` history and the CPU profile taken during the wedge: 88% of ticks in `_IO_fwrite`/`__write`, main thread idle).
   **Fix:** mount `ProtectedRoute` under `<Routes>` with explicit `/exams` and `/login` routes, exactly as the app does, so the redirect unmounts it.

2. **Fake-timer fragility in Test 1.** `vi.useFakeTimers({ shouldAdvanceTime: true })` + `vi.advanceTimersByTime(12_000)` around the *real* `AuthProvider` also wedged the worker (all tests completed but results never reached the reporter and the process never exited).
   **Fix:** drop fake timers entirely and poll the real 6 s bootstrap deadline with `waitFor(..., { timeout: 12_000 })` (test-level timeout 20 s).

After both fixes the file completes in ~11 s and the whole suite runs to completion.

## 2. Playwright test in the vitest glob (crashed every run)

`frontend/src/__tests__/e2e/authSessionPersistence.test.ts` imports `@playwright/test`, so vitest crashed on it with *"Playwright Test did not expect test.describe() to be called here"* in every run. The file's own header said it belongs in `frontend/e2e/`.
**Fix:** moved to `frontend/e2e/auth-session-persistence.spec.ts` (matches `playwright.config.ts` `testDir: './e2e'` and the other e2e specs' naming); header command examples updated.

## 3. Orphaned QA suites that can never run

15 committed test files (`src/__tests__/qa-properties/*`, `src/__tests__/qa-audit-bug-conditions.test.ts`) import helpers from `frontend/qa/` (`qa/helpers/api-client`, `qa/types`, …) — but the root `.gitignore` ignores `qa/` and `**/qa/`, so `frontend/qa/` was **never committed**. Every checkout (including CI) fails these suites at import resolution.
**Fix:** excluded them from the vitest globs (`vitest.config.ts`), with a comment explaining why. Long-term: either commit the `qa/` helpers or delete the suites.

## 4. Backend lockfile out of sync (`npm ci` broken)

`backend/package-lock.json` was missing entries required by `package.json` (`gcp-metadata`, `gaxios`, `node-fetch`, `https-proxy-agent`, `agent-base`, `debug`), so `npm ci` failed with `EUSAGE`. CI masks this because its jobs use `npm install`, but `npm ci` (reproducible installs) and `docker-compose.yml:83`-style flows break.
**Fix:** regenerated with `npm install`; `npm ci --dry-run` now passes.

## 5. Real app bug: crash in Written Grading console

`frontend/src/pages/admin/exam-center/WrittenGradingInterface.tsx` did `setResults(data)` and then `for (const r of results)` — a non-array API payload threw `TypeError: results is not iterable` as an **unhandled** exception (surfaced by the test suite).
**Fix:** `const list = Array.isArray(data) ? data : []` + `(r.answers ?? [])` guards.

---

## Remaining failures (pre-existing, product-level — not addressed here)

The 33 remaining test failures fall into clear groups; CI runs tests with `continue-on-error: true`, so these were already red before this pass:

- **Bug-condition suites that intentionally fail on unfixed product behavior** — `uiAccessBugCondition.prop.test.tsx` (3 of 5 tests: navbar login button while loading, admin-guard timeout, public `/exams` access) and its companion `uiAccessPreservation.prop.test.tsx`. These assert *product changes* (public exam browsing, login affordance during bootstrap) that haven't been implemented yet.
- **UI drift** — `UniversityCard.*` (3 files), `DeadlineCard.property`, `CategoryBadgeTruncation.property`, `HomeSettingsPanel.toggles`, `BulkImportModal`, `QuestionFormModal.property` (missing `useCheckDuplicate` mock export), `vanta-hero-banners`, `tokenRefresh` (interceptor call-shape mismatch), `WrittenGradingInterface` (XSS-sanitization assertion).
- Each needs a product decision (fix component vs update test) — listed here so they can be triaged.

## Backend tests need a MongoDB (environmental)

`backend/vitest.setup.ts` deliberately replaces `mongodb-memory-server` with a stub that requires either `MONGODB_URI` or a local `mongod` on `127.0.0.1:27017`. This sandbox has neither (MongoDB's CDN is unreachable, no apt package), so the 84 DB-backed files fail with `ECONNREFUSED` — expected, not a code defect. With a database present (`MONGODB_URI=… npx vitest run`) they run normally; non-DB tests pass either way (718 passing here).

## Verification

```
backend    npm ci                ✅
backend    tsc --noEmit + build  ✅
frontend   tsc -b + vite build   ✅
frontend   eslint .              ✅ 0 errors (8 pre-existing warnings)
frontend   vitest run            ✅ completes: 795 passed / 33 failed (14 files), ~5 min
```
