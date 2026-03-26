# RELEASE_PROCESS

Date: March 4, 2026

## Environments
- Local: developer machine
- Staging: pre-production validation
- Production: live traffic

## Stage 1: Prepare Release Candidate
1. Merge approved changes into staging branch.
2. Validate env contracts on staging.
3. Run build gates:
   - `npm --prefix backend run build`
   - `npm --prefix frontend run lint`
   - `npm --prefix frontend run build`
4. Run index migration if needed:
   - `npm --prefix backend run migrate:ops-indexes-v1`

## Stage 2: Staging Verification
1. Deploy backend and frontend to staging.
2. Run smoke checks:
   - `/api/health`
   - login pages (`/login`, `/__cw_admin__/login`)
   - admin core routes and reports
   - payment + exam gating sanity
3. Validate panic controls and approval queue APIs.
4. Validate cron job logs visible via jobs endpoints.

## Stage 3: Production Deploy
1. Tag release.
2. Deploy backend artifact.
3. Deploy frontend artifact.
4. Confirm CORS and proxy headers.
5. Confirm SPA rewrites for deep routes.

## Stage 4: Post-Deploy Observation (first 30 min)
1. Monitor:
   - API errors (4xx/5xx spikes)
   - job failures (`job_run_logs`)
   - auth/session anomalies
2. Run focused smoke paths:
   - public home/news/universities/exams
   - admin dashboard/support/payments/reports

## Rollback Trigger
If critical flow breaks, execute `ROLLBACK_PLAN.md` immediately.
