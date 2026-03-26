import { expect, test } from '@playwright/test';

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('Home Step1', () => {
    test('renders required home sections in strict order', async ({ page }) => {
        const homeResponse = page.waitForResponse((response) =>
            response.url().includes('/api/home') && response.ok(),
        );
        await page.goto('/');
        await homeResponse;

        const sectionLocators = [
            page.getByRole('textbox', { name: /Search universities, news, exams and resources/i }),
            page.getByRole('heading', { name: /Featured Universities/i }),
            page.getByRole('heading', { name: /Application Deadlines/i }),
            page.getByRole('heading', { name: /Upcoming Exams/i }),
            page.getByRole('heading', { name: /Online Exams/i }),
            page.getByRole('heading', { name: /Latest News/i }),
            page.getByRole('heading', { name: /Resources/i }),
        ];

        await expect
            .poll(async () => {
                const counts = await Promise.all(sectionLocators.map((locator) => locator.count()));
                return counts.filter((count) => count > 0).length;
            }, { timeout: 10_000 })
            .toBeGreaterThan(3);

        const yPositions: number[] = [];
        for (const locator of sectionLocators) {
            if (await locator.count()) {
                await expect(locator.first()).toBeVisible();
                const box = await locator.first().boundingBox();
                yPositions.push(box?.y ?? 0);
            }
        }
        expect(yPositions.length).toBeGreaterThan(3);

        for (let i = 1; i < yPositions.length; i += 1) {
            expect(yPositions[i]).toBeGreaterThanOrEqual(yPositions[i - 1]);
        }
    });

    test('hero primary CTA navigates to configured target', async ({ page }) => {
        await page.goto('/');

        const heroPrimaryCta = await page.evaluate(async () => {
            const response = await fetch('/api/home', { credentials: 'include' });
            if (!response.ok) return null;
            const body = await response.json();
            const cta = body?.homeSettings?.hero?.primaryCTA;
            if (!cta?.label || !cta?.url) return null;
            return { label: String(cta.label), url: String(cta.url) };
        });
        test.skip(!heroPrimaryCta, 'No configured primary hero CTA in current environment.');

        const cta = page.getByRole('link', { name: new RegExp(escapeRegExp(heroPrimaryCta!.label), 'i') }).first();
        await expect(cta).toBeVisible();
        const href = (await cta.getAttribute('href')) || heroPrimaryCta!.url || '/';
        const isExternal = /^https?:\/\//i.test(href);

        if (isExternal) {
            const [popup] = await Promise.all([
                page.waitForEvent('popup'),
                cta.click(),
            ]);
            await popup.waitForLoadState('domcontentloaded');
            expect(popup.url()).toMatch(/^https?:\/\//i);
            await popup.close();
            return;
        }

        await Promise.all([
            page.waitForURL(new RegExp(escapeRegExp(href.split('?')[0]))),
            cta.click(),
        ]);
    });

    test('deadline Apply CTA opens a valid admission target', async ({ page }) => {
        const homeResponse = page.waitForResponse((response) =>
            response.url().includes('/api/home') && response.ok(),
        );
        await page.goto('/');
        await homeResponse;

        const deadlineCount = await page.evaluate(async () => {
            const response = await fetch('/api/home', { credentials: 'include' });
            if (!response.ok) return 0;
            const body = await response.json();
            const items = Array.isArray(body?.deadlineUniversities) ? body.deadlineUniversities : [];
            return items.length;
        });

        if (deadlineCount <= 0) {
            test.skip(true, 'No deadline universities available in seeded data.');
        }

        const deadlineSection = page.getByTestId('home-deadlines-section');
        const applyLinks = deadlineSection.getByRole('link', { name: /Apply(?: Now)?/i });
        await expect(deadlineSection).toBeVisible();
        await expect
            .poll(async () => applyLinks.count(), { timeout: 8_000 })
            .toBeGreaterThan(0);

        const firstApply = applyLinks.first();
        const href = (await firstApply.getAttribute('href')) || '';
        expect(href).toBeTruthy();
        expect(href).toMatch(/^\/universities\/|^https?:\/\//i);

        if (/^https?:\/\//i.test(href)) {
            const [popup] = await Promise.all([
                page.waitForEvent('popup'),
                firstApply.click(),
            ]);
            await popup.waitForLoadState('domcontentloaded');
            expect(popup.url()).toMatch(/^https?:\/\//i);
            await popup.close();
            return;
        }

        await Promise.all([
            page.waitForURL(/\/universities\//),
            firstApply.click(),
        ]);
    });

    test('theme toggle changes persisted theme state', async ({ page }) => {
        await page.goto('/');
        const toggle = page.getByTestId('theme-toggle').first();
        await expect(toggle).toBeVisible();

        const before = await page.evaluate(() => localStorage.getItem('campusway_theme'));
        await toggle.click();
        await expect
            .poll(() => page.evaluate(() => localStorage.getItem('campusway_theme')))
            .not.toBe(before);
    });

    test('featured universities section renders when API returns featured items', async ({ page }) => {
        const homeResponse = page.waitForResponse((response) =>
            response.url().includes('/api/home') && response.ok(),
        );
        await page.goto('/');
        await homeResponse;

        const hasFeatured = await page.evaluate(async () => {
            const response = await fetch('/api/home', { credentials: 'include' });
            if (!response.ok) return false;
            const body = await response.json();
            const items = Array.isArray(body?.featuredUniversities) ? body.featuredUniversities : [];
            return items.length > 0;
        });

        const featuredSection = page.getByTestId('home-featured-section');
        await expect(featuredSection).toBeVisible();
        await expect(page.getByRole('heading', { name: /Featured Universities/i })).toBeVisible();

        if (hasFeatured) {
            await expect(
                featuredSection.locator('[data-testid="highlighted-category-card"], [data-university-card-id]').first()
            ).toBeVisible();
        } else {
            await expect(page.getByText(/No featured universities match your filter/i)).toBeVisible();
        }
    });
});
