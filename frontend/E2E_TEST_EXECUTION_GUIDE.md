# CAMPUSWAY COMPREHENSIVE E2E TEST EXECUTION GUIDE

## Executive Summary
**Testing Date**: {EXECUTION_DATE}
**Test Environment**: Windows 10/11 with Node.js + npm
**Frontend Port**: 5175
**Backend Port**: 5003
**Test Framework**: Playwright 1.52.0

---

## TEST ENVIRONMENT VERIFICATION

### Pre-Execution Checklist

#### 1. Server Connectivity
- [ ] Frontend server accessible at http://127.0.0.1:5175
- [ ] Backend server accessible at http://127.0.0.1:5003
- [ ] Backend health endpoint responsive at http://127.0.0.1:5003/api/health

#### 2. Environment Setup
- [ ] Node.js version: v18+ (check with: `node --version`)
- [ ] npm version: v8+ (check with: `npm --version`)
- [ ] Playwright installed (check with: `npm list @playwright/test`)
- [ ] All dependencies installed (check with: `npm list`)

#### 3. Test Credentials
The following test accounts are configured in `e2e/helpers.ts`:

**Admin Accounts:**
- Desktop: `e2e_admin_desktop@campusway.local` / `E2E_Admin#12345`
- Mobile: `e2e_admin_mobile@campusway.local` / `E2E_Admin#12345`

**Student Accounts:**
- Desktop: `e2e_student_desktop@campusway.local` / `E2E_Student#12345`
- Mobile: `e2e_student_mobile@campusway.local` / `E2E_Student#12345`
- Session: `e2e_student_session@campusway.local` / `E2E_Student#12345`

(Configurable via environment variables: E2E_*_EMAIL and E2E_*_PASSWORD)

---

## TEST EXECUTION COMMANDS

### Option 1: Automated Smoke Test Suite
```bash
cd F:\CampusWay\CampusWay\frontend
npm run e2e:smoke
```
- **Duration**: ~180 seconds
- **Coverage**: Critical user flows (admin, student, public)
- **Servers**: Auto-starts frontend (5175) and backend (5003)
- **Cleanup**: Auto-cleans up servers on completion

### Option 2: Run Specific Test Suites

#### Run all tests (full suite)
```bash
npx playwright test
```

#### Run smoke tests only
```bash
npx playwright test e2e/admin-smoke.spec.ts e2e/student-smoke.spec.ts e2e/public-smoke.spec.ts
```

#### Run individual test files
```bash
npx playwright test e2e/critical-theme-responsive.spec.ts
npx playwright test e2e/admin-responsive-all.spec.ts
npx playwright test e2e/exam-flow.spec.ts
npx playwright test e2e/auth-session.spec.ts
npx playwright test e2e/finance-support-critical.spec.ts
npx playwright test e2e/university-admin-controls.spec.ts
```

### Option 3: Run with Visible Browser (Debugging)
```bash
npm run e2e:headed
```

### Option 4: Run Specific Test with Custom Config
```bash
E2E_BASE_URL=http://127.0.0.1:5175 E2E_API_BASE_URL=http://127.0.0.1:5003 npx playwright test e2e/admin-smoke.spec.ts
```

---

## CRITICAL TEST SUITES

### 1. Admin Smoke Tests (`admin-smoke.spec.ts`)
**Purpose**: Verify core admin dashboard functionality
**Coverage**:
- Admin login flow
- Dashboard rendering
- Navigation to key sections (Exams, Students, Settings)
- Sidebar/menu functionality
- Mobile responsiveness

**Expected**: ~120 seconds, ✓ All tests pass

### 2. Student Smoke Tests (`student-smoke.spec.ts`)
**Purpose**: Verify core student portal functionality
**Coverage**:
- Student login flow
- Dashboard rendering
- Portal navigation
- Responsive design (desktop and mobile)

**Expected**: ~120 seconds, ✓ All tests pass

### 3. Public Smoke Tests (`public-smoke.spec.ts`)
**Purpose**: Verify public-facing pages
**Coverage**:
- Landing page rendering
- University listing
- Public pages accessibility
- Mobile responsiveness

**Expected**: ~120 seconds, ✓ All tests pass

### 4. Critical Theme/Responsive (`critical-theme-responsive.spec.ts`)
**Purpose**: Verify visual consistency and responsive behavior
**Coverage**:
- Theme switching (light/dark)
- Responsive breakpoints
- Layout adaptation
- Visual regression checks

**Expected**: ~120 seconds, ✓ All tests pass

