import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsAdmin } from './helpers';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page, hint: string) {
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth > 1);
    expect(hasOverflow, `${hint}: horizontal overflow detected`).toBeFalsy();
}

function categoryCard(page: import('@playwright/test').Page, name: string) {
    return page.locator('article').filter({ hasText: name }).first();
}

function clusterCard(page: import('@playwright/test').Page, name: string) {
    return page.locator('article').filter({ hasText: name }).first();
}

async function goToAdminUniversities(page: import('@playwright/test').Page) {
    await page.goto('/__cw_admin__/universities', { waitUntil: 'domcontentloaded' });
    if (page.url().includes('/__cw_admin__/login')) {
        await loginAsAdmin(page, 'desktop');
        await page.goto('/__cw_admin__/universities', { waitUntil: 'domcontentloaded' });
    }
    await expect(page.getByRole('heading', { name: /University Management/i })).toBeVisible({ timeout: 15000 });
}

async function openUniversityTab(
    page: import('@playwright/test').Page,
    tabName: 'Categories' | 'Clusters',
    readyLocator: import('@playwright/test').Locator,
) {
    const tabButton = page.getByRole('button', { name: new RegExp(`^${tabName}$`) }).first();
    await expect(tabButton).toBeVisible({ timeout: 15000 });

    for (let attempt = 0; attempt < 3; attempt += 1) {
        await tabButton.click();
        const ready = await readyLocator.isVisible({ timeout: 3000 }).catch(() => false);
        if (ready) return;
        await page.waitForTimeout(500);
    }

    await expect(readyLocator).toBeVisible({ timeout: 15000 });
}

