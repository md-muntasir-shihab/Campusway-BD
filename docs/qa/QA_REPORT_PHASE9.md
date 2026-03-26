# QA_REPORT_PHASE9

Date: March 4, 2026

## Scope
Phase 9: enterprise ops (permissions, approvals, jobs, retention, panic mode).

## Implemented
- Added module/action permission matrix (`backend/src/security/permissionsMatrix.ts`).
- Added backend middleware contract:
  - `requirePermission(module, action)`
  - standardized forbidden payload: `errorCode: "FORBIDDEN"`.
- Added roles:
  - `support_agent`, `finance_agent` (backend + frontend role unions).
- Added `permissionsV2` support on user model + auth payload.
- Added two-person approval system:
  - model: `ActionApproval`
  - service + controller + middleware
  - risky action route wiring in admin routes.
- Added panic controls and enforcement:
  - read-only admin mode
  - disable student logins
  - disable payment webhooks
  - disable exam starts
- Added job observability:
  - model: `JobRunLog`
  - wrapper: `runJobWithLog`
  - endpoints: `/jobs/runs`, `/jobs/health`
  - integrated in cron jobs.
- Added retention archiver worker + settings-driven schedule.

## Stop-Gate Checks
- Backend build: PASS (`npm --prefix backend run build`).
- Permission denial shape: wired through `forbidden()` and used by `requirePermission`.
- Risky action queuing: route middleware active for targeted actions.
- Job failures visibility: stored in `job_run_logs` and available via API.
- Panic toggles: backend policy checks implemented and immediate.

## Notes
- Existing legacy boolean permissions remain for backward compatibility.
- Legacy `authorize(...)` still coexists with module/action middleware for safe rollout.