### 5. Auth/Session Tests (`auth-session.spec.ts`)
**Purpose**: Verify authentication and session management
**Coverage**:
- Login/logout flows
- Session persistence
- Token refresh
- Auth redirects

**Expected**: ~120 seconds, ✓ All tests pass

### 6. Exam Flow Tests (`exam-flow.spec.ts`)
**Purpose**: Verify exam-related workflows
**Coverage**:
- Exam navigation
- Exam attempt flow
- Question rendering
- Submit functionality

**Expected**: ~120 seconds, ✓ All tests pass

### 7. News Admin Routes (`news-admin-routes.spec.ts`)
**Purpose**: Verify news/content admin features
**Coverage**:
- Admin news management
- Content creation/editing
- Publish workflows

**Expected**: ~120 seconds, ✓ All tests pass

### 8. Finance Support Critical (`finance-support-critical.spec.ts`)
**Purpose**: Verify payment and support features
**Coverage**:
- Finance dashboard
- Payment integration
- Support ticket flows

**Expected**: ~120 seconds, ✓ All tests pass

### 9. University Admin Controls (`university-admin-controls.spec.ts`)
**Purpose**: Verify university-level administration
**Coverage**:
- University settings
- Admin controls
- Permission management

**Expected**: ~120 seconds, ✓ All tests pass

### 10. Admin Responsive (`admin-responsive-all.spec.ts`)
**Purpose**: Verify admin panel responsiveness
**Coverage**:
- Desktop layout (1440x900)
- Mobile layout (Pixel 7 - 412x915)
- Touch interactions
- Menu responsiveness

**Expected**: ~240 seconds (tests both desktop and mobile), ✓ All tests pass

### 11. Admin Team Security (`admin-team-security.spec.ts`)
**Purpose**: Verify security and team management features
**Coverage**:
- Team member management
- Role-based access control
- Security settings
- Permission validation

**Expected**: ~120 seconds, ✓ All tests pass

### 12. Home Page Tests (`home-news-exams-resources-live.spec.ts`)
**Purpose**: Verify home page and main content areas
**Coverage**:
- Home page rendering
- News section
- Exams display
- Resources section
- Live data integration

**Expected**: ~120 seconds, ✓ All tests pass

---

## TEST CONFIGURATION (playwright.config.ts)

```typescript
// Timeout per test
timeout: 60_000 (60 seconds)

// Parallel execution
fullyParallel: false (sequential)

// Worker processes
workers: 1 (configurable via PW_WORKERS env var)

// Reporters
- Console list output
- HTML report to: ../qa-artifacts/playwright-report

// Browser Projects
- Chromium Desktop (1440x900)
- Chromium Mobile (Pixel 7: 412x915)

// Screenshot/Video
- Screenshots: only-on-failure
- Videos: retain-on-failure
- Traces: on-first-retry

// Timeouts
- Navigation: 30 seconds
- Action: 15 seconds
```

---

## EXPECTED TEST RESULTS

### Success Criteria
- All critical smoke tests: ✓ PASS
- Admin responsive tests: ✓ PASS (both desktop and mobile)
- Authentication tests: ✓ PASS
- No critical errors or console errors
- No network failures (200-399 HTTP status)

### Known Limitations
- Tests run sequentially (no parallel execution) for stability
- Full test suite takes ~30-45 minutes
- Some tests may timeout if servers are slow (>30s response times)

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Tests timeout at login | Backend not responding | Start backend: `npm --prefix ../backend run dev` |
| Browser not found | Playwright not installed | Run: `npm install` |
| Base URL errors | Wrong port configured | Check ENV: `E2E_BASE_URL` and `E2E_API_BASE_URL` |
| Authentication fails | Wrong test credentials | Verify seeded accounts exist in database |
| Mobile tests fail | Device profile not found | Update Playwright: `npm update @playwright/test` |

---

## REPORT GENERATION

### HTML Report
After tests complete, open the HTML report:
```bash
# Report location
../qa-artifacts/playwright-report/index.html

# Auto-open (if available)
npx playwright show-report
```

### Console Output
The test runner outputs:
- Test names and status (✓/✗)
- Test timing
- Failed test details
- Error messages and stack traces

### Artifact Locations
- **Test Results**: `test-results/` (metadata)
- **Screenshots**: `test-results/` (on failure)
- **Videos**: `test-results/` (on failure)
- **HTML Report**: `../qa-artifacts/playwright-report/`
- **Trace Files**: `test-results/` (on first retry)

---

## EXECUTION STEPS

