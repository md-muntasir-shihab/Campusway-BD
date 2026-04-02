---
name: campusway-e2e-playwright
description: "CampusWay Playwright and smoke validation workflow. Use when: validate critical user journeys, verify login paths, test admin and student flows, confirm no browser regressions after code changes."
argument-hint: "Provide changed feature and target user role: public, student, admin, or mixed."
user-invocable: true
---

# CampusWay E2E Playwright

## Outcome

Verify key CampusWay journeys quickly using existing Playwright scripts and role-aware smoke tests.

## When To Use

- Any change touching navigation, auth, or role dashboards.
- Before merging frontend or fullstack PRs.
- After fixing production-facing UI/API defects.

## Procedure

1. Prepare test data if needed:

- `cd frontend && npm run e2e:prepare`

2. Run quick smoke suite:

- `cd frontend && npm run e2e:smoke`

3. For Next.js path checks:

- `cd frontend && npm run e2e:next-smoke`

4. For visual baseline updates:

- `cd frontend && npm run e2e:visual-baseline`

5. If data must be reverted:

- `cd frontend && npm run e2e:restore`

6. Record failed specs with probable root cause.

## Decision Points

- If auth flow changed, include admin and student login specs.
- If only static page changed, run targeted smoke file first then full smoke if risky.

## Quality Checks

- No unexpected failures in smoke path.
- Role-specific pages render and basic actions succeed.
- Test data cleanup performed when required.

## External Inspirations From Awesome Agent Skills

- anthropics/webapp-testing
