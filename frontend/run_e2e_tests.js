#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Change to frontend directory
process.chdir('F:\\CampusWay\\CampusWay\\frontend');

const tests = [
  { name: 'Smoke Tests', cmd: 'npm run e2e:smoke' },
  { name: 'Critical Theme/Responsive', cmd: 'npx playwright test e2e/critical-theme-responsive.spec.ts' },
  { name: 'Admin Smoke', cmd: 'npx playwright test e2e/admin-smoke.spec.ts' },
  { name: 'Student Smoke', cmd: 'npx playwright test e2e/student-smoke.spec.ts' },
  { name: 'Public Smoke', cmd: 'npx playwright test e2e/public-smoke.spec.ts' },
  { name: 'Home/News/Exams/Resources/Live', cmd: 'npx playwright test e2e/home-news-exams-resources-live.spec.ts' },
  { name: 'Admin Responsive All', cmd: 'npx playwright test e2e/admin-responsive-all.spec.ts' },
  { name: 'Exam Flow', cmd: 'npx playwright test e2e/exam-flow.spec.ts' },
  { name: 'Auth Session', cmd: 'npx playwright test e2e/auth-session.spec.ts' },
  { name: 'News Admin Routes', cmd: 'npx playwright test e2e/news-admin-routes.spec.ts' },
  { name: 'Finance Support Critical', cmd: 'npx playwright test e2e/finance-support-critical.spec.ts' },
  { name: 'University Admin Controls', cmd: 'npx playwright test e2e/university-admin-controls.spec.ts' },
  { name: 'Admin Team Security', cmd: 'npx playwright test e2e/admin-team-security.spec.ts' },
];

const results = [];

for (let i = 0; i < tests.length; i++) {
  const test = tests[i];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST ${i + 1}: ${test.name}`);
  console.log(`Command: ${test.cmd}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    const output = execSync(test.cmd, { 
      stdio: 'inherit',
      shell: true,
      timeout: 300000 // 5 minutes per test
    });
    results.push({
      testNum: i + 1,
      name: test.name,
      status: 'PASSED',
      error: null
    });
  } catch (error) {
    results.push({
      testNum: i + 1,
      name: test.name,
      status: 'FAILED',
      error: error.message
    });
    console.error(`\nTest ${i + 1} failed with error:\n${error.message}\n`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('FINAL RESULTS SUMMARY');
console.log(`${'='.repeat(60)}\n`);

let passed = 0;
let failed = 0;

results.forEach(result => {
  const statusIcon = result.status === 'PASSED' ? '✓' : '✗';
  console.log(`${statusIcon} Test ${result.testNum}: ${result.name} - ${result.status}`);
  if (result.status === 'PASSED') {
    passed++;
  } else {
    failed++;
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`Total Tests: ${results.length}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`${'='.repeat(60)}\n`);

process.exit(failed > 0 ? 1 : 0);
