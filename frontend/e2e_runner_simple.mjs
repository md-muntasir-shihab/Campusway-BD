#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const isWindows = process.platform === 'win32';
const cwd = 'F:\\CampusWay\\CampusWay\\frontend';

// Change to the frontend directory
process.chdir(cwd);

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║      CAMPUSWAY COMPREHENSIVE E2E TEST EXECUTION            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const TEST_CONFIGS = [
  {
    name: 'Smoke Tests (Full Suite)',
    command: 'npm',
    args: ['run', 'e2e:smoke'],
  },
  {
    name: 'Critical Theme/Responsive',
    command: 'npx',
    args: ['playwright', 'test', 'e2e/critical-theme-responsive.spec.ts'],
  },
  {
    name: 'Admin Smoke',
    command: 'npx',
    args: ['playwright', 'test', 'e2e/admin-smoke.spec.ts'],
  },
  {
    name: 'Student Smoke',
    command: 'npx',
    args: ['playwright', 'test', 'e2e/student-smoke.spec.ts'],
  },
  {
    name: 'Public Smoke',
    command: 'npx',
    args: ['playwright', 'test', 'e2e/public-smoke.spec.ts'],
  },
];

const results = [];
let totalPassed = 0;
let totalFailed = 0;
let totalTests = 0;

console.log('🚀 RUNNING TEST SUITES...\n');

for (let i = 0; i < TEST_CONFIGS.length; i++) {
  const config = TEST_CONFIGS[i];
  const testNum = i + 1;
  
  console.log(`[${testNum}/${TEST_CONFIGS.length}] Running: ${config.name}`);
  console.log(`    Command: ${config.command} ${config.args.join(' ')}`);
  
  try {
    const startTime = Date.now();
    
    const output = execSync(`${config.command} ${config.args.join(' ')}`, {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: isWindows ? 'cmd.exe' : '/bin/bash',
    });
    
    const duration = (Date.now() - startTime) / 1000;
    
    // Parse test results
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    const skippedMatch = output.match(/(\d+) skipped/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    
    results.push({
      name: config.name,
      status: 'passed',
      passed,
      failed,
      duration,
    });
    
    totalPassed += passed;
    totalFailed += failed;
    totalTests += passed + failed;
    
    console.log(`    ✓ PASSED (${passed} tests, ${duration.toFixed(2)}s)\n`);
  } catch (error) {
    const duration = 0;
    let output = error.stdout ? error.stdout.toString() : '';
    
    const passedMatch = output.match(/(\d+) passed/);
    const failedMatch = output.match(/(\d+) failed/);
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 1;
    
    results.push({
      name: config.name,
      status: 'failed',
      passed,
      failed,
      duration,
      error: error.message.substring(0, 500),
    });
    
    totalPassed += passed;
    totalFailed += failed;
    totalTests += passed + failed;
    
    console.log(`    ✗ FAILED (${failed} tests failed)\n`);
  }
}

// Print summary
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                    TEST SUMMARY REPORT                     ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📊 TEST RESULTS BY SUITE:');
console.log('─'.repeat(60));

results.forEach((result) => {
  const status = result.status === 'passed' ? '✓' : '✗';
  const duration = result.duration ? `${result.duration.toFixed(2)}s` : 'N/A';
  console.log(`${status} ${result.name.padEnd(35)} | Passed: ${result.passed}, Failed: ${result.failed}, Time: ${duration}`);
});

console.log('─'.repeat(60));
console.log(`\n📈 AGGREGATE STATISTICS:`);
console.log(`   Total Test Suites: ${results.length}`);
console.log(`   Total Tests: ${totalTests}`);
console.log(`   Passed: ${totalPassed}`);
console.log(`   Failed: ${totalFailed}`);
console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

if (totalFailed === 0) {
  console.log('\n✓ ALL TESTS PASSED!\n');
} else {
  console.log(`\n✗ ${totalFailed} TEST(S) FAILED - Review needed\n`);
}

console.log('╚════════════════════════════════════════════════════════════╝');

process.exit(totalFailed > 0 ? 1 : 0);
