# RETENTION_POLICY

Date: March 4, 2026

## Settings (Security Center)
Retention is controlled from `security-settings` payload:
- `retention.enabled`
- `retention.examSessionsDays`
- `retention.auditLogsDays`
- `retention.eventLogsDays`

Defaults:
- enabled: `false`
- exam sessions: `30` days
- audit logs: `180` days
- event logs: `90` days

## Archiving Strategy
The retention worker archives first, then deletes from live collections.

Source -> Archive collections:
- `exam_attempts` -> `archive_exam_sessions`
- `audit_logs` -> `archive_audit_logs`
- `event_logs` -> `archive_event_logs`

Each archived row includes:
- `archivedAt`
- `archivedFrom`

## Schedule
- Cron: daily at `02:15`
- Job name in logs: `retention.archiver`

## Data Safety Rules
- If retention is disabled, worker exits with a no-op summary.
- Deletion only occurs after archive insert attempt.
- Duplicate archive insert errors are tolerated for idempotency.

## Operational Validation
- Job result visible in `GET /api/{admin}/jobs/runs`.
- Health trend visible in `GET /api/{admin}/jobs/health`.
- Security Center UI supports runtime retention edits.
