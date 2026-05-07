import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 90_000,
    fullyParallel: false,
    retries: 0,
    workers: 1,
    reporter: [['list'], ['html', { outputFolder: '../qa-artifacts/exam-center-e2e/playwright-report', open: 'never' }]],
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5175',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        viewport: { width: 1440, height: 900 },
        actionTimeout: 20_000,
        navigationTimeout: 45_000,
    },
    projects: [
        {
            name: 'chromium-desktop',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