### Step 1: Verify Prerequisites
```powershell
# Check Node.js
node --version

# Check npm
npm --version

# Verify dependencies installed
npm list @playwright/test
```

### Step 2: Start Servers (if not already running)
```bash
# Terminal 1 - Start backend
cd F:\CampusWay\CampusWay\backend
npm run dev
# Should show: "Server running on port 5003"

# Terminal 2 - Start frontend
cd F:\CampusWay\CampusWay\frontend
npm run dev
# Should show: "VITE v6.0.5 ready in ... ms"
```

### Step 3: Run Tests
```bash
# Terminal 3 - Run comprehensive E2E tests
cd F:\CampusWay\CampusWay\frontend
npm run e2e:smoke
# Or for full suite:
npm run e2e
```

### Step 4: Monitor Execution
- Watch console for test progress
- Check for errors/failures in real-time
- Review failed tests immediately

### Step 5: Generate Report
```bash
# View HTML report
npx playwright show-report
```

### Step 6: Analyze Results
- Count passed/failed tests
- Review failed test details
- Check error messages
- Review screenshots/videos (if available)
- Document issues found

---

## TEST RESULTS TEMPLATE

### Test Run Summary
- **Execution Date**: {DATE}
- **Execution Time**: {TIME}
- **Total Duration**: {DURATION}
- **Environment**: Windows 10/11, Node.js v{VERSION}

### Test Suite Results
| Test Suite | Duration | Passed | Failed | Status |
|-----------|----------|--------|--------|--------|
| Smoke Tests | XXXs | X | X | ✓/✗ |
| Admin Smoke | XXXs | X | X | ✓/✗ |
| Student Smoke | XXXs | X | X | ✓/✗ |
| Public Smoke | XXXs | X | X | ✓/✗ |
| Auth/Session | XXXs | X | X | ✓/✗ |
| Critical Theme | XXXs | X | X | ✓/✗ |
| Exam Flow | XXXs | X | X | ✓/✗ |
| **TOTALS** | **XXXs** | **XX** | **X** | **✓/✗** |

### Detailed Failures (if any)
```
Test: {TEST_NAME}
File: {FILE_PATH}
Error: {ERROR_MESSAGE}
Stack: {STACK_TRACE}
Status Code: {HTTP_STATUS}
```

### Critical Issues Found
- [ ] Authentication broken
- [ ] Page crashes
- [ ] Network failures
- [ ] Performance degradation
- [ ] Security issues

### Recommendations
- All tests passing: ✓ Ready for deployment
- Minor failures: Review before deployment
- Critical failures: Fix required before deployment

---

## RUNNING TESTS PROGRAMMATICALLY

### Using Node.js Script
```javascript
import { spawn } from 'child_process';

const child = spawn('npm', ['run', 'e2e:smoke'], {
  cwd: 'F:\\CampusWay\\CampusWay\\frontend',
  stdio: 'inherit',
});

child.on('close', (code) => {
  console.log(`Tests completed with code: ${code}`);
});
```

### Using npm API
```javascript
import { execSync } from 'child_process';

try {
  const output = execSync('npm run e2e:smoke', {
    cwd: 'F:\\CampusWay\\CampusWay\\frontend',
    encoding: 'utf-8'
  });
  console.log(output);
} catch (error) {
  console.error('Tests failed:', error.message);
}
```

---

## CONTINUOUS INTEGRATION SETUP

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
        working-directory: ./CampusWay/frontend
      - run: npm run e2e:smoke
        working-directory: ./CampusWay/frontend
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: qa-artifacts/playwright-report/
```

---

## ADDITIONAL RESOURCES

### Test Files
- **Helpers**: `e2e/helpers.ts` - Login, health tracking utilities
- **Config**: `playwright.config.ts` - Playwright configuration
- **Scripts**: `scripts/run-e2e-smoke.mjs` - Test orchestration

### Documentation
- Playwright Docs: https://playwright.dev/
- Project README: `../../README.md`
- Backend E2E Docs: `../backend/README.md`

### Debugging Tips
1. Run with `--headed` to see browser
2. Enable debug mode: `DEBUG=pw:api npx playwright test`
3. Check screenshots/videos in `test-results/`
4. Review trace files: `npx playwright show-trace`

---

## CONTACT & SUPPORT

For test failures or environment issues:
1. Review error messages in console
2. Check server connectivity (ports 5175, 5003)
3. Verify test credentials are seeded
4. Review GitHub Issues for similar problems
5. Contact development team

---

*Last Updated: 2024*
*CampusWay E2E Testing Framework*
