# CampusWay — Testing Baseline

Current test coverage and approach across backend and frontend.
Last updated: Phase 0 Bootstrap.

---

## Backend Tests (Jest + Supertest)

### Current Test Files

| Script | File | Coverage |
|--------|------|---------|
| `npm run test:home` | `tests/home/home.api.test.ts` | Home API endpoints |
| `npm run test:team` | `tests/team/` | Team management API |
| `npm run test:team:defaults` | `tests/team/team-defaults.test.ts` | Role defaults |
| `npm run test:team:api` | `tests/team/team-api.test.ts` | Team CRUD API |
| `npm run test:qbank:unit` | `src/scripts/qbank-unit-tests.ts` | Question bank unit |
| `npm run test:qbank:integration` | `src/scripts/qbank-integration-smoke.ts` | QB integration |

### Standards
- Every new API endpoint must have at minimum an integration test proving:
  - Data boundaries
  - Permission enforcement (unauthorized vs authorized)
  - Input validation (reject bad data)
- Use `npm run e2e:prepare` to set up test database state
- Use `npm run e2e:restore` to clean up after test runs
- Use `mongodb-memory-server` for isolated unit tests

---

## Frontend E2E Tests (Playwright)

### Current Spec Count: 37 files

### Key Spec Categories

| Category | Spec Files |
|----------|-----------|
| Public pages | `public-smoke.spec.ts`, `home-master.spec.ts`, `public-design-visibility.spec.ts` |
| Authentication | `auth-session.spec.ts`, `login-unification.spec.ts`, `forgot-password-contact.spec.ts` |
| Student portal | `student-smoke.spec.ts`, `student-portal-theme-responsive.spec.ts` |
| Admin panel | `admin-smoke.spec.ts`, `admin-responsive-all.spec.ts`, `admin-button-font-micro.spec.ts` |
| University | `university-admin-controls.spec.ts`, `open-universities-full.spec.ts` |
| Exams | `exam-flow.spec.ts`, `exam-attempt-critical.spec.ts` |
| News | `news-admin-routes.spec.ts`, `home-news-exams-resources-live.spec.ts` |
| Communication | `campaignHub.spec.ts`, `campaignHubAudit.spec.ts` |
| Finance/Support | `finance-support-critical.spec.ts` |
| Access Control | `cross-role-permissions.spec.ts` |
| Theme/Responsive | `critical-theme-responsive.spec.ts`, `role-theme-persistence.spec.ts` |
| Settings | `settings-propagation.spec.ts`, `runtime-flags.spec.ts` |
| Import/Export | `import-export-bulk.spec.ts` |

### Running E2E Tests

```bash
# Full test suite  
cd frontend && npm run e2e

# Quick smoke (core layout + API heartbeat)
npm run e2e:smoke

# Headed (visible browser)
npm run e2e:headed

# Specific spec
npx playwright test e2e/admin-smoke.spec.ts

# With UI
npx playwright test --ui
```

### Playwright Config
- Config: `frontend/playwright.config.ts`
- Browsers: Chromium (default)
- E2E test dir: `frontend/e2e/`
- Helpers: `frontend/e2e/helpers.ts`

---

## Local Test Running Strategy

**Prerequisites:**
1. MongoDB running at `localhost:27017`
2. Backend running at `localhost:5003`
3. Frontend running at `localhost:5175`

**Terminal setup:**
```bash
# Terminal 1: MongoDB
"C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath .\.local-mongo\data

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev

# Terminal 4: Tests
cd frontend && npm run e2e:smoke  # quick check
# OR
cd frontend && npm run e2e        # full suite
```

---

## E2E Database Management

```bash
# Prepare DB for E2E testing (seed test users, test data):
cd backend && npm run e2e:prepare

# Restore DB to baseline after tests:
cd backend && npm run e2e:restore

# DB snapshot for point-in-time restore:
npm run e2e:db-snapshot
npm run e2e:db-snapshot:restore
```

---

## Phase 3 Testing Requirements

Phase 3 must execute and pass these minimum test flows:

### Smoke Tests
- [ ] `public-smoke.spec.ts` — homepage and public pages load
- [ ] `home-master.spec.ts` — homepage sections render correctly
- [ ] `admin-smoke.spec.ts` — admin dashboard loads
- [ ] `student-smoke.spec.ts` — student portal loads

### Critical Flows (must pass)
- [ ] `exam-attempt-critical.spec.ts` — exam taking flow
- [ ] `finance-support-critical.spec.ts` — finance and support flows
- [ ] `auth-session.spec.ts` — session management
- [ ] `cross-role-permissions.spec.ts` — role access boundaries
- [ ] `campaignHubAudit.spec.ts` — communication hub correctness

### Theme / Responsive (must pass)
- [ ] `critical-theme-responsive.spec.ts`
- [ ] `student-portal-theme-responsive.spec.ts`
- [ ] `admin-responsive-all.spec.ts`

---

## Security Payload Smoke Test

```bash
cd backend && npm run security:payload-smoke
```
Tests for common injection and security payload resilience on API endpoints.

---

## Test Data Requirements

See `SEED_DATA_EXPECTATIONS.md` for full seed data requirements.

Key test accounts needed:
- `admin@campusway.test` — full admin
- `moderator@campusway.test` — moderator role
- `editor@campusway.test` — editor role
- `student-active@campusway.test` — active subscriber
- `student-expired@campusway.test` — expired subscription
- `student-renewal@campusway.test` — renewal due
