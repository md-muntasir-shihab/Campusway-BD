# CampusWay — Security Baseline

This document tracks the current security implementation and readiness for each area.
Last updated: Phase 0 Bootstrap.

---

## Authentication

| Area | Status | Notes |
|------|--------|-------|
| Backend JWT auth | ✅ Implemented | `backend/src/middlewares/auth.ts` — full JWT validation, role extraction, session tracking |
| JWT refresh token | ✅ Implemented | Refresh token rotation in auth middleware |
| Student login | ✅ Implemented | OTP-verified login flow |
| Admin secret login path | ✅ Implemented | Configurable via `ADMIN_SECRET_PATH` env |
| Active session tracking | ✅ Implemented | `ActiveSession` model tracks live sessions |
| Force logout capability | ✅ Implemented | Admin can force-logout users |
| Password reset | ✅ Implemented | Token-based reset with expiry |

---

## Authorization / Access Control

| Area | Status | Notes |
|------|--------|-------|
| Role-based middleware | ✅ Implemented | `auth.ts` middleware handles role checks on routes |
| Frontend route guard | ✅ Implemented | `AdminGuardShell` component wraps admin routes |
| Module access hook | ✅ Implemented | `useModuleAccess` hook for role-based UI rendering |
| Sensitive action middleware | ✅ Implemented | `sensitiveAction.ts` for high-risk operations |
| Two-person approval | ✅ Implemented | `twoPersonApproval.ts` for destructive operations |
| Permissions matrix | ✅ Implemented | `backend/src/security/permissionsMatrix.ts` |

---

## Input Security

| Area | Status | Notes |
|------|--------|-------|
| Helmet (HTTP headers) | ✅ Active | Injected in `server.ts` |
| HPP (HTTP Parameter Pollution) | ✅ Active | In `server.ts` |
| express-mongo-sanitize | ✅ Active | Prevents NoSQL injection |
| express-rate-limit | ✅ Active | Per-endpoint rate limiting |
| express-validator | ✅ Active | Input validation on API routes |
| Request sanitizer middleware | ✅ Active | `requestSanitizer.ts` |

---

## Secret Management

| Area | Status | Notes |
|------|--------|-------|
| JWT secrets in env | ✅ Correct | Never hardcoded |
| Provider credentials encrypted | ✅ AES-256-GCM | `ENCRYPTION_KEY` in env, credentials encrypted before DB write |
| Frontend env separation | ✅ Pattern correct | `VITE_*` prefix vars only — no backend secrets in frontend |
| `.env.example` committed | ✅ Correct | Real `.env` gitignored |
| `ALLOW_TEST_OTP` in prod | ⚠️ Risk | **Must be `false` in production** — verify before release |
| Azure secret management | 📋 Planned | Azure Key Vault references recommended for `JWT_SECRET`, `ENCRYPTION_KEY`, `MONGODB_URI` |

---

## Firebase

| Area | Status | Notes |
|------|--------|-------|
| Firebase Admin SDK (backend) | ✅ Configured | `firebase-admin` package installed, env vars in `.env.example` |
| Firebase client SDK (frontend) | 🟡 Partial | SDK available, config vars in `.env.example` — actual `firebase.ts` config file not confirmed |
| Firebase App Check | ❌ Not implemented | Placeholder — needs proper implementation before production |
| Firebase Auth integration | 🟡 Partial | Frontend login currently uses custom JWT backend — Firebase Auth is optional layer |

**App Check Note**: Firebase App Check protects backend endpoints from unauthorized client access. Implementation requires:
1. Firebase project setup with App Check enabled
2. Frontend: `initializeAppCheck()` with `ReCaptchaV3Provider` or `CustomProvider`
3. Backend: Firebase Admin SDK `app.appCheck().verifyToken(token)` on public write endpoints

---

## Azure / Edge Security

| Area | Status | Notes |
|------|--------|-------|
| Azure App Service deployment | ✅ CI Ready | `azure-deploy.yml` workflow configured |
| WAF / Front Door | 📋 Planned | Must be configured in Azure portal — outside workspace |
| DDoS protection | 📋 Via Azure | Azure-level protection when WAF is enabled |
| HTTPS enforcement | 📋 Via Azure App Service | App Service handles TLS termination |
| Secret injection | 📋 Planned | Azure App Service Configuration or Key Vault references |

---

## Audit / Monitoring

| Area | Status | Notes |
|------|--------|-------|
| Audit log model | ✅ Present | `AuditLog.ts` model |
| Security alert log | ✅ Present | `SecurityAlertLog.ts` model |
| Login activity tracking | ✅ Present | `LoginActivity.ts` model |
| Rate limit event tracking | ✅ Present | `SecurityRateLimitEvent.ts` model |
| Admin action audit | ✅ Present | Tracked via `AuditLog` |
| Application Insights | 📋 Planned | Azure-side — configure in Phase 3 |

---

## Code Scanning

| Area | Status | Notes |
|------|--------|-------|
| CodeQL (GitHub Actions) | ✅ Active | Runs on push + PR to `main` |
| Dependabot | ✅ Active | Weekly dependency updates |
| No secrets in source | ✅ Currently | Verified in Phase 0 audit |

---

## Phase 3 Security Hardening Checklist

- [ ] Verify `ALLOW_TEST_OTP=false` in production env
- [ ] Implement Firebase App Check (with Firebase project configured)
- [ ] Audit `middleware/auth.ts` vs `middlewares/auth.ts` — consolidate
- [ ] Verify CORS_ORIGIN in production is correctly scoped
- [ ] Review sensitive action routes for proper middleware coverage
- [ ] Enable Azure WAF / Front Door (cloud-side)
- [ ] Audit export/copy contact actions for role enforcement
- [ ] Audit provider config endpoints for access control
- [ ] Verify no plaintext provider credentials in logs or API responses
- [ ] Check for any debug routes left active in production build
- [ ] Confirm `NODE_ENV=production` suppresses any dev-only endpoints

---

## Security Contact Policy

For any security findings:
1. Do NOT commit exploits or proofs
2. Document in `KNOWN_GAPS.md` under High Priority
3. Flag for immediate Phase 3 attention
