---
name: campusway-frontend-quality
description: "CampusWay frontend quality workflow for Vite React and Tailwind with optional Next.js surface. Use when: improve UI, refactor components, fix layout, optimize bundle, enforce design consistency, prepare frontend PR."
argument-hint: "Describe page path, expected UX behavior, and whether mobile responsiveness is required."
user-invocable: true
---

# CampusWay Frontend Quality

## Outcome

Ship polished frontend updates with consistent design, responsiveness, and build safety.

## When To Use

- Create or refactor UI components.
- Improve page visuals or interaction quality.
- Fix responsive bugs and visual regressions.

## Procedure

1. Identify affected route and component boundaries.
2. Preserve existing design tokens and theme variables first.
3. Implement UI changes with accessible markup.
4. Validate responsiveness:

- mobile around 360px
- tablet around 768px
- desktop 1280px+

5. Run quality commands:

- `cd frontend && npm run lint`
- `cd frontend && npm run build`

6. If performance-sensitive route changed, run:

- `cd frontend && npm run perf:lighthouse:landing`

7. Capture quick before/after notes for PR context.

## Decision Points

- If change includes routing data hydration with Next.js, verify in `frontend-next` too.
- If animation adds bundle weight, review chunking impact in Vite build output.

## Quality Checks

- No broken layout on key breakpoints.
- No critical accessibility regressions.
- Build output remains stable.

## External Inspirations From Awesome Agent Skills

- vercel-labs/react-best-practices
- vercel-labs/web-design-guidelines
- vercel-labs/next-best-practices
- cloudflare/web-perf
