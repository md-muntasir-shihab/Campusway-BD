---
name: campusway-auth-role-guardrails
description: "CampusWay auth and role-permission safety workflow for admin, student, and public surfaces. Use when: login issues, permission denied bugs, admin read-only policy checks, JWT session behavior, route guard regressions, role access review."
argument-hint: "Provide user role, affected route, and expected access behavior."
user-invocable: true
---

# CampusWay Auth Role Guardrails

## Outcome

Prevent access-control regressions and validate role-safe behavior across CampusWay routes and APIs.

## When To Use

- Login, session, or token bugs.
- 401 or 403 behavior changed unexpectedly.
- Admin policy and permission matrix related updates.
- Role-based route or action restrictions.

## Procedure

1. Identify the affected role:

- public
- student
- admin

2. Identify affected surface:

- frontend route
- backend API
- both

3. Validate backend auth and permission path for changed endpoint.
4. Confirm frontend guard or route-level behavior matches backend expectation.
5. Run focused checks:

- backend build: `cd backend && npm run build`
- relevant backend tests: `cd backend && npm run test:team` or targeted tests
- role smoke checks: `cd frontend && npm run e2e:smoke`

6. Verify error semantics:

- unauthenticated should be 401
- unauthorized should be 403

7. Document role matrix impact in PR notes.

## Decision Points

- If permission module mapping changed, treat as high-risk and require E2E verification.
- If only frontend guard changed, still verify one backend endpoint to avoid false confidence.

## Quality Checks

- Role receives only intended routes and actions.
- No privilege escalation path introduced.
- Error responses remain consistent with API contract.

## References In Workspace

- `backend/src/middlewares/auth`
- `backend/src/middlewares/securityGuards`
- `backend/src/security/permissionsMatrix`
