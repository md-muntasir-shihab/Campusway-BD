#!/usr/bin/env node
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import net from 'net';

const isWindows = process.platform === 'win32';
const NPM_BIN = isWindows ? 'npm.cmd' : 'npm';
const NPX_BIN = isWindows ? 'npx.cmd' : 'npx';

const BACKEND_PORT = 5003;
const FRONTEND_PORT = 5175;
const BACKEND_ORIGIN = `http://127.0.0.1:${BACKEND_PORT}`;
const BASE_URL = `http://127.0.0.1:${FRONTEND_PORT}`;

// Test files to run in order
const TEST_SUITES = [
  { name: 'Smoke Tests', command: 'npm', args: ['run', 'e2e:smoke'], timeout: 180000 },
  { name: 'Critical Theme/Responsive', command: NPX_BIN, args: ['playwright', 'test', 'e2e/critical-theme-responsive.spec.ts'], timeout: 120000 },
  { name: 'Admin Smoke', command: NPX_BIN, args: ['playwright', 'test', 'e2e/admin-smoke.spec.ts'], timeout: 120000 },
  { name: 'Student Smoke', command: NPX_BIN, args: ['playwright', 'test', 'e2e/student-smoke.spec.ts'], timeout: 120000 },
  { name: 'Public Smoke', command: NPX_BIN, args: ['playwright', 'test', 'e2e/public-smoke.spec.ts'], timeout: 120000 },
  { name: 'Home/News/Exams/Resources/Live', command: NPX_BIN, args: ['playwright', 'test', 'e2e/home-news-exams-resources-live.spec.ts'], timeout: 120000 },
  { name: 'Admin Responsive', command: NPX_BIN, args: ['playwright', 'test', 'e2e/admin-responsive-all.spec.ts'], timeout: 120000 },
  { name: 'Exam Flow', command: NPX_BIN, args: ['playwright', 'test', 'e2e/exam-flow.spec.ts'], timeout: 120000 },
  { name: 'Auth/Session', command: NPX_BIN, args: ['playwright', 'test', 'e2e/auth-session.spec.ts'], timeout: 120000 },
  { name: 'News Admin Routes', command: NPX_BIN, args: ['playwright', 'test', 'e2e/news-admin-routes.spec.ts'], timeout: 120000 },
  { name: 'Finance Support Critical', command: NPX_BIN, args: ['playwright', 'test', 'e2e/finance-support-critical.spec.ts'], timeout: 120000 },
  { name: 'University Admin Controls', command: NPX_BIN, args: ['playwright', 'test', 'e2e/university-admin-controls.spec.ts'], timeout: 120000 },
  { name: 'Admin Team Security', command: NPX_BIN, args: ['playwright', 'test', 'e2e/admin-team-security.spec.ts'], timeout: 120000 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isUrlHealthy(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port);
  });
}

async function checkServers() {
  console.log('\n=== SERVER STATUS CHECK ===');
  const frontendHealthy = await isUrlHealthy(BASE_URL);
  const backendHealthy = await isUrlHealthy(`${BACKEND_ORIGIN}/api/health`);
  
  console.log(`Frontend (${BASE_URL}): ${frontendHealthy ? '✓ RUNNING' : '✗ NOT RUNNING'}`);
  console.log(`Backend (${BACKEND_ORIGIN}): ${backendHealthy ? '✓ RUNNING' : '✗ NOT RUNNING'}`);
  
  if (!frontendHealthy || !backendHealthy) {
    console.log('\n⚠️  WARNING: One or more servers are not running.');
    console.log('Tests will proceed but may fail. Start servers first:');
    console.log('  Frontend: npm run dev (port 5175)');
    console.log('  Backend: npm --prefix ../backend run dev (port 5003)');
  }
  
  return { frontendHealthy, backendHealthy };
}

