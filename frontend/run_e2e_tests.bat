@echo off
cd /d "F:\CampusWay\CampusWay\frontend"

echo.
echo ========================================
echo TEST 1: Running npm run e2e:smoke
echo ========================================
npm run e2e:smoke
echo Test 1 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 2: Running critical-theme-responsive.spec.ts
echo ========================================
npx playwright test e2e/critical-theme-responsive.spec.ts
echo Test 2 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 3: Running admin-smoke.spec.ts
echo ========================================
npx playwright test e2e/admin-smoke.spec.ts
echo Test 3 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 4: Running student-smoke.spec.ts
echo ========================================
npx playwright test e2e/student-smoke.spec.ts
echo Test 4 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 5: Running public-smoke.spec.ts
echo ========================================
npx playwright test e2e/public-smoke.spec.ts
echo Test 5 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 6: Running home-news-exams-resources-live.spec.ts
echo ========================================
npx playwright test e2e/home-news-exams-resources-live.spec.ts
echo Test 6 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 7: Running admin-responsive-all.spec.ts
echo ========================================
npx playwright test e2e/admin-responsive-all.spec.ts
echo Test 7 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 8: Running exam-flow.spec.ts
echo ========================================
npx playwright test e2e/exam-flow.spec.ts
echo Test 8 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 9: Running auth-session.spec.ts
echo ========================================
npx playwright test e2e/auth-session.spec.ts
echo Test 9 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 10: Running news-admin-routes.spec.ts
echo ========================================
npx playwright test e2e/news-admin-routes.spec.ts
echo Test 10 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 11: Running finance-support-critical.spec.ts
echo ========================================
npx playwright test e2e/finance-support-critical.spec.ts
echo Test 11 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 12: Running university-admin-controls.spec.ts
echo ========================================
npx playwright test e2e/university-admin-controls.spec.ts
echo Test 12 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo TEST 13: Running admin-team-security.spec.ts
echo ========================================
npx playwright test e2e/admin-team-security.spec.ts
echo Test 13 Exit Code: %ERRORLEVEL%

echo.
echo ========================================
echo ALL TESTS COMPLETED
echo ========================================
