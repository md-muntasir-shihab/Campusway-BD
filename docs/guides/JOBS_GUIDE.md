# JOBS_GUIDE

Date: March 4, 2026

## Job Runtime Model
CampusWay runs in-process cron jobs and wraps every critical job with `runJobWithLog()`.
Each run is persisted in `job_run_logs` with:
- `jobName`
- `startedAt`, `endedAt`, `durationMs`
- `status` (`running|success|failed`)
- `summary`
- `errorMessage`, `errorStackSnippet`

## Active Logged Jobs
- `news.rss_fetch_publish`
- `exam.autosubmit_expired_sessions`
- `dashboard.notification_dispatch`
- `dashboard.badge_assignment`
- `retention.archiver`

## Schedules
- RSS + scheduled publish: from `startNewsV2CronJobs()`
- Exam expiry autosubmit: from `startExamCronJobs()`
- Student notification jobs: from `startStudentDashboardCronJobs()`
- Retention archiver: daily at `02:15` server time (`startRetentionCronJobs()`)

## Admin Visibility Endpoints
- `GET /api/{admin}/jobs/runs?limit=100`
- `GET /api/{admin}/jobs/health?hours=24`

## UI Surface
- Admin System Logs panel now shows:
  - Job health summary (success/failed/running)
  - Recent run timeline with status, duration, and error text

## Failure Handling
- Failure is never silent: failed run writes error details into `job_run_logs`.
- UI polling refreshes every 30s for operational visibility.
