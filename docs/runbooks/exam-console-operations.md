# Exam Console Operations Runbook

## Scope
This runbook covers Students, Question Bank, Exams, Live Monitor, Live Alerts, and Banner operations for CampusWay Exam Console.

## 1) Pre-Release Checklist
- Run backend build: `npm run build` in `backend`.
- Run frontend build: `npm run build` in `frontend`.
- Run migration dry-run in staging.
- Verify `/api/admin/openapi/exam-console.json` is reachable for admin users.
- Confirm feature flags and environment variables for S3 are set (or local upload fallback is expected).

## 2) Migration
- Non-destructive migration command:
  - `npm run migrate:exam-console-v1`
- Report output:
  - `qa-artifacts/migrations/exam-console-v1-report.json`
- Destructive migration operations are NOT included and require explicit manual approval.

## 3) Live Monitor Actions
- `warn`: Sends a policy warning to the attempt stream.
- `message`: Sends a proctor message without forcing submit.
- `lock`: Locks active session (save/submit blocked until intervention).
- `force_submit`: Immediately finalizes attempt.

## 4) Force Submit and Recovery
- Force submit via API:
  - `POST /api/admin/live/attempts/:attemptId/action` with `{ "action": "force_submit" }`
- Rollback strategy:
  - Create a manual compensating attempt only after incident review.
  - Never hard-delete attempt/event records from production.

## 5) Alert Operations
- Create alert in draft.
- Validate `target`, `startAt`, `endAt`, `requireAck`.
- Publish via:
  - `PUT /api/admin/alerts/:id/publish` with `{ "publish": true }`
- If a blocking alert is misconfigured, unpublish immediately.

## 6) Banner Operations
- Request signed upload:
  - `POST /api/admin/banners/sign-upload`
- Upload asset to returned target.
- Create banner with `slot`, `priority`, schedule window.
- Publish/unpublish using `/api/admin/banners/:id/publish`.

## 7) Monitoring Signals
Track these continuously during and after rollout:
- Autosave error rate and p95 latency.
- Stale revision conflict rate.
- Live stream disconnect/reconnect count.
- Lock and force-submit event volume.
- Alert acknowledgement rate.
- Banner impression and click trend.

## 8) Incident Triage
- High autosave errors: degrade to polling, inspect DB write latency, check payload validation rejects.
- High lock events: validate anti-cheat thresholds and policy action enum.
- Alert blockade complaints: verify target and expiry; unpublish if broad impact.
- Banner missing in UI: check slot/schedule/status and timezone alignment.

## 9) Rollback Strategy
- API rollback: redeploy previous backend release.
- Frontend rollback: redeploy previous frontend bundle.
- Data rollback: avoid destructive rollback; use forward-fix migration patch.

## 10) Manual Validation Commands
- Build checks:
  - `cd backend && npm run build`
  - `cd frontend && npm run build`
- Endpoint smoke (requires auth token):
  - `GET /api/admin/live/attempts`
  - `GET /api/exams/landing`
  - `GET /api/alerts/active`
  - `GET /api/banners/active?slot=top`
