# Contributing to CampusWay

Thank you for your interest in contributing to CampusWay! This guide covers everything you need to get started.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Coding Conventions](#coding-conventions)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Campusway-BD.git
   cd Campusway-BD
   ```
3. **Install** dependencies:
   ```bash
   cd backend && npm install && cd ..
   cd frontend && npm install --legacy-peer-deps && cd ..
   ```
4. **Create** a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## Development Setup

```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start backend (port 5003)
cd backend && npm run dev

# Start frontend (port 5175)
cd frontend && npm run dev
```

Before submitting a PR, run the full check:

```bash
# Backend
cd backend && npm run build && npm test

# Frontend
cd frontend && npm run lint && npm run build
```

---

## Coding Conventions

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Models | PascalCase | `User.ts`, `ExamSession.ts` |
| React Components | PascalCase | `ExamRunner.tsx`, `HierarchyManager.tsx` |
| Services | PascalCase | `GamificationService.ts` |
| Hooks | camelCase with `use` prefix | `useExamQueries.ts` |
| Routes | kebab-case with `.routes` suffix | `battle.routes.ts` |
| Validators | kebab-case with `.validator` suffix | `exam.validator.ts` |

### Backend Patterns

- **Controllers** stay thin — delegate all logic to services
- **Services** contain business logic
- **Zod schemas** validate all request bodies (in `validators/`)
- **ResponseBuilder** for consistent API responses
- Middleware chain: `authenticate → requirePermission → validateBody → controller`
- Error codes: `UPPER_SNAKE_CASE` (e.g., `SESSION_INVALIDATED`, `NOT_FOUND`)

### Frontend Patterns

- **Lazy loading** for all page components via `React.lazy()`
- **TanStack Query** for all server state
- **TailwindCSS** for styling — no inline styles, no CSS modules
- **Lucide React** for icons
- All pages must support **dark mode** via `dark:` Tailwind variants
- Form handling: React Hook Form + Zod resolver

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
[optional footer]
```

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, dependency updates |
| `docs` | Documentation changes |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `perf` | Performance improvements |
| `ci` | CI/CD changes |

**Examples:**
```
feat: add battle mode leaderboard
fix: correct score computation for negative marks
chore: update @upstash/redis to v1.37
docs: add API reference for question hierarchy
test: add property tests for streak tracking
```

---

## Pull Request Process

1. **Keep PRs focused** — one feature or fix per PR
2. **Write a clear description** of what changed and why
3. **Add or update tests** if you change behavior
4. **Ensure all CI checks pass** before requesting review
5. **Link related issues** using `Closes #123`

### PR Checklist

- [ ] TypeScript compiles without errors: `npm run build`
- [ ] Lint passes: `npm run lint`
- [ ] Tests pass: `npm test` (backend) / `npx vitest run` (frontend)
- [ ] No hardcoded secrets or credentials
- [ ] Dark mode works for any UI changes
- [ ] Mobile responsive for any UI changes

---

## Reporting Bugs

Use the [Bug Report template](https://github.com/md-muntasir-shihab/Campusway-BD/issues/new?template=bug_report.md).

Please include:
- Steps to reproduce
- Expected vs actual behavior
- Browser, OS, and user role
- Console errors or screenshots

---

## Suggesting Features

Use the [Feature Request template](https://github.com/md-muntasir-shihab/Campusway-BD/issues/new?template=feature_request.md).

---

## Questions?

Open a [GitHub Discussion](https://github.com/md-muntasir-shihab/Campusway-BD/discussions) for general questions.
