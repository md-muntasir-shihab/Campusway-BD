import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy } from './helpers';

const responsiveWidths = [
    { name: 'w360', width: 360, height: 800 },
    { name: 'w390', width: 390, height: 844 },
    { name: 'w768', width: 768, height: 1024 },
    { name: 'w1024', width: 1024, height: 768 },
    { name: 'w1440', width: 1440, height: 900 },
] as const;

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page, hint: string) {
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth > 1);
    expect(hasOverflow, `${hint}: horizontal overflow detected`).toBeFalsy();
}

test.describe('Phase3 Page Audit', () => {
    test('universities list keeps category isolation and required card actions', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await page.goto('/universities');

        const tabs = page.getByTestId('university-category-tab');
        await expect(tabs.first()).toBeVisible();
        const tabCount = await tabs.count();
        expect(tabCount).toBeGreaterThan(0);

        if (tabCount > 1) {
            await tabs.nth(1).click();
            await page.waitForTimeout(300);
        }

        const activeTab = page.locator('[data-testid="university-category-tab"].tab-pill-active').first();
        await expect(activeTab).toBeVisible();
        const selectedCategory = (await activeTab.getAttribute('data-category')) || '';

        const cards = page.locator('[data-university-card-id]');
        await expect(cards.first()).toBeVisible();
        const sampleCategories = await cards.evaluateAll((nodes) =>
            nodes.slice(0, 6).map((node) => String((node as HTMLElement).dataset.universityCategory || ''))
        );
        if (selectedCategory && selectedCategory.toLowerCase() !== 'all') {
            for (const cat of sampleCategories) {
                expect(cat).toBe(selectedCategory);
            }
        }

        await expect(cards.first().getByText(/Available Seats/i)).toBeVisible();
        await expect(cards.first().getByText(/Upcoming Exams/i)).toBeVisible();
        await expect(cards.first().getByRole('link', { name: /View Details|Details/i })).toBeVisible();
        await expect(cards.first()).toContainText(/Official Site|Official N\/A|Official/i);
        await expect(cards.first()).toContainText(/Quick Apply|Apply N\/A|Apply/i);

        const grid = page.getByTestId('university-placeholder-grid');
        const gridClass = (await grid.getAttribute('class')) || '';
        expect(gridClass).toContain('grid-cols-1');
        expect(gridClass).toContain('md:grid-cols-2');
        expect(gridClass).toContain('lg:grid-cols-3');

        for (const vp of responsiveWidths) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.waitForTimeout(150);
            await expectNoHorizontalOverflow(page, `/universities ${vp.name}`);
        }

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });

    test('university detail shows admission structure with actionable links', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await page.goto('/universities');
        await page.getByRole('link', { name: /View Details/i }).first().click();

        await expect(page).toHaveURL(/\/universit(y|ies)\//);
        await expect(page.getByRole('heading').first()).toBeVisible();
        await expect(page.getByText(/Application Timeline|Application dates not available/i)).toBeVisible();
        await expect(page.getByText(/Exam Centers/i)).toBeVisible();
        await expect(page.getByText(/Seats|Seat distribution/i).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /Apply|Apply Now/i }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: /Official Site|Website/i }).first()).toBeVisible();

        for (const vp of responsiveWidths) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.waitForTimeout(150);
            await expectNoHorizontalOverflow(page, `/universities/:slug ${vp.name}`);
        }

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });

    test('news article keeps readable prose and share controls', async ({ page, request }) => {
        const tracker = attachHealthTracker(page);
        const feed = await request.get('/api/news');
        expect(feed.ok()).toBeTruthy();
        const body = await feed.json();
        const items = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
        expect(items.length).toBeGreaterThan(0);
        const slug = String(items[0]?.slug || '');
        expect(slug).not.toBe('');

        await page.goto(`/news/${slug}`);
        await expect(page.locator('.prose').first()).toBeVisible();
        await expect(
            page.locator('a, span').filter({ hasText: /^Original Source(?: Unavailable)?$/i }).first()
        ).toBeVisible();
        await expect(page.getByRole('button', { name: /WhatsApp|Facebook|Messenger|Telegram|Copy Link|Copy Text/i }).first()).toBeVisible();

        for (const vp of responsiveWidths) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.waitForTimeout(150);
            await expectNoHorizontalOverflow(page, `/news/:slug ${vp.name}`);
        }

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });

    test('resources and contact pages have usable states and submit path', async ({ page }) => {
        const tracker = attachHealthTracker(page);

        await page.goto('/resources');
        await expect(page.getByRole('heading', { name: /Student Resources/i })).toBeVisible();
        await expect(page.locator('body')).toContainText(/Resource|Featured|No resources found/i);

        await page.goto('/contact');
        await expect(page.getByRole('heading', { name: /Contact CampusWay|Contact Form/i }).first()).toBeVisible();
        await page.getByLabel(/Full Name/i).fill('Phase3 QA');
        await page.getByRole('textbox', { name: /^Phone/i }).fill('+8801700000000');
        await page.getByRole('textbox', { name: /^Email \(optional\)/i }).fill(`phase3-${Date.now()}@campusway.local`);
        await page.getByLabel(/Subject/i).fill('Technical Issue');
        await page.getByLabel(/Message/i).fill('Automated phase 3 QA submission for contact/support visibility validation.');
        await page.getByLabel(/I agree to be contacted/i).check();
        await page.getByRole('button', { name: /Submit Message|Send Message/i }).click();
        await expect(page.getByText(/Message sent\./i)).toBeVisible();

        for (const vp of responsiveWidths) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.waitForTimeout(150);
            await expectNoHorizontalOverflow(page, `/resources,/contact ${vp.name}`);
        }

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });
});

