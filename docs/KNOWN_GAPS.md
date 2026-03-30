# CampusWay — Known Gaps

This document tracks known gaps, partial implementations, deferred items, and risks that future phases must address.
Updated at: Phase 0 Bootstrap.

---

## 🔴 High Priority Gaps

### 1. Firebase App Check — Not Implemented
- **Gap**: Firebase App Check is referenced in `SECURITY_BASELINE.md` but not implemented in `frontend/src/`
- **Risk**: Public-facing endpoints don't have client authenticity verification
- **Phase**: Phase 3 (security hardening)
- **Action needed**: Create `src/config/firebase.ts` with App Check initialization once Firebase SDK is configured

### 2. `ALLOW_TEST_OTP` — Must Be Disabled in Production
- **Gap**: `.env.example` shows `ALLOW_TEST_OTP=true` and `TEST_OTP_CODE=123456`
- **Risk**: If deployed without overriding, OTP verification is bypassed
- **Phase**: Verify in Phase 3 pre-release checklist
- **Action needed**: Ensure `.env.production` has `ALLOW_TEST_OTP=false`

### 3. `About.tsx`, `Terms.tsx`, `Privacy.tsx` — Stub Pages
- **Gap**: These three public pages are 161-165 byte stubs (literally placeholder text)
- **Risk**: Navigation dead ends, poor public presentation
- **Phase**: Phase 1
- **Action needed**: Add minimal real content or redirect to proper pages

### 4. `StudentPayments.tsx` — Minimal Stub
- **Gap**: Student payments page is 1.2KB — nearly empty
- **Risk**: Students have no payment/due visibility
- **Phase**: Phase 1 or 2 as part of subscription/billing foundation

---

## 🟡 Medium Priority Gaps

### 5. Dual Middleware Directories — Unclear Authority
- **Gap**: `src/middleware/` (3 files) and `src/middlewares/` (8 files) coexist
- **Risk**: Confusion about which auth middleware is active
- **Phase**: Phase 1 cleanup — verify and consolidate
- **Action needed**: Confirm which files are imported by which routes; remove unused thin wrappers

### 6. Legacy `.model.ts` Files in Backend Models
- **Gap**: Files like `exam.model.ts`, `user.model.ts`, `newsItem.model.ts`, `subscription.model.ts` coexist with PascalCase partners (e.g., `Exam.ts`, `User.ts`, `News.ts`)
- **Risk**: Import confusion, potential duplicate Mongoose model registration
- **Phase**: Phase 1 audit
- **Action needed**: Check if `.model.ts` files are imported anywhere; if not, mark for removal

### 7. Root Workspace Clutter
- **Gap**: Root directory contains binary screenshot files (`admin-dashboard`, `contact-page`, `homepage-full`, etc.), PID files, and legacy dirs (`client/`, `server/`)
- **Risk**: Confusion for developers, large git history bloat
- **Phase**: Phase 0 (partially addressed in `.gitignore` upgrade)
- **Action needed**: Add root-level screenshot artifacts to `.gitignore`

### 8. No Lint/Typecheck CI Gate
- **Gap**: GitHub Actions only has `azure-deploy.yml` and `codeql.yml` — no lint/typecheck/test gate
- **Risk**: Bad code can be merged and deployed
- **Phase**: Phase 0 (CI workflow added)

### 9. `frontend-next/` — Unlaunched Placeholder
- **Gap**: Next.js 15 app exists but is not integrated into any flow
- **Risk**: Confusion — developers may wonder what to use
- **Phase**: Deferred — document clearly that this is a placeholder

### 10. No `CORS_ORIGIN` Production Value Documented
- **Gap**: `.env.example` has `CORS_ORIGIN=http://localhost:5173,http://localhost:5175` but production origins aren't clearly set
- **Risk**: CORS misconfiguration in production could either block or over-expose endpoints
- **Phase**: Phase 3 pre-release

---

## 🟢 Low Priority Gaps

### 11. Storybook Not Present
- **Decision**: Deliberately deferred per `DESIGN_SYSTEM_NOTES.md` — this is correct
- **Phase**: Post-Phase 3 if needed

### 12. Visual Regression Testing
- **Gap**: No visual regression tooling (Percy, Chromatic, etc.)
- **Risk**: Low for current team size
- **Deferred**: Post-Phase 3

### 13. Azure Key Vault Binding Not Documented
- **Gap**: SECURITY_BASELINE.md mentions Key Vault references but setup is not documented
- **Risk**: Secrets may be stored as plain App Settings
- **Phase**: Phase 3 security hardening

### 14. `chairman/ChairmanDashboard.tsx` — Functionality Unknown
- **Gap**: Chairman portal exists but scope/content is unclear
- **Phase**: Phase 1 audit

### 15. `AdminSettingsDashboardConfig.tsx` — 536 bytes
- **Gap**: Very small file — likely stub or empty placeholder
- **Phase**: Phase 1 review

---

## Communication System Gaps (Phase 2 Target)

| Gap | Notes |
|-----|-------|
| Trigger-to-delivery log connection not verified | Need runtime verification |
| Provider test-send flow not browser-tested | Needs runtime check |
| `NotificationOperationsPanel` (62KB) — needs audit | Very large, may have dead UI sections |
| Publish+Send flow — not fully verified end-to-end | Structural work exists, runtime verification pending |
| Wrong-recipient risk in bulk send — untested | Critical — Phase 2 + Phase 3 must verify |

---

## Phase 0 Deferred Items

| Item | Reason |
|------|--------|
| Firebase App Check implementation | Requires Firebase project credentials |
| Azure Key Vault binding setup | Cloud-side config, out of workspace scope |
| Full production observability | Azure Monitor/App Insights — cloud-side |
| Storybook | Deliberately deferred |
| Visual regression tooling | Not needed at current stage |
| `frontend-next/` integration | Placeholder — no priority |
