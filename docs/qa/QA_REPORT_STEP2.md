# QA_REPORT_STEP2

Date: March 3, 2026

## Scope
Step 2 core fix pack verification:
- University responsiveness + cluster logic
- Admin->Home live sync (highlighted categories + featured universities)
- Exam login/subscription gating (backend enforced)
- Question Bank BN/EN + responsive admin UI
- Student dashboard live alerts
- React Query invalidation freshness

## Bugs Found And Fixed
1. Cluster filtering was `clusterId`-centric and not reliably `clusterGroup` aware.
- Fixes:
  - Added `clusterGroup` to university model + indexes.
  - Added `clusterGroup` filtering path in `GET /api/universities`.
  - Added `clusterGroup` in Home aggregate filters metadata and preview items.
  - Cluster assign/detach flows now keep `clusterGroup` synchronized.

2. Home highlighted categories were not ordered first consistently.
- Fixes:
  - Home aggregate now reorders category tabs with highlighted categories first by configured order.
  - Featured universities hydration/ordering in `/api/home` retained and verified.

3. Exam access policy was not fully middleware-enforced across exam-critical endpoints.
- Fixes:
  - Added `requireAuthStudent` and `requireActiveSubscription` middleware.
  - Applied to start/question/answer/submit and related runtime attempt endpoints.
  - Frontend route guard updated for `/exams`, `/exam/:id`, `/exam/take/:id`, `/exam/result/:id`.

4. Question Bank lacked persisted bilingual contract in practical flow and responsive editor behavior needed hard proof.
- Fixes:
  - Extended schema + normalization for bilingual fields:
    - `questionText.en/bn`
    - `optionsLocalized[].text.en/bn`
    - `explanationText.en/bn`
    - `languageMode`
  - Retained legacy field compatibility.
  - Admin UI language mode switch implemented (`EN|BN|BOTH`) with responsive list/editor behavior.

5. Student dashboard lacked dedicated typed live alerts endpoint + module.
- Fixes:
  - Added `GET /api/student/live-alerts`.
  - Added typed categories:
    - `exam_soon`, `application_closing`, `payment_pending`, `result_published`
  - Added responsive live-alert cards module in student dashboard.

6. Mutation freshness was inconsistent in some admin flows.
- Fixes:
  - Normalized invalidations in home settings, university mutations, subscription mutations, question bank mutations.

## Verification Evidence

### Build
- `npm --prefix backend run build` -> PASS
- `npm --prefix frontend run build` -> PASS

### E2E Smoke (Step 2)
Command executed:
- PowerShell:
  - `$env:E2E_REUSE_EXISTING='false'`
  - `$env:E2E_BACKEND_PORT='5020'`
  - `$env:E2E_FRONTEND_PORT='5200'`
  - `$env:E2E_BASE_URL='http://127.0.0.1:5200'`
  - `npm --prefix frontend run e2e:smoke -- step2-core.spec.ts`

Result:
- `6 passed (desktop + mobile)`
- Covered tests:
  - Admin highlight/featured -> `/api/home` reflects updates immediately.
  - Exam gating:
    - unauth direct exam route redirects to login.
    - unsubscribed exam API access returns `403` with `subscriptionRequired: true`.
  - Question bank BN/EN create/readback + responsive admin list/editor behavior.

### Endpoint Proof Notes
Observed during smoke runs:
- `GET /api/home` -> 200
- `PUT /api/{admin}/settings/home` -> 200
- `GET /api/student/live-alerts` -> 200
- `GET /api/exams` for unsubscribed student -> 403 (subscriptionRequired)
- `POST /api/{admin}/question-bank` -> 201
- `GET /api/{admin}/question-bank/:id` -> 200 with bilingual payload available

## Responsive/Grid Proof Notes
- University grid implementation is fixed to strict classes:
  - `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
  - Applied in reusable `UniversityGrid` and used by Home + Universities page.
- No mobile horizontal overflow regressions detected in Step 2 smoke flow.

## Files Added/Updated For Step 2 QA Output
- `QA_REPORT_STEP2.md` (this file)
- `API_CONTRACT.md` (Step 2 endpoint/contract updates)
- `RUN_CHECKLIST.txt` (Step 2 run/check commands)
- `frontend/e2e/step2-core.spec.ts` (required Step 2 smoke coverage)

## Final Stop-Gate Status
- University 3/2/1 grid rule: PASS (implementation fixed and reused)
- Cluster filtering contract (`clusterGroup`) path: PASS
- Home highlights + featured live sync: PASS
- Question bank BN/EN + responsive admin workflow: PASS
- Student live alerts responsive module: PASS
- Exam login/subscription lock (backend enforced): PASS
- Step 2 smoke + builds: PASS
