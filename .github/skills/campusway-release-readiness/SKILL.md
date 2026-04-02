---
name: campusway-release-readiness
description: "CampusWay pre-release gate for backend, frontend, tests, and deployment safety checks. Use when: final QA pass, release candidate validation, pre-deploy verification, merge-to-main readiness."
argument-hint: "Provide release scope and whether it includes backend, frontend, or infra/deployment changes."
user-invocable: true
---

# CampusWay Release Readiness

## Outcome

Run a predictable pre-release checklist to reduce regressions and deployment surprises.

## When To Use

- Before merging high-impact PRs.
- Before running deployment workflows.
- During hotfix validation.

## Procedure

1. Backend gate:

- `cd backend && npm run build`
- run targeted backend tests for touched modules

2. Frontend gate:

- `cd frontend && npm run lint`
- `cd frontend && npm run build`

3. E2E gate:

- `cd frontend && npm run e2e:smoke -- e2e/public-smoke.spec.ts`

4. Optional workspace gate:

- `cd .. && node scripts/release-check.mjs`

5. Verify env assumptions:

- API base URL and CORS origins consistent
- secret keys are not hardcoded in code changes

6. Prepare release notes:

- changed surfaces
- known risks
- rollback notes

## Decision Points

- If deployment config changed, include infra validation in the checklist.
- If auth/permission changed, require role-based smoke verification.

## Quality Checks

- Build and lint pass in affected apps.
- Critical smoke checks pass.
- No accidental secret leakage in diff.

## External Inspirations From Awesome Agent Skills

- hashicorp/terraform-code-generation
- cloudflare/web-perf
- netlify/netlify-cli-and-deploy
