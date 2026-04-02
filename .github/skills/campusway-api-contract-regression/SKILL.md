---
name: campusway-api-contract-regression
description: "CampusWay API contract and regression workflow for Express TypeScript endpoints. Use when: API response changed, field mismatch, frontend integration broke, schema drift, endpoint refactor, release regression checks."
argument-hint: "Provide endpoint path, expected request or response shape, and affected frontend page."
user-invocable: true
---

# CampusWay API Contract Regression

## Outcome

Keep backend responses and frontend expectations aligned while reducing endpoint regressions.

## When To Use

- API payload shape changes.
- Frontend breaks after backend refactor.
- New fields are added or renamed.
- Release candidate needs API safety validation.

## Procedure

1. Define contract scope:

- endpoint path and method
- request fields
- response fields and status codes

2. Confirm current backend implementation for that endpoint.
3. Compare frontend usage path and required fields.
4. Apply minimal compatibility changes:

- preserve old fields when safe
- add additive fields before removing legacy fields

5. Run verification:

- `cd backend && npm run build`
- targeted backend tests for affected module
- `cd frontend && npm run build`
- `cd frontend && npm run e2e:smoke -- e2e/public-smoke.spec.ts`

6. Record explicit contract delta:

- added fields
- removed fields
- status code changes

## Decision Points

- If breaking change is unavoidable, require staged rollout note and frontend update in same PR.
- If contract is used by multiple clients, keep backward-compatible fallback window.

## Quality Checks

- No runtime undefined-field errors in frontend.
- Backend returns stable status codes and validation errors.
- Contract changes are documented in related API docs.

## References In Workspace

- `API_CONTRACT_SUBSCRIPTION.md`
- `HOME_API_CONTRACT.md`
- `NEWS_API_CONTRACT.md`
- `backend/API_DOCUMENTATION.md`
