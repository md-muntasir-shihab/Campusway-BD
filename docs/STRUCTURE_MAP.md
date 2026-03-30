# CampusWay — Structure Map

Full architectural structure for the CampusWay workspace.
Last updated: Phase 0 Bootstrap.

---

## Root Workspace

```
CampusWay/
├── backend/              Express + TypeScript API (port 5003)
├── frontend/             React 19 + Vite SPA (port 5175)
├── frontend-next/        Next.js 15 placeholder (port 3000) — INACTIVE
├── docs/                 Internal developer documentation
├── .github/
│   ├── workflows/
│   │   ├── azure-deploy.yml    Backend CI/CD → Azure App Service
│   │   ├── codeql.yml          CodeQL security scanning
│   │   └── lint-and-typecheck.yml  Lint + typecheck quality gate (Phase 0 added)
│   └── dependabot.yml          Dependency update automation
├── .local-mongo/         Local MongoDB data directory (gitignored)
├── .gitignore            Root gitignore
├── AGENTS.md             AI agent development guide
└── README.md             Project readme
```

---

## Backend (`/backend`)

```
backend/
├── src/
│   ├── server.ts         Main Express server + middleware setup
│   ├── seed.ts           Initial database seed
│   ├── config/           Server configuration (app, DB)
│   ├── controllers/      Route action handlers
│   ├── middleware/        Thin wrappers (legacy → see middlewares/)
│   ├── middlewares/      Main middleware (auth, security, rate limit, etc.)
│   │   ├── auth.ts                 JWT auth + role enforcement
│   │   ├── securityGuards.ts       IP/pattern blocking
│   │   ├── securityRateLimit.ts    Rate limiting per route type
│   │   ├── sensitiveAction.ts      Sensitive action verification
│   │   ├── requestSanitizer.ts     Input sanitization
│   │   ├── twoPersonApproval.ts    Two-person approval flow
│   │   ├── validate.ts             express-validator handler
│   │   └── requestId.ts            Request ID injection
│   ├── models/           Mongoose models (129 files)
│   ├── routes/
│   │   ├── adminRoutes.ts              Main admin API (109KB)
│   │   ├── adminStudentMgmtRoutes.ts   Student management API (95KB)
│   │   ├── adminNotificationRoutes.ts  Notification/campaign API (42KB)
│   │   ├── adminProviderRoutes.ts      Provider management (8KB)
│   │   ├── adminStudentSecurityRoutes.ts
│   │   ├── publicRoutes.ts             Public-facing API (15KB)
│   │   ├── studentRoutes.ts            Student portal API (5KB)
│   │   ├── webhookRoutes.ts            Payment webhooks (10KB)
│   │   └── exams/                      Exam engine routes
│   ├── security/
│   │   └── permissionsMatrix.ts    Role-permission definitions
│   ├── services/         Business logic layer
│   ├── scripts/          Migrations + seeders
│   ├── jobs/             Background job definitions
│   ├── cron/             Scheduled cron jobs
│   ├── realtime/         SSE / real-time event handlers
│   ├── teamAccess/       Team access business logic
│   ├── types/            TypeScript type definitions
│   ├── utils/            Utility helpers
│   └── validators/       Input validation schemas
├── tests/                Jest + Supertest test files
├── dist/                 Compiled output (gitignored)
├── Dockerfile            Docker build configuration
├── .env.example          Environment variable template
├── .env                  Local dev environment (gitignored)
├── .env.production       Production environment template
├── package.json          Dependencies and scripts
└── tsconfig.json         TypeScript configuration
```

---

## Frontend (`/frontend`)

