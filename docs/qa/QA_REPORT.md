# QA_REPORT

Date: March 2, 2026
Workspace: `f:\CampusWay`

## 1) Verification Commands Executed
- `backend`: `npm run build`
- `frontend`: `npm run build`
- `backend`: `npm run test:qbank:unit`
- `backend`: `npm run test:qbank:integration`
- `frontend`: `npm run e2e:smoke`

## 2) Test Results (Latest)
- Playwright smoke: **40 passed, 20 skipped, 0 failed**
- Exam flow (desktop + mobile): **passed**
- Build status:
  - Backend build: **PASS**
  - Frontend build: **PASS**
- Backend qbank scripts:
  - Unit: **PASS**
  - Integration smoke: **PASS**

## 3) Root Causes Fixed in This Stabilization Pass
- E2E runner reliability:
  - switched default host to `127.0.0.1`
  - disabled implicit server reuse unless explicitly requested
  - improved Windows cleanup using `taskkill /T /F`
- Auth/2FA hardening:
  - removed login/OTP bypass behavior in auth controller
- Exam result persistence safety:
  - added index remediation on startup to remove legacy uniqueness conflict and enforce `(exam, student, attemptNo)` uniqueness
- Admin restore permission mismatch:
  - backup restore route aligned to allow `admin` and `superadmin` with backup permission
- Student login E2E selector stability:
  - updated login CTA labeling
- Playwright flakiness reduction:
  - forced single worker and serialized run for smoke
- Exam submit/result flow:
  - hardened submit navigation to result page using deterministic redirect
  - inactive post-submit anti-cheat event endpoint now returns no-op `200` (prevents normal-flow 404)
- Mongoose schema warning cleanup:
  - removed redundant duplicate index declarations (`user_id`, `userId`, `slug`) across affected models

## 4) Acceptance Criteria Mapping (A-I)
- A) No console errors in tested smoke flows: **PASS**
- B) No API 404/500 in normal login/news/exam smoke flow: **PASS**
- C) Exam lifecycle (start/autosave/submit/result path) in E2E: **PASS**
- D) News module responsive render + data load + admin/public route checks: **PASS (smoke scope)**
- E) Admin panel route/control stability in smoke: **PASS (smoke scope)**
- F) Student dashboard/profile/exam history gating path in smoke: **PASS (smoke scope)**
- G) Payment dashboard auto-sync: **covered by existing module wiring; no new regression seen in smoke**
- H) React Query invalidation/no stale critical view in audited flows: **PASS (smoke scope)**
- I) Production builds + deploy docs prepared: **PASS**

## 5) Residual Risks / Follow-ups
- Frontend bundle is still large (`dist/assets/index-*.js` ~2.4MB uncompressed); optimization plan documented in `PERFORMANCE_A11Y_REPORT.md`.

## 6) Artifacts Delivered
1. `QA_REPORT.md`
2. `RUN_CHECKLIST.txt`
3. `ADMIN_GUIDE.txt`
4. `API_CONTRACT.md`
5. `EXAM_FLOW.md`
6. `NEWS_WORKFLOW.md`
7. `PROFILE_SCORE.md`
8. `PAYMENT_FLOW.md`
9. `RESPONSIVE_MATRIX.md`
10. `PERFORMANCE_A11Y_REPORT.md`
11. `DEPLOY_CHECKLIST.md`
