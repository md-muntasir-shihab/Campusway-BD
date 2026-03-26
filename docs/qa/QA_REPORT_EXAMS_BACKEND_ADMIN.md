# QA Report — Exams Backend + Admin

## Backend — Completed Implementation

### Access Gating

- [x] `buildAccessPayload` returns exact block reason constants
- [x] LOGIN_REQUIRED when no userId
- [x] PROFILE_BELOW_70 when user.profileScore < 70
- [x] EXAM_NOT_IN_WINDOW when outside schedule
- [x] SUBSCRIPTION_REQUIRED when exam needs subscription
- [x] PAYMENT_PENDING when exam needs payment
- [x] ATTEMPT_LIMIT_REACHED when submitted/evaluated/expired >= attemptLimit

### Session Lifecycle

- [x] `startSession` creates session with randomized question/option order
- [x] `getSessionQuestions` returns questions in session-specific order
- [x] `saveSessionAnswers` persists answers with changeCount tracking
- [x] Answer change limit enforcement (skips save when limit exceeded)
- [x] `submitSession` idempotent — re-submit returns same timestamp

### Evaluation

- [x] Correct/wrong/skipped counts calculated
- [x] Negative marking deduction applied per wrong answer
- [x] obtainedMarks can go negative
- [x] Percentage calculated correctly
- [x] ResultModel created on submit

### Result/Solutions Release

- [x] Result endpoint locked until `resultPublishAtUTC`
- [x] Solutions endpoint gated by `solutionReleaseRule`
- [x] Locked response includes `publishAtUTC` + `serverNowUTC` for countdown

### Infrastructure

- [x] Rate limiters wired: start(5/min), autosave(30/min), submit(3/min)
- [x] Auto-submit cron: every minute for expired in_progress sessions
- [x] PDF generation: questions, solutions, student answers (pdfkit)
- [x] XLSX template download endpoints

### Jest Test Coverage

- [x] 11 tests in `exam.contract.test.ts` (mongodb-memory-server)
- [x] Access gating: 4 tests (eligible, profile, window, attempt limit)
- [x] Session lifecycle: 4 tests (start, questions, save, change limit)
- [x] Submit & results: 3 tests (scoring, idempotent, negative marking)

## Admin Panel — Completed Implementation

### API Layer (adminExamApi.ts)

- [x] All endpoints typed with proper request/response shapes
- [x] Uses main `api` service (shared JWT auth headers)
- [x] Template URL constants exported

### Admin UI (AdminExamsPage.tsx)

- [x] 6-tab layout: list, create, edit, questions, results, payments
- [x] List tab: search, exam cards with action buttons
- [x] Create/Edit tab: 3-section form (Basic Info, Schedule, Rules) with all 30+ fields
- [x] Questions tab: form with BN/EN, options, correct key, marks; template download; list with edit/delete
- [x] Results tab: table with score/rank, publish button, legacy import/export
- [x] Payments tab: payment list with verify

### Admin Route Coverage

- [x] CRUD: exams, questions
- [x] Import: preview + commit workflow
- [x] Results: list, CSV export, publish, reset attempt
- [x] Payments: list, verify
- [x] Students: list, import
- [x] Student groups: list, import
- [x] Question bank: query endpoint
- [x] Templates: XLSX download URLs

## Resolved Issues

- Fixed adminExamApi.ts to use main `api` instance (not separate axios) for consistent JWT auth
- Fixed test function signatures to match actual service exports (saveSessionAnswers, 3-arg functions)
- Fixed test userId to use `user.userId` field (matches UserModel.findOne query)