```
frontend/
├── src/
│   ├── App.tsx           Main app with all route definitions
│   ├── main.tsx          React entry point
│   ├── api/              API client functions (axios/fetch wrappers)
│   ├── components/
│   │   ├── admin/        Admin UI components
│   │   │   ├── campaigns/    Campaign Hub components
│   │   │   ├── finance/      Finance Center components
│   │   │   ├── students/     Student management components
│   │   │   ├── team/         Team access components
│   │   │   ├── approvals/    Action approval components
│   │   │   ├── help-center/  Help center admin
│   │   │   └── news/         News console components
│   │   ├── auth/         Auth-related components (ForceLogoutModal, etc.)
│   │   ├── exam/         Public exam components
│   │   ├── exams/        Student exam components
│   │   ├── home/         Homepage section components
│   │   ├── layout/       Navbar, Footer, layout shells
│   │   ├── profile/      Profile section components
│   │   ├── student/      Student portal components
│   │   ├── subscription/ Subscription UI components
│   │   ├── ui/           Shared UI primitives (buttons, cards, etc.)
│   │   └── university/   University card/list components
│   ├── hooks/            Custom React hooks
│   ├── lib/              Route constants and utilities
│   ├── mocks/            Mock API data (for VITE_USE_MOCK_API=true)
│   ├── pages/
│   │   ├── (public pages)         Home, Universities, News, etc.
│   │   ├── admin/                 Admin page components
│   │   │   ├── campaigns/         Campaign Console pages
│   │   │   ├── approvals/         Action approval page
│   │   │   ├── datahub/           Data hub pages
│   │   │   ├── exams/             Exam management pages
│   │   │   ├── help-center/       Help center admin page
│   │   │   ├── news/              News console page
│   │   │   ├── notifications/     Notification pages
│   │   │   ├── students/          Student management pages
│   │   │   ├── subscriptions/     Subscription pages
│   │   │   └── team/              Team access pages
│   │   ├── admin-news/            Admin news console
│   │   ├── chairman/             Chairman portal pages
│   │   ├── exams/                Exam runner pages
│   │   └── student/              Student portal pages
│   ├── routes/           Route path constants
│   ├── services/         API service layer
│   ├── styles/           Global CSS and theme styles
│   ├── types/            TypeScript type definitions
│   └── utils/            Frontend utilities
├── e2e/                  Playwright E2E test specs (37 files)
├── public/               Static assets (favicon, images, etc.)
├── dist/                 Production build output (gitignored)
├── .env.example          Frontend env template
├── .env                  Local dev env (gitignored)
├── .env.production       Production env template
├── .firebaserc           Firebase project config
├── firebase.json         Firebase Hosting config
├── storage.rules         Firebase Storage security rules
├── playwright.config.ts  Playwright E2E config
├── tailwind.config.js    Tailwind CSS configuration
├── vite.config.ts        Vite build configuration
└── package.json          Dependencies and scripts
```

---

## Docs (`/docs`)

| File | Purpose |
|------|---------|
| `PROJECT_OVERVIEW.md` | Project summary, stack, roles, ports |
| `STRUCTURE_MAP.md` | This document |
| `ROUTE_MAP.md` | All frontend route definitions |
| `MODULE_MAP.md` | Backend and frontend module breakdown |
| `ROLE_MATRIX.md` | Access control matrix |
| `DATA_MODEL_SUMMARY.md` | Entity relationships and key model fields |
| `ENV_SETUP.md` | Local dev environment setup guide |
| `RUNBOOK.md` | Operational runbook |
| `TESTING_BASELINE.md` | Testing strategy and test inventory |
| `SECURITY_BASELINE.md` | Security implementation status |
| `DESIGN_SYSTEM_NOTES.md` | UI design constraints and patterns |
| `SEED_DATA_EXPECTATIONS.md` | Test data requirements |
| `KNOWN_GAPS.md` | Known gaps, risks, and deferred items |
| `PHASE_HANDOFF_NOTES.md` | Phase completion notes and handoff items |

---

## GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `azure-deploy.yml` | Push to main (`backend/**`) | Build + deploy backend to Azure |
| `codeql.yml` | Push/PR to main + weekly schedule | Security code scanning |
| `lint-and-typecheck.yml` | Push/PR to main | Lint + typecheck quality gate |
| `dependabot.yml` | Weekly schedule | Dependency update PRs |
