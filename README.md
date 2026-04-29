<p align="center">
  <img src="https://img.shields.io/badge/CampusWay-Education_Platform-4F46E5?style=for-the-badge&logoColor=white" alt="CampusWay" />
</p>

<h1 align="center">🎓 CampusWay</h1>

<p align="center">
  <strong>বাংলাদেশের শিক্ষার্থীদের জন্য সম্পূর্ণ শিক্ষা প্ল্যাটফর্ম</strong><br/>
  <em>A comprehensive education platform for Bangladeshi students</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" />
</p>

---

## 📋 Overview

CampusWay is a full-stack monorepo education platform targeting:

- 🎯 **বিশ্ববিদ্যালয় ভর্তি পরীক্ষার্থী** — University admission candidates
- 📚 **মাধ্যমিক/উচ্চমাধ্যমিক শিক্ষার্থী** — SSC/HSC students
- 💼 **চাকরি প্রস্তুতি** — Job preparation (BCS, Bank, NTRCA)

## ✨ Key Features

| Module | Description |
|--------|-------------|
| **Exam Center** | 5-step exam builder wizard, auto-pick, scheduling, anti-cheat |
| **Question Bank** | 5-level hierarchy, bilingual (EN/BN), LaTeX, import/export |
| **Student Dashboard** | Analytics, leaderboards, streak tracking, XP/Coins |
| **Gamification** | League system, badges, battle mode (Brain Clash) |
| **Practice Mode** | Topic-based practice, mistake vault, adaptive difficulty |
| **Study Routine** | Weekly planner, exam countdowns, adherence tracking |
| **Doubt Solver** | AI explanations + community discussion threads |
| **Admin Panel** | Full CRUD, analytics dashboard, notification management |

## 🏗️ Tech Stack

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose
- **Auth:** JWT (access + refresh) + Firebase Admin SDK
- **Cache:** Upstash Redis
- **Validation:** Zod
- **AI:** Google Generative AI SDK
- **Testing:** Jest + fast-check (property-based)

### Frontend
- **Framework:** React 19 + TypeScript
- **Bundler:** Vite 6
- **Styling:** TailwindCSS 3
- **State:** TanStack Query + Context API
- **Routing:** React Router v7
- **Charts:** Recharts + Chart.js
- **Math:** KaTeX (LaTeX rendering)
- **Testing:** Vitest + Playwright

## 📁 Project Structure

```
CampusWay/
├── backend/
│   └── src/
│       ├── controllers/     # Route handlers
│       ├── models/          # Mongoose schemas (130+)
│       ├── services/        # Business logic
│       ├── routes/          # Express routes
│       ├── validators/      # Zod schemas
│       ├── middlewares/     # Auth, CSRF, rate-limit
│       ├── cron/            # Scheduled jobs
│       ├── realtime/        # SSE streams
│       ├── seeds/           # Database seeders
│       └── server.ts        # Entry point
├── frontend/
│   └── src/
│       ├── pages/           # Page components
│       ├── components/      # Reusable UI
│       ├── hooks/           # Custom React hooks
│       ├── api/             # API clients
│       ├── types/           # TypeScript interfaces
│       ├── routes/          # Route definitions
│       └── App.tsx          # Root component
├── scripts/
│   └── dev.sh              # Dev utility script
└── package.json             # Monorepo root
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB 7+ (local or Docker)
- Git

### Setup

```bash
# Clone
git clone https://github.com/md-muntasir-shihab/Campusway-BD.git
cd Campusway-BD

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Development

```bash
# Using dev script (recommended)
bash scripts/dev.sh start        # Start both servers
bash scripts/dev.sh start:be     # Backend only (port 5003)
bash scripts/dev.sh start:fe     # Frontend only (port 5175)

# Or using npm
npm run dev                      # Both servers
npm run dev:be                   # Backend only
npm run dev:fe                   # Frontend only
```

### Other Commands

```bash
bash scripts/dev.sh typecheck    # TypeScript check
bash scripts/dev.sh lint         # ESLint
bash scripts/dev.sh test         # All tests
bash scripts/dev.sh build        # Production build
bash scripts/dev.sh seed         # Database seeders
bash scripts/dev.sh seed:exam    # Exam system seeder
bash scripts/dev.sh clean        # Remove build artifacts
bash scripts/dev.sh check        # Full pre-push check
bash scripts/dev.sh db:start     # Start MongoDB (Docker)
```

## 🔑 Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5003) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `CORS_ORIGIN` | Allowed origins |
| `UPSTASH_REDIS_REST_URL` | Redis cache URL |

### Frontend (`frontend/.env`)
| Variable | Description |
|----------|-------------|
| `VITE_API_PROXY_TARGET` | Backend URL for dev proxy |
| `VITE_ADMIN_PATH` | Admin panel secret path |

## 🧪 Testing

```bash
# Backend (Jest + fast-check)
cd backend && npx jest --passWithNoTests

# Frontend (Vitest)
cd frontend && npx vitest run

# E2E (Playwright)
cd frontend && npx playwright test
```

## 👥 User Roles

| Role | Access |
|------|--------|
| `superadmin` | Full access, bypasses all restrictions |
| `admin` | Admin panel, management features |
| `examiner` | Create questions, exams, earn revenue |
| `student` | Dashboard, exams, practice, profile |
| `chairman` | University oversight dashboard |

## 📄 License

This project is proprietary. All rights reserved.

## 👨‍💻 Author

**Md. Muntasir Shihab**

---

<p align="center">
  <em>Built with ❤️ for Bangladeshi students</em>
</p>
