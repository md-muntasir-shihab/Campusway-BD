<div align="center">

<img src="https://img.shields.io/badge/CampusWay-Education%20Platform-6366F1?style=for-the-badge" alt="CampusWay" />

# CampusWay

### Bangladesh's All-in-One University Admission & Learning Platform

*A production-grade full-stack SaaS platform for Bangladeshi students — covering university admission prep, exam management, gamified learning, AI-powered analytics, and more.*

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

<br/>

[![CI Pipeline](https://github.com/md-muntasir-shihab/Campusway-BD/actions/workflows/ci.yml/badge.svg)](https://github.com/md-muntasir-shihab/Campusway-BD/actions/workflows/ci.yml)
[![Quality Gate](https://github.com/md-muntasir-shihab/Campusway-BD/actions/workflows/lint-and-typecheck.yml/badge.svg)](https://github.com/md-muntasir-shihab/Campusway-BD/actions/workflows/lint-and-typecheck.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](CONTRIBUTING.md)

<br/>

**[Live Demo](https://campuswaybd.web.app)** &nbsp;·&nbsp; **[Quick Start](#-quick-start)** &nbsp;·&nbsp; **[API Reference](#api)** &nbsp;·&nbsp; **[Contributing](CONTRIBUTING.md)**

</div>

---

## Overview

CampusWay is a comprehensive education platform built for Bangladeshi students preparing for university admission exams (BUET, DU, Medical, Engineering, GST clusters). It combines a powerful exam engine, a structured question bank, gamification mechanics, and AI-driven analytics into a single cohesive product.

> **Status:** Production — deployed at [campuswaybd.web.app](https://campuswaybd.web.app)

---

## Features

<table>
<tr>
<td width="50%" valign="top">

### Exam Engine
- 5-step exam builder wizard
- Auto-pick questions by difficulty distribution
- Live, scheduled, practice & mock exam types
- Anti-cheat: tab detection, fullscreen enforcement, copy-paste blocking
- Written/CQ support with AI-assisted grading
- Real-time leaderboards via Server-Sent Events

</td>
<td width="50%" valign="top">

### Question Bank
- 5-level hierarchy: Group → Sub-Group → Subject → Chapter → Topic
- Bilingual content (English + Bengali)
- LaTeX math rendering via KaTeX
- Bulk import (Excel / CSV / JSON) with auto-hierarchy creation
- Review & moderation workflow
- Duplicate detection via content hashing

</td>
</tr>
<tr>
<td valign="top">

### Gamification
- XP, Coins & daily login bonus
- League system (Iron → Platinum)
- Streak tracking with calendar heatmap
- Badge collection system
- Brain Clash — live 1v1 MCQ battles
- Adaptive difficulty per topic

</td>
<td valign="top">

### Analytics & AI
- Student performance dashboard (radar, heatmap, line charts)
- Mistake Vault with mastery tracking
- AI-powered weak topic suggestions (Google Generative AI)
- Study routine planner with adherence tracking
- Community doubt solver with AI explanations
- Platform-wide admin analytics

</td>
</tr>
<tr>
<td valign="top">

### User Management
- JWT auth with refresh token rotation
- Role-based access control (9 roles)
- Student groups with nested structures
- Examiner accounts with revenue sharing
- Exam packages with coupon codes
- 2FA (email / SMS / authenticator app)

</td>
<td valign="top">

### Platform
- Dark mode with OS preference detection
- Fully responsive (mobile-first)
- Bengali-compatible typography (Noto Sans Bengali)
- Multi-channel notifications (in-app, push, email, SMS)
- Finance center with payment tracking
- University database with search & filtering

</td>
</tr>
</table>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 · Vite 6 · TypeScript · TailwindCSS 3 · TanStack Query · React Router v7 |
| **UI** | Lucide React · Framer Motion · Recharts · Chart.js · KaTeX · React Quill |
| **Backend** | Node.js 20 · Express 4 · TypeScript · Zod · node-cron · multer |
| **Database** | MongoDB (130+ collections) · Mongoose 8 · Upstash Redis |
| **Auth** | JWT (access + refresh) · Firebase Admin SDK · 2FA |
| **AI** | Google Generative AI SDK |
| **Testing** | Jest · Vitest · Playwright · fast-check (property-based) · mongodb-memory-server |
| **DevOps** | GitHub Actions CI · Husky pre-commit · ESLint v9 · Docker Compose · Render |

---

## Project Structure

```
CampusWay/
├── backend/                    # Express API server (port 5003)
│   └── src/
│       ├── controllers/        # Route handlers (50+)
│       ├── services/           # Business logic layer (30+)
│       ├── models/             # Mongoose schemas (130+)
│       ├── routes/             # Express route definitions
│       ├── validators/         # Zod request schemas
│       ├── middlewares/        # Auth, CSRF, rate-limit, RBAC
│       ├── cron/               # Scheduled background jobs
│       ├── realtime/           # SSE streams (exam, leaderboard)
│       ├── seeds/              # Database seeders
│       └── server.ts           # Entry point
│
├── frontend/                   # React SPA (port 5175)
│   └── src/
│       ├── pages/
│       │   ├── admin/          # Admin panel (exam center, question bank, analytics)
│       │   └── student/        # Student portal (exams, dashboard, gamification)
│       ├── components/         # Reusable UI components
│       ├── hooks/              # Custom React hooks (50+)
│       ├── api/                # Typed API client modules
│       ├── services/           # Axios instance & interceptors
│       └── types/              # TypeScript interfaces
│
├── .github/
│   ├── workflows/              # CI/CD pipelines (Quality Gate + CI Pipeline)
│   └── ISSUE_TEMPLATE/         # Bug & feature request templates
│
├── docs/                       # Internal documentation
├── scripts/                    # Dev utility scripts
├── render.yaml                 # Render deployment config
└── docker-compose.yml          # Local MongoDB via Docker
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20+ |
| MongoDB | 7+ (local or Docker) |
| Git | 2.x |

### 1. Clone & Install

```bash
git clone https://github.com/md-muntasir-shihab/Campusway-BD.git
cd Campusway-BD

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install --legacy-peer-deps && cd ..
```

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Minimum required values in `backend/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/campusway
JWT_SECRET=your-strong-secret-here
JWT_REFRESH_SECRET=another-strong-secret
CORS_ORIGIN=http://localhost:5175
ADMIN_SECRET_PATH=campusway-secure-admin
```

### 3. Start Development Servers

```bash
# Terminal 1 — Backend (http://localhost:5003)
cd backend && npm run dev

# Terminal 2 — Frontend (http://localhost:5175)
cd frontend && npm run dev
```

### 4. Seed Sample Data

```bash
cd backend
npm run seed          # Full seed (all data)
npm run seed:founder  # Founder profile only
```

---

## Available Scripts

| Command | Directory | Description |
|---------|-----------|-------------|
| `npm run dev` | both | Start development server with hot reload |
| `npm run build` | both | Production build |
| `npm run lint` | both | ESLint check |
| `npm run typecheck` | backend | TypeScript type check |
| `npm test` | backend | Jest unit + property-based tests |
| `npx vitest run` | frontend | Vitest unit tests |
| `npx playwright test` | frontend | Playwright E2E tests |
| `npm run seed` | backend | Run all database seeders |

---

## Environment Variables

<details>
<summary><strong>Backend</strong> — <code>backend/.env</code></summary>

| Variable | Description | Required |
|----------|-------------|:--------:|
| `PORT` | Server port (default: `5003`) | No |
| `MONGODB_URI` | MongoDB connection string | **Yes** |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | **Yes** |
| `JWT_REFRESH_SECRET` | Refresh token secret | **Yes** |
| `JWT_EXPIRES_IN` | Access token TTL (default: `15m`) | No |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (default: `7d`) | No |
| `CORS_ORIGIN` | Allowed origins (comma-separated) | **Yes** |
| `ADMIN_SECRET_PATH` | Admin panel URL segment | **Yes** |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL | No |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token | No |
| `FIREBASE_PROJECT_ID` | Firebase project ID | No |
| `NODE_ENV` | Environment (`development` / `production`) | No |

See [`backend/.env.example`](backend/.env.example) for the complete list.

</details>

<details>
<summary><strong>Frontend</strong> — <code>frontend/.env</code></summary>

| Variable | Description | Required |
|----------|-------------|:--------:|
| `VITE_API_BASE_URL` | Backend API base URL | **Yes** |
| `VITE_ADMIN_PATH` | Admin panel secret path | **Yes** |
| `VITE_FIREBASE_API_KEY` | Firebase web API key | No |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | No |
| `VITE_USE_MOCK_API` | Use mock data (default: `false`) | No |

See [`frontend/.env.example`](frontend/.env.example) for the complete list.

</details>

---

## User Roles

| Role | Access Level | Description |
|:----:|:------------|:------------|
| `superadmin` | Full | Bypasses all restrictions |
| `admin` | Admin panel | User management, exams, analytics, settings |
| `moderator` | Content | Content moderation, limited admin access |
| `editor` | Content | Content editing only |
| `examiner` | Content creation | Create questions & exams, earn revenue |
| `student` | Student portal | Take exams, practice, battle, track progress |
| `chairman` | Reports | University oversight dashboard |
| `support_agent` | Support | Support tickets only |
| `finance_agent` | Finance | Finance module only |

---

## API

The backend exposes a RESTful API. Key route groups:

| Route | Description |
|-------|-------------|
| `POST /api/auth/login` | Authenticate user |
| `POST /api/auth/register` | Register new student |
| `GET /api/v1/question-hierarchy/tree` | Full 5-level hierarchy tree |
| `POST /api/v1/questions` | Create question |
| `POST /api/v1/questions/import` | Bulk import (Excel/CSV/JSON) |
| `POST /api/v1/exams` | Create exam draft |
| `POST /api/v1/exams/:id/publish` | Publish exam |
| `GET /api/v1/gamification/profile` | Student gamification profile |
| `GET /health` | Backend health check |

All admin endpoints are prefixed with `/api/campusway-secure-admin/` and require RBAC authentication.

---

## Testing

| Layer | Tool | Coverage |
|-------|------|----------|
| Backend unit | Jest + mongodb-memory-server | Service logic, model validation |
| Property-based | fast-check | 35+ correctness properties |
| Frontend unit | Vitest + React Testing Library | Components, hooks |
| E2E | Playwright | Full admin & student flows |

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npx vitest run

# E2E tests
cd frontend && npx playwright test
```

---

## Deployment

| Service | URL |
|---------|-----|
| Frontend (Firebase Hosting) | [campuswaybd.web.app](https://campuswaybd.web.app) |
| Backend (Render) | [campusway-backend.onrender.com](https://campusway-backend.onrender.com) |
| Health Check | [/health](https://campusway-backend.onrender.com/health) |

The backend auto-deploys from the `production` branch via Render. See [`render.yaml`](render.yaml) for configuration.

---

## Security

See [SECURITY.md](SECURITY.md) for the full security policy and vulnerability reporting.

Key security measures:
- JWT with refresh token rotation & device fingerprinting
- CSRF double-submit cookies on all mutating requests
- Rate limiting (100 req/min per user; 20 req/15min on auth endpoints)
- Input sanitization via `express-mongo-sanitize`
- Zod validation on all request bodies
- Helmet.js security headers (CSP, HSTS, X-Frame-Options)
- IP allowlisting for admin panel access
- Audit logging for all sensitive operations

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting a pull request.

```bash
# 1. Fork & clone
git clone https://github.com/YOUR_USERNAME/Campusway-BD.git

# 2. Create a feature branch
git checkout -b feat/your-feature

# 3. Make changes, then verify
cd backend && npm run build && npm test
cd frontend && npm run lint && npm run build

# 4. Commit using Conventional Commits
git commit -m "feat: add your feature"

# 5. Push and open a PR
git push origin feat/your-feature
```

---

## License

[MIT License](LICENSE) — Copyright &copy; 2024&ndash;2026 Md. Muntasir Shihab

---

<div align="center">

Built with ❤️ for Bangladeshi students

[![GitHub](https://img.shields.io/badge/GitHub-md--muntasir--shihab-181717?style=flat-square&logo=github)](https://github.com/md-muntasir-shihab)
[![Live](https://img.shields.io/badge/Live-campuswaybd.web.app-6366F1?style=flat-square&logo=firebase)](https://campuswaybd.web.app)

</div>
