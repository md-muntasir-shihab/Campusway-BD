# CampusWay Exam Attempt Runbook

## Scope
This runbook covers operational actions for the Exam Participant lifecycle:
- force submit active attempts
- reset/rollback a student attempt
- tune anti-cheat policy thresholds
- verify certificate issuance/verification

## Force Submit an Active Attempt
1. Open Admin panel -> Live Exam Monitor.
2. Find the target session by student/exam.
3. Click `Force Submit`.
4. Confirm the student transitions to submitted state:
   - student receives `forced-submit` stream event
   - attempt status changes to `submitted`
   - result is available according to publish mode

API alternative:
- `PATCH /api/campusway-secure-admin/exams/:examId/force-submit/:studentId`

## Roll Back / Reset Student Attempt
Use only with explicit exam-owner approval.

1. Export student attempt/result/event data first.
2. Execute reset:
   - `PATCH /api/campusway-secure-admin/exams/:examId/reset-attempt/:userId`
3. Confirm:
   - result removed for that exam/student
   - active session cleared
4. Ask student to start a fresh attempt.

## Change Anti-Cheat Thresholds
Update exam settings from Admin exam edit:
- `security_policies.tab_switch_limit`
- `security_policies.copy_paste_violations`
- `security_policies.require_fullscreen`
- `security_policies.violation_action` (`warn | submit | lock`)
- `autosave_interval_sec`

API alternative:
- `PUT /api/campusway-secure-admin/exams/:id`

Compatibility note:
- if `violation_action` is not set and `auto_submit_on_violation=true`, behavior maps to `submit`.

## Export Event Logs
Use for incident reviews and audits.

- CSV: `GET /api/campusway-secure-admin/exams/:id/events/export?format=csv`
- XLSX: `GET /api/campusway-secure-admin/exams/:id/events/export?format=xlsx`

## Certificate Operations
Eligibility:
- result must be published
- certificate policy enabled
- minimum percentage and pass-only policy satisfied

Endpoints:
- student fetch/download: `GET /api/exams/:id/certificate`
- public verify: `GET /api/certificates/:certificateId/verify?token=...`

## Post-Release Monitoring Checklist
- autosave error rate and p95 latency
- stale-revision conflict rate
- locked-session and forced-submit volume
- stream disconnect/reconnect frequency
- result publish lag for scheduled/manual modes
- certificate issuance and verify failure rate

## Rollback Strategy
1. Disable feature flags for impacted scope:
   - `examAttemptSseEnabled`
   - `antiCheatActionEnumEnabled`
   - `certificateEnabled`
2. Revert recently deployed backend/frontend commit for exam attempt module.
3. Keep DB schema additions (non-destructive) in place.
4. Re-run smoke checks:
   - start attempt
   - autosave
   - submit
   - result visibility
