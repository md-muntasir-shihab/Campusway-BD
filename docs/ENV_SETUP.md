# CampusWay — Environment Setup Guide

Complete guide for setting up the local development environment for CampusWay.

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | ≥ 22.x | Use LTS |
| npm | ≥ 10.x | Bundled with Node |
| MongoDB | 8.x | Local instance |
| Git | Latest | Required |

---

## Step 1: Clone the Repository

```bash
git clone <repo-url> CampusWay
cd CampusWay
```

---

## Step 2: Set Up MongoDB Locally

MongoDB data is stored in `.local-mongo/data/` within the project root.

**Windows (PowerShell):**
```powershell
# Start MongoDB using local data directory
"C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath .\.local-mongo\data
```

Keep this running in a dedicated terminal. Default port: `27017`.

---

## Step 3: Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Required | Notes |
|----------|----------|-------|
| `PORT` | Yes | `5003` recommended (5000 is default) |
| `MONGODB_URI` | Yes | `mongodb://localhost:27017/campusway` |
| `JWT_SECRET` | Yes | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Yes | Same pattern, different value |
| `ENCRYPTION_KEY` | Yes | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `FRONTEND_URL` | Yes | `http://localhost:5175` |
| `ADMIN_ORIGIN` | Yes | `http://localhost:5175` |

**Leave blank for local dev (optional):**
- `SENDGRID_API_KEY`
- `SMTP_*`
- `AWS_S3_*`
- `FIREBASE_*` (only needed for Firebase Admin SDK features)
- `SSLCOMMERZ_*`

> ⚠️ **Security**: `ALLOW_TEST_OTP=true` and `TEST_OTP_CODE=123456` in `.env.example` are development-only. Set `ALLOW_TEST_OTP=false` in `.env.production`. Never commit real credentials.

---

## Step 4: Configure Frontend Environment

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Value |
|----------|----------|-------|
| `VITE_API_BASE_URL` | Yes | `http://localhost:5003/api` (or port from backend `.env`) |
| `VITE_APP_NAME` | No | `CampusWay` |
| `VITE_USE_MOCK_API` | No | `false` |

Firebase keys (`VITE_FIREBASE_*`) are optional — Firebase Auth features are not required for core local dev.

---

## Step 5: Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

---

## Step 6: Seed the Database

First-time setup requires seeding the database with default admin users and base data:

```bash
# From backend directory:
npm run seed

# For content pipeline data (news, universities, etc.):
npm run seed:content

# For default users:
npm run seed:default-users
```

---

## Step 7: Start Development Servers

**Terminal 1 — MongoDB** (if not already running)
```bash
"C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath .\.local-mongo\data
```

**Terminal 2 — Backend**
```bash
cd backend
npm run dev
# Server starts at: http://localhost:5003
```

**Terminal 3 — Frontend**
```bash
cd frontend
npm run dev
# App starts at: http://localhost:5175
```

---

## Step 8: Verify Health

```bash
# Check backend health
curl http://localhost:5003/api/health

# Check admin works
# Navigate to: http://localhost:5175/__cw_admin__/dashboard
# Or use admin secret login path

# Check public pages
# Navigate to: http://localhost:5175
```

---

## Running Migrations

If migrating an existing database schema:

```bash
cd backend

# Run all relevant migrations in order:
npm run migrate:university-management-v2
npm run migrate:university-categories-v1
npm run migrate:subscription-plans-v3
npm run migrate:student-dashboard-v2
npm run migrate:ops-indexes-v1
npm run migrate:communication-center-v1
npm run migrate:security-hardening
```

---

## Running Tests

```bash
# Backend unit/integration tests
cd backend
npm run test:home
npm run test:team

# Frontend E2E tests (requires backend + frontend running)
cd frontend
npm run e2e          # All E2E tests
npm run e2e:smoke    # Quick smoke test
```

---

## Default Admin Credentials

> **Check `backend/INITIAL_ACCESS_INFO.txt`** for seeded admin credentials.
> Do NOT share these. Change the password immediately after first login.

---

## Common Issues

| Issue | Solution |
|-------|---------|
| Port 5003 already in use | Change `PORT` in backend `.env` |
| MongoDB connection failed | Ensure mongod is running, check `MONGODB_URI` |
| Frontend can't reach API | Check `VITE_API_BASE_URL` matches backend port |
| Admin login fails | Verify seed was run, check `INITIAL_ACCESS_INFO.txt` |
| OTP not working | Set `ALLOW_TEST_OTP=true` and `TEST_OTP_CODE=123456` in dev |

See `TROUBLESHOOTING.md` for more.

---

## Production Environment Notes

- All variables are injected via Azure App Service Configuration (backend)
- Firebase Hosting environment variables go in `.env.production` (gitignored pattern — commit `.env.example` only)
- `ALLOW_TEST_OTP` must be `false` in production
- `NODE_ENV` must be `production` in production
- Use Azure Key Vault references for sensitive secrets (`JWT_SECRET`, `ENCRYPTION_KEY`, `MONGODB_URI`)