function runTest(testSuite) {
  return new Promise((resolve) => {
    console.log(`\n>>> Running: ${testSuite.name}`);
    console.log(`    Command: ${testSuite.command} ${testSuite.args.join(' ')}`);
    
    const startTime = Date.now();
    let output = '';
    let errorOutput = '';
    
    const child = spawn(testSuite.command, testSuite.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        E2E_BASE_URL: BASE_URL,
        E2E_API_BASE_URL: BACKEND_ORIGIN,
      },
    });
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(data);
    });
    
    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
      process.stderr.write(data);
    });
    
    const timeout = setTimeout(() => {
      child.kill();
      resolve({
        name: testSuite.name,
        exitCode: -1,
        duration: Date.now() - startTime,
        output,
        errorOutput,
        timedOut: true,
      });
    }, testSuite.timeout);
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      
      // Parse output for test results
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      const skippedMatch = output.match(/(\d+) skipped/);
      
      resolve({
        name: testSuite.name,
        exitCode: code ?? 1,
        duration,
        output,
        errorOutput,
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
      });
    });
    
    child.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        name: testSuite.name,
        exitCode: 1,
        duration: Date.now() - startTime,
        output,
        errorOutput: errorOutput + `\nError: ${err.message}`,
        error: true,
      });
    });
  });
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         CAMPUSWAY COMPREHENSIVE E2E TEST RUNNER             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Check server status
  const { frontendHealthy, backendHealthy } = await checkServers();
  
  if (!frontendHealthy || !backendHealthy) {
    console.log('\n⚠️  Proceeding with tests anyway (servers may need to be started)');
  }
  
  // Run all test suites
  const results = [];
  const totalStartTime = Date.now();
  
  for (let i = 0; i < TEST_SUITES.length; i++) {
    const testSuite = TEST_SUITES[i];
    console.log(`\n[${i + 1}/${TEST_SUITES.length}]`);
    
    const result = await runTest(testSuite);
    results.push(result);
    
    // Add delay between tests
    if (i < TEST_SUITES.length - 1) {
      await sleep(2000);
    }
  }
  
  const totalDuration = Date.now() - totalStartTime;
  
  // Generate summary report
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST EXECUTION SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalTests = 0;
  let successfulSuites = 0;
  let failedSuites = [];
  
  console.log('\n📊 PER-SUITE RESULTS:');
  console.log('─'.repeat(60));
  
  for (const result of results) {
    const status = result.exitCode === 0 ? '✓ PASS' : '✗ FAIL';
    const duration = (result.duration / 1000).toFixed(2);
    
    console.log(`${status} | ${result.name.padEnd(30)} | ${duration}s`.padEnd(58));
    
    if (result.passed || result.failed || result.skipped) {
      const testInfo = [
        result.passed ? `${result.passed} passed` : '',
        result.failed ? `${result.failed} failed` : '',
        result.skipped ? `${result.skipped} skipped` : '',
      ].filter(Boolean).join(', ');
      console.log(`       ${testInfo}`);
    }
    
    if (result.exitCode === 0) {
      successfulSuites++;
    } else {
      failedSuites.push(result.name);
    }
    
    totalPassed += result.passed || 0;
    totalFailed += result.failed || 0;
    totalSkipped += result.skipped || 0;
    totalTests += (result.passed || 0) + (result.failed || 0) + (result.skipped || 0);
  }
  
  console.log('─'.repeat(60));
  
  // Overall statistics
  console.log('\n📈 OVERALL STATISTICS:');
  console.log('─'.repeat(60));
  console.log(`Total Test Suites: ${results.length}`);
  console.log(`Successful Suites: ${successfulSuites}`);
  console.log(`Failed Suites: ${failedSuites.length}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Total Passed: ${totalPassed}`);
  console.log(`Total Failed: ${totalFailed}`);
  console.log(`Total Skipped: ${totalSkipped}`);
  console.log(`Total Execution Time: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Average per Suite: ${(totalDuration / results.length / 1000).toFixed(2)}s`);
  console.log('─'.repeat(60));
  
  // Failed suites details
  if (failedSuites.length > 0) {
    console.log('\n🔴 FAILED TEST SUITES:');
    failedSuites.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    
    console.log('\n📋 FAILURE DETAILS:');
    console.log('─'.repeat(60));
    for (const result of results) {
      if (result.exitCode !== 0) {
        console.log(`\n❌ ${result.name}`);
        if (result.timedOut) {
          console.log('   Status: TIMEOUT');
        } else if (result.error) {
          console.log(`   Status: ERROR - ${result.errorOutput.split('\n')[0]}`);
        }
        
        // Show relevant error lines
        const errorLines = result.errorOutput.split('\n').filter(line => 
          line.includes('error') || 
          line.includes('Error') || 
          line.includes('FAILED') ||
          line.includes('assert')
        ).slice(0, 5);
        
        if (errorLines.length > 0) {
          console.log('   Error Output:');
          errorLines.forEach(line => console.log(`     ${line.trim()}`));
        }
      }
    }
  }
  
  // Final status
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  if (totalFailed === 0) {
    console.log('║              ✓ ALL TESTS PASSED SUCCESSFULLY               ║');
  } else {
    console.log(`║              ✗ ${totalFailed} TEST(S) FAILED - REVIEW NEEDED             ║`);
  }
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  // Exit with appropriate code
  process.exitCode = failedSuites.length > 0 ? 1 : 0;
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});
