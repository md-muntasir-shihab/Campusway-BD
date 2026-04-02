import { expect, test, type Page } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, getAdminCreds, loginAsAdmin } from './helpers';

async function waitForAdminAccess(page: Page) {
    const accessGate = page.getByText(/Checking admin access/i).first();
    if (await accessGate.isVisible().catch(() => false)) {
        await accessGate.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => undefined);
    }
}

async function openSecuritySettings(page: Page) {
    await page.goto('/__cw_admin__/settings/security-center', { waitUntil: 'domcontentloaded' });
    await waitForAdminAccess(page);
    await expect(page).toHaveURL(/\/__cw_admin__\/settings\/security-center/);
    await expect(page.getByRole('heading', { name: /Security Center/i }).first()).toBeVisible();
    await page.getByTestId('security-tab-settings').click();
    await expect(page.getByTestId('security-settings-panel')).toBeVisible();
}

async function completeSensitiveActionDialogIfPresent(page: Page) {
    const creds = getAdminCreds(page);
    const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: /Verify sensitive action/i }) }).first();
    const visible = await dialog.isVisible().catch(() => false);
    if (!visible) {
        await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => undefined);
    }
    if (!(await dialog.isVisible().catch(() => false))) {
        return;
    }
    const reasonInput = dialog.getByLabel(/^Reason$/i);
    const passwordInput = dialog.getByLabel(/^Current password$/i);
    await reasonInput.fill('Security Center cleanup smoke save');
    await passwordInput.fill(creds.password);
    await dialog.getByRole('button', { name: /Confirm action/i }).click();
}

function genericLoginErrorToggle(page: Page) {
    return page
        .locator('label')
        .filter({ hasText: /Generic login error messages/i })
        .locator('input[type="checkbox"]')
        .first();
}

test.describe('Security Center cleanup', () => {
    test('shows only canonical tabs and persists active settings', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name.includes('mobile'), 'Security center cleanup smoke is desktop-only.');

        const nativeDialogs: string[] = [];
        page.on('dialog', async (dialog) => {
            nativeDialogs.push(dialog.message());
            await dialog.dismiss().catch(() => undefined);
        });

        const tracker = attachHealthTracker(page);
        await page.setViewportSize({ width: 1440, height: 960 });
        await loginAsAdmin(page);
        await openSecuritySettings(page);

        await expect(page.getByTestId('security-tab-dashboard')).toBeVisible();
        await expect(page.getByTestId('security-tab-settings')).toBeVisible();
        await expect(page.getByTestId('security-tab-alerts')).toBeVisible();
        await expect(page.getByTestId('security-tab-audit-logs')).toBeVisible();

        await expect(page.getByRole('button', { name: /^Authentication$/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /^Password Policies$/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /^Two-Factor$/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /^Sessions$/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /^Help$/i })).toHaveCount(0);
        await expect(page.getByText(/Runtime Flags/i)).toHaveCount(0);
        await expect(page.getByText(/^Uploads$/i)).toHaveCount(0);

        await expect(page.getByTestId('security-password-policy-default')).toBeVisible();
        await expect(page.getByTestId('security-password-policy-admin')).toBeVisible();
        await expect(page.getByTestId('security-password-policy-staff')).toBeVisible();
        await expect(page.getByTestId('security-password-policy-student')).toBeVisible();

        await expect(page.getByTestId('security-risky-actions')).toContainText(/Student Export/i);
        await expect(page.getByTestId('security-risky-actions')).toContainText(/Provider Credentials/i);
        await expect(page.getByTestId('security-risky-actions')).toContainText(/Security Settings Change/i);
        await expect(page.getByTestId('security-risky-actions')).toContainText(/Backup Restore/i);

        const genericToggle = genericLoginErrorToggle(page);
        const initialChecked = await genericToggle.isChecked();

        await genericToggle.click();
        await expect(page.getByTestId('security-settings-save')).toBeEnabled();
        await page.getByTestId('security-settings-save').click();
        await completeSensitiveActionDialogIfPresent(page);
        await expect(page.getByTestId('security-settings-save')).toBeDisabled({ timeout: 20000 });

        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForAdminAccess(page);
        await page.getByTestId('security-tab-settings').click();
        if (initialChecked) {
            await expect(genericLoginErrorToggle(page)).not.toBeChecked();
        } else {
            await expect(genericLoginErrorToggle(page)).toBeChecked();
        }

        await genericLoginErrorToggle(page).click();
        await page.getByTestId('security-settings-save').click();
        await completeSensitiveActionDialogIfPresent(page);
        await expect(page.getByTestId('security-settings-save')).toBeDisabled({ timeout: 20000 });

        await expectPageHealthy(page, tracker);
        expect(nativeDialogs).toEqual([]);
        tracker.detach();
    });
});
