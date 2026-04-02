---
name: campusway-fullstack-dev
description: "CampusWay daily fullstack workflow for backend Express TypeScript plus frontend Vite React and optional Next.js. Use when: implement feature, fix bug, wire API to UI, verify locally, run build and tests before handoff."
argument-hint: "Describe feature or bug scope and whether backend, frontend, or both are affected."
user-invocable: true
---

# CampusWay Fullstack Dev

## Outcome

Deliver a safe code change across CampusWay backend and frontend with local verification.

## When To Use

- Add or modify API endpoints in backend and consume in frontend.
- Fix regressions that touch business logic and UI.
- Need a consistent implementation to test flow.

## Procedure

1. Confirm impacted surfaces:

- backend only
- frontend only
- fullstack

2. Start local stack:

- backend: `cd backend && npm run dev`
- frontend: `cd frontend && npm run dev`
- optional next: `cd frontend-next && npm run dev`

3. Implement minimal scoped changes in impacted layer.
4. If backend changed, run:

- `cd backend && npm run build`
- targeted test script if available

5. If frontend changed, run:

- `cd frontend && npm run lint`
- `cd frontend && npm run build`

6. If route or user flow changed, run smoke E2E:

- `cd frontend && npm run e2e:smoke -- e2e/public-smoke.spec.ts`

7. Summarize behavior changes and risk notes.

## Decision Points

- If change is UI heavy, apply frontend quality skill first.
- If change is auth or permissions related, prioritize backend tests and E2E role flows.
- If release-critical, run release readiness skill before merge.

## Quality Checks

- No TypeScript build errors in touched app.
- No new lint errors in frontend.
- Updated path can be reproduced locally.

## External Inspirations From Awesome Agent Skills

- anthropics/webapp-testing
- vercel-labs/react-best-practices
- vercel-labs/next-best-practices
