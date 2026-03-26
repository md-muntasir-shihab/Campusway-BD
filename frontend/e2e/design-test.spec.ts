import { test, expect } from '@playwright/test';

test('Homepage Design Showcase with Mock Data', async ({ page }) => {
  // Mock the home API response to ensure layout renders even if backend is down
  await page.route('**/api/home', async route => {
    const json = {
      siteSettings: { siteName: "CampusWay" },
      homeSettings: {
        hero: { showSearch: true, title: "Find Your Dream University", subtitle: "Explore programs and tests", primaryCTA: { label: "Explore Now", url: "/universities" }, secondaryCTA: { label: "Learn More", url: "/about" } },
        sectionVisibility: { hero: true, stats: true, campaigns: true, featured: false, categories: false, deadlines: false, upcomingExams: false, onlineExamsPreview: false, newsPreview: false, resourcesPreview: false },
        stats: { title: "Platform Overview", subtitle: "We are growing fast" }
      },
      campaignBannersActive: [{ _id: '1', title: 'Summer Campaign', imageUrl: 'https://via.placeholder.com/800x400' }],
      featuredUniversities: [],
      universityCategories: [],
      deadlineUniversities: [],
      upcomingExamUniversities: [],
      onlineExamsPreview: [],
      newsPreviewItems: [],
      resourcePreviewItems: [],
      contentBlocksActive: [
        { _id: 'b1', type: 'cta_strip', title: 'Sign up for latest news', body: 'Join 10k+ students', ctaLabel: 'Subscribe', ctaUrl: '/register' },
        { _id: 'b2', type: 'notice_ribbon', title: 'Maintenance Notice', body: 'System will be updated soon', ctaLabel: 'Details', ctaUrl: '/notice' }
      ]
    };
    await route.fulfill({ json });
  });

  // Also mock the stats api
  await page.route('**/api/settings/stats', async route => {
    const json = {
      items: [
        { key: 'students', label: 'Students', value: 10500, enabled: true },
        { key: 'universities', label: 'Universities', value: 45, enabled: true },
        { key: 'exams', label: 'Exams Taken', value: 3400, enabled: true }
      ]
    };
    await route.fulfill({ json });
  });

  await page.goto('/');

  await page.waitForLoadState('networkidle');

  // Verify search bar is visible
  const searchInput = page.getByPlaceholder(/Search universities, news, exams/i);
  await expect(searchInput).toBeVisible({ timeout: 10000 });

  console.log('Successfully navigated and verified the new design elements.');
});
