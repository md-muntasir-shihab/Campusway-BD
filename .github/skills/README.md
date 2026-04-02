# CampusWay Skills Index

Use these slash commands in chat:

- `/campusway-fullstack-dev`
  - Best for feature implementation and bug fixes across backend plus frontend.
- `/campusway-frontend-quality`
  - Best for UI refactor, responsive fixes, visual polish, and frontend quality gates.
- `/campusway-e2e-playwright`
  - Best for smoke checks and role-based browser validation.
- `/campusway-release-readiness`
  - Best for pre-merge and pre-deploy release gates.
- `/campusway-auth-role-guardrails`
  - Best for auth, role-based access, 401 and 403 regressions, and permission safety checks.
- `/campusway-api-contract-regression`
  - Best for API payload mismatch, contract drift, and backend-frontend integration regressions.
- `/awesome-agent-skills-catalog`
  - Best for pulling verified external skill references from VoltAgent awesome-agent-skills.

## Suggested Usage Order

1. `/campusway-fullstack-dev`
2. `/campusway-frontend-quality` (if UI touched)
3. `/campusway-e2e-playwright`
4. `/campusway-auth-role-guardrails` (if auth or roles touched)
5. `/campusway-api-contract-regression` (if endpoint contract touched)
6. `/campusway-release-readiness`

## Notes

- These are workspace-scoped, so your team can share the same workflow.
- They are optimized for current CampusWay scripts and ports.
