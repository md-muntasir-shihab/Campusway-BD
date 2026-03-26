# DEPLOY_CHECKLIST

Date: March 4, 2026

## 1) Pre-Deploy Gates
- [ ] `npm --prefix backend run build`
- [ ] `npm --prefix frontend run lint`
- [ ] `npm --prefix frontend run build`
- [ ] Optional: `npm --prefix backend run migrate:ops-indexes-v1`
- [ ] `/api/health` returns `status=OK` in target environment

## 2) Environment Contracts
### Backend required
- [ ] `MONGODB_URI` (or `MONGO_URI`)
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `FRONTEND_URL`
- [ ] `ADMIN_ORIGIN`
- [ ] `ADMIN_SECRET_PATH`

### Frontend required (production)
- [ ] `VITE_API_BASE_URL`

### Optional
- [ ] Storage keys (S3/Firebase)
- [ ] `OPENAI_API_KEY` (backend only)
- [ ] Payment webhook secrets

## 3) CORS / Proxy / Security
- [ ] CORS allowlist includes only expected frontend/admin origins
- [ ] `trust proxy` enabled in production deployment
- [ ] Helmet headers active (HSTS, noSniff, frameguard)
- [ ] Rate limiting enabled in production

## 4) SPA Deep-Link Rewrite Rules
Use one of the following for static hosting.

### Netlify `_redirects`
```txt
/* /index.html 200
```

### Vercel `vercel.json`
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Nginx
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Must support refresh on:
- `/universities`
- `/news/:slug`
- `/__cw_admin__/dashboard`

## 5) Runtime Smoke (Staging/Prod)
- [ ] `/api/health`
- [ ] Public pages: `/`, `/universities`, `/news`, `/exams`
- [ ] Auth pages: `/login`, `/__cw_admin__/login`
- [ ] Admin pages: dashboard, support center, payments, reports
- [ ] Security endpoints: approvals/jobs/security settings

## 6) Rollback Preparedness
- [ ] Previous backend artifact available
- [ ] Previous frontend artifact available
- [ ] DB backup snapshot confirmed
- [ ] `ROLLBACK_PLAN.md` reviewed by operator
