import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy } from './helpers';

const publicRoutes = [
    '/',
    '/universities',
    '/news',
    '/subscription-plans',
    '/services',
    '/exam-portal',
    '/resources',
    '/contact',
    '/login',
    '/chairman/login',
    '/__cw_admin__/login',
];

test.describe('Public Smoke', () => {
    for (const route of publicRoutes) {
        test(`route ${route} renders without critical breakage`, async ({ page }) => {
            const tracker = attachHealthTracker(page);
            await page.goto(route);

            await expect(page.locator('body')).toBeVisible();

            await expectPageHealthy(page, tracker);
            tracker.detach();
        });
    }
});
