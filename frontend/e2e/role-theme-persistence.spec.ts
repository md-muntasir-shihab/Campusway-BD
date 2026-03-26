import { expect, test } from '@playwright/test';
import { loginAsAdmin, loginAsStudent } from './helpers';

type ThemeMode = 'light' | 'dark';

async function setThemeMode(page: import('@playwright/test').Page, mode: ThemeMode): Promise<void> {
    const toggle = page.getByTestId('theme-toggle').first();
    await expect(toggle).toBeVisible();

    for (let attempt = 0; attempt < 6; attempt += 1) {
        const current = await page.evaluate(() => localStorage.getItem('campusway_theme'));
        if (current === mode) return;
        await toggle.click();
        await page.waitForTimeout(120);
    }

    const final = await page.evaluate(() => localStorage.getItem('campusway_theme'));
    expect(final, `Failed to set theme mode=${mode}`).toBe(mode);
}

async function expectResolvedTheme(page: import('@playwright/test').Page, mode: ThemeMode): Promise<void> {
    await expect
        .poll(
            () => page.evaluate(() => document.documentElement.classList.contains('dark')),
            { message: `Expected resolved theme=${mode}` },
        )
        .toBe(mode === 'dark');
}

test.describe('Role Theme Persistence', () => {
    test('student dark/light theme persists across reload', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name.includes('mobile'), 'Theme persistence suite is desktop-only.');

        await loginAsStudent(page);
        await page.goto('/dashboard');

        await setThemeMode(page, 'dark');
        await expectResolvedTheme(page, 'dark');
        await page.reload();
        await expectResolvedTheme(page, 'dark');
        await expect
            .poll(() => page.evaluate(() => localStorage.getItem('campusway_theme')))
            .toBe('dark');

        await setThemeMode(page, 'light');
        await expectResolvedTheme(page, 'light');
        await page.reload();
        await expectResolvedTheme(page, 'light');
        await expect
            .poll(() => page.evaluate(() => localStorage.getItem('campusway_theme')))
            .toBe('light');
    });

    test('admin dark/light theme persists across reload', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name.includes('mobile'), 'Theme persistence suite is desktop-only.');

        await loginAsAdmin(page);
        await page.goto('/__cw_admin__/dashboard');

        await setThemeMode(page, 'dark');
        await expectResolvedTheme(page, 'dark');
        await page.reload();
        await expectResolvedTheme(page, 'dark');
        await expect
            .poll(() => page.evaluate(() => localStorage.getItem('campusway_theme')))
            .toBe('dark');

        await setThemeMode(page, 'light');
        await expectResolvedTheme(page, 'light');
        await page.reload();
        await expectResolvedTheme(page, 'light');
        await expect
            .poll(() => page.evaluate(() => localStorage.getItem('campusway_theme')))
            .toBe('light');
    });
});

