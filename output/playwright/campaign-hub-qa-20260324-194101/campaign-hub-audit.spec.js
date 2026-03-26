const { test, expect } = require('@playwright/test');
const path = require('path');

const SCREENSHOT_DIR = 'd:/CampusWay/CampusWay/output/playwright/campaign-hub-qa-20260324-194101';
const CREDS = {
  email: process.env.E2E_ADMIN_DESKTOP_EMAIL || 'e2e_admin_desktop@campusway.local',
  password: process.env.E2E_ADMIN_DESKTOP_PASSWORD || 'E2E_Admin#12345',
};

async function loginAsAdmin(page) {
  await page.goto('/__cw_admin__/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input#identifier, input[name="identifier"], input[type="text"], input[type="email"]').first().fill(CREDS.email);
  await page.locator('input#password, input[name="password"], input[type="password"]').first().fill(CREDS.password);
  await page.getByRole('button', { name: /Sign In/i }).first().click();
  await expect(page).toHaveURL(/\/__cw_admin__\/dashboard/, { timeout: 15000 });
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
}

test.describe('Campaign Hub Browser Audit', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should cover the full campaign panel with screenshots', async ({ page }) => {
    await page.goto('/__cw_admin__/campaigns', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Queue and delivery health/i)).toBeVisible();
    await shot(page, '01-dashboard');

    await page.getByRole('button', { name: 'Campaigns', exact: true }).click();
    await expect(page.getByRole('columnheader', { name: /Name/i })).toBeVisible();
    await shot(page, '02-campaigns-list');

    await page.getByRole('button', { name: 'New Campaign', exact: true }).click();
    await expect(page.getByText(/Select Audience/i)).toBeVisible();
    await page.locator('input').first().fill('Campaign Hub Browser QA');
    await shot(page, '03-new-campaign-audience');

    await page.getByRole('button', { name: /Next: Content/i }).click();
    await expect(page.getByText(/Message Content/i)).toBeVisible();
    await page.getByLabel(/Message Body/i).fill('Hello {student_name}, browser QA preview only.');
    await shot(page, '04-new-campaign-content');

    await page.getByRole('button', { name: /Next: Delivery/i }).click();
    await expect(page.getByText(/Delivery Options/i)).toBeVisible();
    await shot(page, '05-new-campaign-delivery');

    await page.getByRole('button', { name: /Preview & Estimate/i }).click();
    await expect(page.getByText(/Review & Send/i)).toBeVisible();
    await expect(page.getByText(/Manual include IDs/i)).toBeVisible();
    await shot(page, '06-new-campaign-review');

    await page.getByRole('button', { name: 'Audiences', exact: true }).click();
    await expect(page).toHaveURL(/\/__cw_admin__\/campaigns\/contact-center\?tab=members/);
    await expect(page.getByText(/selected/i).first()).toBeVisible();
    await shot(page, '07-audiences-members');

    await page.goto('/__cw_admin__/campaigns/contact-center?tab=overview', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/single audience source for copy, export, guardian-aware handoff/i)).toBeVisible();
    await shot(page, '08-contact-overview');

    await page.goto('/__cw_admin__/campaigns/contact-center?tab=outreach', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Personal Outreach/i)).toBeVisible();
    await shot(page, '09-contact-outreach');

    await page.goto('/__cw_admin__/campaigns/contact-center?tab=export', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /Preview output/i })).toBeVisible();
    await page.getByRole('button', { name: /Preview output/i }).click();
    await expect(page.locator('textarea')).toBeVisible();
    await shot(page, '10-contact-export');

    await page.goto('/__cw_admin__/campaigns/contact-center?tab=presets', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Format Presets/i)).toBeVisible();
    await shot(page, '11-contact-presets');

    await page.goto('/__cw_admin__/campaigns/contact-center?tab=logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Logs \/ History/i)).toBeVisible();
    await shot(page, '12-contact-logs');

    await page.goto('/__cw_admin__/campaigns/templates', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Templates/i })).toBeVisible();
    await shot(page, '13-templates');

    await page.goto('/__cw_admin__/campaigns?view=providers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Provider Configuration/i })).toBeVisible();
    await shot(page, '14-providers');

    await page.goto('/__cw_admin__/campaigns?view=triggers', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Smart Auto-Triggers/i })).toBeVisible();
    await shot(page, '15-triggers');

    await page.goto('/__cw_admin__/campaigns?view=notifications', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Targeted notification operations/i)).toBeVisible();
    await shot(page, '16-notifications');

    await page.goto('/__cw_admin__/campaigns/logs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('columnheader', { name: /Recipient/i })).toBeVisible();
    await shot(page, '17-delivery-logs');

    await page.goto('/__cw_admin__/campaigns/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Send Limits/i)).toBeVisible();
    await shot(page, '18-settings');

    await page.goto('/__cw_admin__/notification-center', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/__cw_admin__\/campaigns\?view=notifications/);
    await shot(page, '19-notification-center-alias');

    await page.goto('/__cw_admin__/notifications/triggers', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/__cw_admin__\/campaigns\?view=triggers/);
    await shot(page, '20-trigger-alias');
  });
});
