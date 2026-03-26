# ROLLBACK_PLAN

Date: March 4, 2026

## Trigger Conditions
Rollback immediately when any of these occur post-release:
- sustained 5xx increase
- auth/login outage
- admin critical mutation failure
- payment webhook failures with financial impact

## Rollback Levels
### Level 1: App Artifact Rollback (fast)
1. Deploy previous backend artifact/image.
2. Deploy previous frontend artifact.
3. Keep current database state.
4. Run smoke checks.

### Level 2: Config Rollback
1. Restore previous environment variables/secrets.
2. Restart backend + frontend.
3. Verify CORS/auth/session behavior.

### Level 3: Data Rollback (last resort)
1. Put system in read-only mode.
2. Stop writes.
3. Restore DB snapshot according to backup runbook.
4. Redeploy last known stable app version.
5. Run full smoke + audit verification.

## Operator Checklist
- [ ] Confirm incident severity and blast radius.
- [ ] Capture current logs and request IDs.
- [ ] Communicate rollback start time.
- [ ] Execute selected rollback level.
- [ ] Verify `/api/health` and critical routes.
- [ ] Confirm payment and exam policies after restore.
- [ ] Close incident with timeline and root cause follow-up.

## Post-Rollback Validation
- Public: `/`, `/universities`, `/news`, `/exams`
- Auth: `/login`, `/__cw_admin__/login`
- Admin: dashboard, support center, payments, reports
- Security: panic toggles and approval queue endpoints responsive
