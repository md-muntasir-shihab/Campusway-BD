# CampusWay — Runbook

Operational runbook for running, maintaining, and troubleshooting CampusWay.
Last updated: Phase 0 Bootstrap.

---

## 1. Starting the Stack (Local)

### Full Stack Start

```bash
# Terminal 1 — MongoDB
"C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath D:\CampusWay\CampusWay\.local-mongo\data

# Terminal 2 — Backend
cd D:\CampusWay\CampusWay\backend
npm run dev
# Expected: "Server running on port 5003" (or configured PORT)

# Terminal 3 — Frontend
cd D:\CampusWay\CampusWay\frontend
npm run dev
# Expected: Vite server at http://localhost:5175
```

### Quick Run Scripts (Windows)
```powershell
# From project root:
.\run_project.ps1
```

---

## 2. Health Checks

```bash
# Backend health
curl http://localhost:5003/api/health

# Public API check
curl http://localhost:5003/api/public/home-settings

# Admin API check (requires auth)
curl -H "Authorization: Bearer <token>" http://localhost:5003/api/admin/dashboard
```

---

## 3. Database Operations

### Check DB Status
```bash
cd backend
node check-home.js       # Check home settings
node list-collections.js # List all collections
```

### Run Migrations (in safe order)
```bash
cd backend
npm run migrate:university-management-v2
npm run migrate:university-categories-v1
npm run migrate:subscription-plans-v3
npm run migrate:student-dashboard-v2
npm run migrate:ops-indexes-v1
npm run migrate:communication-center-v1
npm run migrate:security-hardening
```

### E2E Database Management
```bash
npm run e2e:prepare          # Seed E2E test data
npm run e2e:restore          # Restore to baseline
npm run e2e:db-snapshot      # Take snapshot
npm run e2e:db-snapshot:restore  # Restore from snapshot
```

---

## 4. Admin Password Reset

If admin password is lost:

```bash
cd backend
tsx src/reset-admin.ts
# Or:
tsx src/reset-password-final.ts
```

Check `backend/INITIAL_ACCESS_INFO.txt` for seeded admin credentials.

---

## 5. Seed Operations

```bash
cd backend

# Full bootstrap seed
npm run seed

# Seed content pipeline (news, universities, etc.)
npm run seed:content

# Seed default users only
npm run seed:default-users
```

---

## 6. Build Operations

```bash
# Build backend for production
cd backend
npm run build
# Output: backend/dist/

# Build frontend for production
cd frontend
npm run build
# Output: frontend/dist/

# Preview frontend production build
cd frontend
npm run preview
```

---

## 7. Deploying to Production

### Automatic (GitHub Actions)
- Push to `main` branch triggers `azure-deploy.yml`
- Docker image is built and pushed to Azure Container Registry
- Azure App Service is updated with new image

### Manual Docker Build
```bash
cd backend
docker build -t campusway-backend:latest .
docker push <registry>/campusway-backend:latest
```

### Frontend Deployment (Firebase Hosting)
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

---

## 8. Log Access

### Backend Logs (Local)
```bash
# Backend process logs
cat backend/backend-run.log
cat backend/backend-dev-agent.log
```

### Azure Logs (Production)
- Access via Azure Portal → App Service → Monitoring → Log Stream
- Or via Azure CLI: `az webapp log tail --name <app-name> --resource-group <rg>`

---

## 9. Security Operations

### Enable Testing Access Mode (Dev Only)
```bash
cd backend
npm run security:enable-testing-access-mode
```

### Security Payload Smoke Test
```bash
cd backend
npm run security:payload-smoke
```

### Force Logout a User
Via Admin Panel: Security Center → Active Sessions → Force Logout

---

## 10. Communication System Operations

### Test Send (from Admin Panel)
Admin → Communication Hub → Campaigns → New Campaign → Test Send

### Check Delivery Logs
Admin → Communication Hub → Logs

### Check Trigger Status
Admin → Communication Hub → Smart Triggers

---

## 11. Known Operational Issues

| Issue | Workaround |
|-------|-----------|
| Backend won't start — port in use | Change `PORT` in `.env`, run `netstat -ano | findstr :5003` to find PID |
| MongoDB won't start — data dir missing | `mkdir D:\CampusWay\CampusWay\.local-mongo\data` |
| Frontend 404 on refresh | Normal SPA behavior in dev — production uses `firebase.json` rewrites |
| Admin login blank page | Check browser console, verify backend is running |
| OTP verification failing | In dev: set `ALLOW_TEST_OTP=true`, `TEST_OTP_CODE=123456` |

See `docs/TROUBLESHOOTING.md` for extended issue list.

---

## 12. Release Checklist

Before any production release:

- [ ] `npm run build` succeeds (backend + frontend)
- [ ] `npm run test:home` passes
- [ ] `npm run test:team` passes  
- [ ] `npm run e2e:smoke` passes
- [ ] `ALLOW_TEST_OTP=false` confirmed in production env
- [ ] `NODE_ENV=production` confirmed
- [ ] `CORS_ORIGIN` confirmed for production domain only
- [ ] No test secrets in `.env.production`
- [ ] Azure App Service configuration updated
- [ ] Firebase Hosting deployed
- [ ] Health check passes on production URL
