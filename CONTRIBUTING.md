# Contributing to CampusWay

Thank you for your interest in contributing!

## Development Setup

1. Fork and clone the repository
2. Follow the [Quick Start](README.md#-quick-start) guide
3. Create a feature branch: `git checkout -b feat/your-feature`

## Coding Conventions

### Naming
- **Files:** PascalCase for models/components (`User.ts`, `ExamRunner.tsx`)
- **Functions/Variables:** camelCase (`generateAccessToken`)
- **Types/Interfaces:** PascalCase with `I` prefix for Mongoose (`IUser`)
- **Constants:** UPPER_SNAKE_CASE (`JWT_SECRET`)

### Backend
- Service layer for business logic — controllers stay thin
- Zod schemas for all request validation
- `ResponseBuilder` for consistent API responses
- Middleware chain: `authenticate → requirePermission → zodValidate → controller`

### Frontend
- Lazy loading for all page components
- TanStack Query for server state
- TailwindCSS for styling (no inline styles)

## Pull Request Process

1. Run `bash scripts/dev.sh check` before pushing
2. Write descriptive commit messages: `feat:`, `fix:`, `chore:`, `docs:`
3. Keep PRs focused — one feature or fix per PR
4. Update tests if you change behavior

## Commit Messages

```
<type>: <short description>

Types: feat, fix, chore, docs, refactor, test, style
```
