# EXAM_FLOW

Date: March 4, 2026

## Pipeline: Session -> Autosave -> Autosubmit (Cron) -> Result Publish

## 1) Session Start
1. Student enters from `/exams` and starts exam:
   - `POST /api/exams/:id/start`
2. Backend creates `ExamSession` with:
   - `startedAtUTC`
   - `expiresAtUTC`
   - `attemptRevision`

## 2) Autosave Loop
- Client sends revisioned saves:
  - `POST /api/exams/:examId/attempt/:attemptId/answer`
- Backend enforces stale revision protection and returns latest revision.

## 3) Submit Semantics
- Manual submit:
  - `POST /api/exams/:examId/attempt/:attemptId/submit`
- Idempotent behavior:
  - repeated submits return submitted state, no duplicate result creation.

## 4) Cron Autosubmit
- Worker in `backend/src/cron/examJobs.ts` scans active expired sessions each minute.
- Expired sessions are finalized through system submit path.

Validated in Phase 4:
- Created short-duration exam and active session.
- Saved one answer, then left attempt idle.
- Poll on `GET /api/exams/:examId/attempt/:attemptId` confirmed auto transition to submitted by cron.

## 5) Result Visibility
- Result endpoint:
  - `GET /api/exams/:id/result`
- Visibility follows publish policy (`resultPublishDate` and result modes).

## 6) Admin Controls
- Live monitor/actions:
  - `GET /api/{admin}/live/attempts`
  - `POST /api/{admin}/live/attempts/:attemptId/action`
- Force submit path remains available for proctor/admin override.
