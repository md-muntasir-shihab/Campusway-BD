# Exam Backend Guide

## Architecture

```text
backend/src/
├── models/
│   ├── exam.model.ts           # Exam schema (title, schedule, rules, payment, etc.)
│   ├── examQuestion.model.ts   # Questions with BN/EN text, options, correctKey, marks
│   ├── examSession.model.ts    # Session with status, questionOrder, optionOrderMap
│   ├── answer.model.ts         # Per-question answer with changeCount tracking
│   └── result.model.ts         # Evaluated results (scores, counts, percentage)
├── services/
│   ├── examAccessService.ts    # buildAccessPayload() — gating logic
│   └── examSessionService.ts   # startSession, getSessionQuestions, saveSessionAnswers, submitSession
├── controllers/
│   └── examPdfController.ts    # PDF generation (pdfkit) for questions, solutions, answers
├── routes/exams/
│   ├── studentExamRoutes.ts    # Student-facing endpoints with rate limiters
│   └── adminExamRoutes.ts      # Admin CRUD, import/export, results, payments
├── cron/
│   └── modernExamJobs.ts       # Auto-submit expired sessions every minute (node-cron)
└── middleware/
    └── examRateLimit.ts        # Rate limiters: start(5/min), autosave(30/min), submit(3/min)
```

## Student API Endpoints

| Method | Route | Rate Limit | Purpose |
| ------ | ----- | ---------- | ------- |
| GET | `/api/exams` | — | List exams with category/status filters |
| GET | `/api/exams/:examId` | — | Exam detail + access gate payload |
| POST | `/api/exams/:examId/sessions/start` | 5/min | Start session, returns sessionId + expiry |
| GET | `/api/exams/:examId/sessions/:sessionId/questions` | — | Session questions in stored order |
| POST | `/api/exams/:examId/sessions/:sessionId/answers` | 30/min | Save/update answers with change tracking |
| POST | `/api/exams/:examId/sessions/:sessionId/submit` | 3/min | Idempotent submit + instant evaluation |
| GET | `/api/exams/:examId/sessions/:sessionId/result` | — | Result (locked/published states) |
| GET | `/api/exams/:examId/sessions/:sessionId/solutions` | — | Solutions (release rule gated) |
| GET | `/api/exams/:examId/pdf/questions` | — | PDF of exam questions |
| GET | `/api/exams/:examId/pdf/solutions` | — | PDF of solutions with explanations |
| GET | `/api/exams/:examId/sessions/:sessionId/pdf/answers` | — | PDF of student's answers |

## Access Gating

`buildAccessPayload(exam, userId)` returns `{ accessStatus, blockReasons[] }`.

Block reasons (constants):

- `LOGIN_REQUIRED` — no authenticated user
- `PROFILE_BELOW_70` — user.profileScore < 70
- `EXAM_NOT_IN_WINDOW` — current time outside examWindowStartUTC–examWindowEndUTC
- `SUBSCRIPTION_REQUIRED` — exam needs active subscription, none found
- `PAYMENT_PENDING` — exam requires payment, no paid PaymentModel record
- `ATTEMPT_LIMIT_REACHED` — submitted/evaluated/expired attempts >= attemptLimit and !allowReAttempt

## Session Lifecycle

1. **Start**: `startSession(examId, userId, reqMeta)` — validates access, creates session with randomized question/option order, sets expiresAtUTC = now + durationMinutes.
2. **Questions**: `getSessionQuestions(examId, sessionId, userId)` — returns questions in session-specific order with options in stored order, plus current answers.
3. **Autosave**: `saveSessionAnswers(examId, sessionId, userId, payload)` — upserts answers, tracks changeCount per question, skips if change limit exceeded.
4. **Submit**: `submitSession(examId, sessionId, userId)` — marks session submitted, evaluates all answers, creates ResultModel record. Idempotent (re-submit returns same timestamp).
5. **Auto-submit cron**: Every minute, finds sessions with `status: "in_progress"` and `expiresAtUTC < now`, calls submitSession for each.

## Negative Marking

When `exam.negativeMarkingEnabled: true`:

- Each wrong answer deducts `question.negativeMarks` (if set) or falls back to `exam.negativePerWrong`
- `obtainedMarks` can be negative (e.g., 3 wrong × 0.25 = -0.75)
- Skipped questions have zero effect

## Rate Limiters (express-rate-limit)

| Limiter | Window | Max | Applied To |
| ------- | ------ | --- | ---------- |
| examSessionStartLimit | 1 min | 5 | POST /sessions/start |
| examAutoSaveLimit | 1 min | 30 | POST /sessions/:id/answers |
| examSubmitLimit | 1 min | 3 | POST /sessions/:id/submit |

## PDF Generation (pdfkit)

`examPdfController.ts` provides three PDF endpoints:

- Question paper: exam questions in order with option layout
- Solutions: questions + correct answers + explanations
- Student answers: per-student answer sheet with selected keys

## Cron Jobs

`modernExamJobs.ts` — registered in `server.ts` via `startModernExamCronJobs()`:

- Schedule: `* * * * *` (every minute)
- Finds all `in_progress` sessions past expiry, calls `submitSession` for each
- Logs count of auto-submitted sessions

## Jest Tests

`backend/tests/exams/exam.contract.test.ts` — 11 tests across 3 describe blocks:

- **Access gating** (4): eligible, PROFILE_BELOW_70, EXAM_NOT_IN_WINDOW, ATTEMPT_LIMIT_REACHED
- **Session lifecycle** (4): startSession, getSessionQuestions, saveSessionAnswers, answer change limit
- **Submit & results** (3): correct scoring, idempotent submit, negative marking deduction

Run: `cd backend && npx jest tests/exams/exam.contract.test.ts`
