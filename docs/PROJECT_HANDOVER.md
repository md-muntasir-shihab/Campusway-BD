# CampusWay Project Handover

This handover is the current source of truth for repo structure, deployment posture, and known cloud/runtime gaps.

## Architecture

- `backend/`: Express + TypeScript API
- `frontend/`: Vite + React SPA
- `frontend-next/`: Next.js hybrid surface
- `.local-mongo/`: local MongoDB data

## Current Runtime Reality

- Active local backend port: `5003` in the standard dev flow
- Backend code fallback still defaults to `5000` if `PORT` is unset
- Active local frontend port: `5175`
- Active local Next port: `3000`
- JWT session auth is the live auth authority
- Firebase is used for hosting/storage/App Check readiness, not as the primary auth authority

## Deployment Status Verified On 2026-03-31

- Firebase frontend URL `https://campuswaybd.web.app/` returned HTTP `200`
- Azure backend health URL `https://campuswaybd-backend-d3dzazgdggdbghb0.southeastasia-01.azurewebsites.net/api/health` returned HTTP `503`
- Azure backend deploy workflow exists in `.github/workflows/azure-deploy.yml`
- Firebase hosting config exists in `frontend/firebase.json`
- Firebase project alias in `frontend/.firebaserc` is `campusway-prod`

## Critical Stability Guards Present In Code

- `backend/src/server.ts` keeps the missing-env startup exit disabled
- `backend/src/config/db.ts` keeps the Mongo connection startup exit disabled
- `backend/src/server.ts` wraps startup migration/default-setup/cron initialization in a `try/catch`
- `backend/src/controllers/authController.ts` still contains insecure JWT fallback secrets for production startup resilience

## Required Environment Keys

Do not store raw secret values in handover docs. Store only key names and secret-manager locations.

Backend baseline keys:

- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ADMIN_SECRET_PATH`
- `FRONTEND_URL`
- `ADMIN_ORIGIN`
- `PORT`

Backend keys additionally needed for newer features:

- `ENCRYPTION_KEY`
- `APP_CHECK_ENFORCED`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `APPLICATIONINSIGHTS_CONNECTION_STRING`

Frontend baseline keys:

- `VITE_API_BASE_URL`
- `VITE_ADMIN_PATH`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_APPCHECK_SITE_KEY`
- `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN`

Next hybrid keys:

- `NEXT_PUBLIC_API_BASE`
- `NEXT_PUBLIC_ADMIN_PATH`

## Safe Deployment Commands

Frontend hosting:

```powershell
cd frontend
npm run build
firebase deploy --only hosting
```

Backend CI/CD:

- push backend changes to the tracked GitHub branch
- merge into `main` only after validation
- `.github/workflows/azure-deploy.yml` deploys the backend container on push to `main`

## Current Cloud Blockers

- Azure backend is currently unhealthy from the public health endpoint check
- The handover must not contain raw JWT secrets, Firebase keys, or copied `.env` values
- The Firebase alias and live hosting domain should be treated as verified separately; do not assume the alias text alone proves the production site

## Rules For Future Handoffs

- never paste raw secret values into README, handover docs, or chat
- use secret names, vault references, or `.env.example` placeholders only
- if any real JWT secret was shared outside a secure channel, rotate it immediately
- treat live cloud status as time-sensitive and re-check before deployment decisions