test.describe('University Admin Controls', () => {
    test('category sync, disable-public-hide, cluster controls, and row actions stay usable', async ({ page }) => {
        const tracker = attachHealthTracker(page);

        await loginAsAdmin(page);
        await goToAdminUniversities(page);
        await expect(page.getByRole('button', { name: /^Refresh$/ })).toBeVisible();
        await expect(page.getByRole('button', { name: /^Add University$/ })).toBeVisible();

        const firstRow = page.locator('tbody tr').nth(1);
        const useTableRow = await firstRow.getByRole('button', { name: /^Edit$/ }).isVisible().catch(() => false);
        const scoped = useTableRow ? firstRow : page;

        const editButtons = scoped.getByRole('button', { name: /^Edit$/ });
        if (await editButtons.count() > 0) {
            await expect(editButtons.first()).toBeVisible();
            await expect(scoped.getByRole('button', { name: /Show Home|Hide Home/ }).first()).toBeVisible();
            await expect(scoped.getByRole('button', { name: /Disable|Enable/ }).first()).toBeVisible();
            await expect(scoped.getByRole('button', { name: /^Delete$/ }).first()).toBeVisible();

            const homeToggle = scoped.getByRole('button', { name: /Show Home|Hide Home/ }).first();
            const wasHidden = await homeToggle.getByText(/Show Home/i).count().catch(() => 0);
            await homeToggle.click();
            await expect(page.getByRole('button', { name: /Show Home|Hide Home/ }).first()).toBeVisible({ timeout: 10000 });
            if (wasHidden) {
                await expect(page.getByText(/Home #/i).first()).toBeVisible({ timeout: 10000 });
            }
        }

        const scienceCard = categoryCard(page, 'Science & Technology');
        await openUniversityTab(page, 'Categories', scienceCard);
        await expect(page.getByText(/Category Management/i)).toBeVisible({ timeout: 15000 });
        await expect(scienceCard).toBeVisible({ timeout: 15000 });
        await scienceCard.getByRole('button', { name: /^Edit$/ }).click();
        await expect(page.getByRole('heading', { name: /Shared Category Config/i })).toBeVisible({ timeout: 15000 });
        const syncCategoryButton = page.getByRole('button', { name: /Sync Category Universities/i }).last();
        await expect(syncCategoryButton).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('button', { name: /Save Category/i })).toBeVisible({ timeout: 15000 });
        await page.waitForTimeout(400);
        await syncCategoryButton.click();
        await expect(page.getByText(/Category synced:/i)).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/Category sync failed/i)).toHaveCount(0);
        await page.getByRole('button', { name: /^Cancel$/ }).click();

        const dcuCard = categoryCard(page, 'DCU');
        await expect(dcuCard).toBeVisible();
        await dcuCard.getByRole('button', { name: /^Disable$/ }).click();
        await expect(dcuCard.getByText(/INACTIVE/i)).toBeVisible({ timeout: 10000 });
        await expect(dcuCard.getByRole('button', { name: /^Enable$/ })).toBeVisible();

        await page.goto('/universities');
        await expect(page.getByRole('tab', { name: /DCU/i })).toHaveCount(0);

        await goToAdminUniversities(page);
        await page.getByRole('button', { name: /^Categories$/ }).click();
        const dcuCardAfterToggle = categoryCard(page, 'DCU');
        await expect(dcuCardAfterToggle.getByRole('button', { name: /^Enable$/ })).toBeVisible({ timeout: 15000 });
        await dcuCardAfterToggle.getByRole('button', { name: /^Enable$/ }).click();
        await expect(dcuCardAfterToggle.getByText(/ACTIVE/i)).toBeVisible({ timeout: 10000 });
        await expect(dcuCardAfterToggle.getByRole('button', { name: /^Disable$/ })).toBeVisible();

        const engineeringCluster = clusterCard(page, 'Engineering Alliance');
        await openUniversityTab(page, 'Clusters', engineeringCluster);
        await expect(engineeringCluster).toBeVisible();
        await expect(engineeringCluster.getByRole('button', { name: /^Edit$/ })).toBeVisible();
        await expect(engineeringCluster.getByRole('button', { name: /^Sync$/ })).toBeVisible();
        await engineeringCluster.getByRole('button', { name: /^Edit$/ }).click();
        await expect(page.getByText(/Cluster Logic & Date Synchronization/i)).toBeVisible();
        await expect(page.getByText(/Shared Exam Centers/i)).toBeVisible();
        await expect(page.getByText(/Cluster Admission Portal/i)).toBeVisible();
        await page.getByRole('button', { name: /^Cancel$/ }).click();

        await page.goto('/universities');
        await expect(page.getByRole('tab', { name: /DCU/i })).toBeVisible();

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });

    test('admin university surfaces remain usable on mobile', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await page.setViewportSize({ width: 390, height: 844 });

        await loginAsAdmin(page);
        await goToAdminUniversities(page);
        await expectNoHorizontalOverflow(page, 'admin universities list mobile');

        const scienceCard = categoryCard(page, 'Science & Technology');
        await openUniversityTab(page, 'Categories', scienceCard);
        await expect(scienceCard).toBeVisible();
        await scienceCard.getByRole('button', { name: /^Edit$/ }).click();
        await expect(page.getByRole('button', { name: /Sync Category Universities/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Save Category/i })).toBeVisible();
        await expectNoHorizontalOverflow(page, 'admin category modal mobile');
        await page.getByRole('button', { name: /^Cancel$/ }).click();

        const engineeringCluster = clusterCard(page, 'Engineering Alliance');
        await openUniversityTab(page, 'Clusters', engineeringCluster);
        await expect(engineeringCluster).toBeVisible();
        await engineeringCluster.getByRole('button', { name: /^Edit$/ }).click();
        await expect(page.getByText(/Shared Exam Centers/i)).toBeVisible();
        await expect(page.getByText(/Cluster Admission Portal/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /Save Changes|Create Cluster/i })).toBeVisible();
        await expectNoHorizontalOverflow(page, 'admin cluster modal mobile');
        await page.getByRole('button', { name: /^Cancel$/ }).click();

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });
});
