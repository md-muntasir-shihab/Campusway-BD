# CampusWay — Project Overview

## What Is CampusWay

CampusWay is a full-stack, secure, multi-role admission and academic management platform for prospective students, enrolled students, university administrators, and operations staff in Bangladesh.

It supports:
- University listings, categories, clusters, and featured content
- Student profiles, subscriptions, exams, results, and notifications
- Admin control over all content, users, subscriptions, campaigns, and settings
- A communication hub for targeted notifications, campaigns, templates, providers, and smart triggers
- A subscription contact center for audience management and outreach
- News, notices, and RSS content distribution
- Support tickets, contact messages, and profile approval queues
- Finance management (transactions, invoices, budgets, vendors)
- Team and access control with role-based permissions

---

## Core Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 22, Express 4, TypeScript 5, Mongoose 8 |
| Frontend | React 19, Vite 6, TypeScript 5, Tailwind CSS 3: |
| Auth | Custom JWT (backend) + Firebase SDK (frontend-side) |
| Database | MongoDB (local `.local-mongo/` for dev, Azure-hosted for prod) |
| Hosting | Azure App Service (backend), Firebase Hosting (frontend) |
| Security | Helmet, HPP, rate limiting, express-mongo-sanitize, AES-256-GCM encryption |
| CI/CD | GitHub Actions (Azure deploy + CodeQL) + Dependabot |
| Testing | Jest + Supertest (backend), Playwright (E2E) |

---

## User Roles

| Role | Access Level |
|------|-------------|
| Super Admin | Full system access including security, finance, config |
| Admin | Full operational access, user/content management |
| Moderator | Content approval, news, notices, resources |
| Editor | Publishing only, no deletion |
| Chairman | Read-only strategic dashboard |
| Student | Student portal (dashboard, profile, exams, results, support) |

---

## Key Ports (Local Dev)

| Service | Port |
|---------|------|
| Backend API | 5003 (or 5000, set by env) |
| Frontend Vite | 5175 |
| Frontend Next | 3000 (placeholder) |
| MongoDB | 27017 |

---

## Phase Readiness

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Bootstrap, environment, tooling, docs | IN PROGRESS |
| Phase 1 | Core website structure, public/student/admin foundation | READY WHEN P0 DONE |
| Phase 2 | Communication hub, campaign, subscription center, triggers | STRUCTURALLY BUILT — NEEDS AUDIT |
| Phase 3 | Security hardening, runtime testing, final QA, release gate | PENDING |

---

## Repository Structure Quick Reference

```
/backend         Express + TypeScript API (port 5003)
/frontend        React + Vite SPA (port 5175)
/frontend-next   Next.js 15 placeholder (port 3000)
/.github         GitHub Actions CI/CD workflows
/docs            Internal developer documentation
/.local-mongo    Local MongoDB data directory
```

See `STRUCTURE_MAP.md` for full architectural detail.
See `ROUTE_MAP.md` for all frontend routes.
See `MODULE_MAP.md` for backend module breakdown.
