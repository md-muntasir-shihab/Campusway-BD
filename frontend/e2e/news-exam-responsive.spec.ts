import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy } from './helpers';

const viewports = [
  { name: 'mobile', width: 360, height: 740 },
  { name: 'mobile-plus', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

test.describe('News + Exams responsive stability', () => {
  for (const vp of viewports) {
    test(`news/exams render healthy at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const tracker = attachHealthTracker(page);

      for (const route of ['/news', '/exams']) {
        await page.goto(route);
        await expect(page.locator('body')).toBeVisible();

        const hasOverflow = await page.evaluate(() =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth > 1
        );
        expect.soft(hasOverflow, `${route} has horizontal overflow on ${vp.name}`).toBeFalsy();

        const bodyText = await page.locator('body').innerText();
        expect.soft(bodyText.trim().length > 60, `${route} appears blank on ${vp.name}`).toBeTruthy();
      }

      await expectPageHealthy(page, tracker);
      tracker.detach();
    });
  }
});
