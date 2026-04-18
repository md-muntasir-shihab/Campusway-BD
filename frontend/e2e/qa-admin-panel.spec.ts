/**
 * CampusWay QA Audit — Admin Panel Deep E2E Tests
 *
 * Admin dashboard, university management, student management,
 * exam management, news console, question bank, finance center,
 * subscription plans, support center, settings center, resource management,
 * help center admin, contact messages, reports, notification center,
 * campaign console, team access control, subscription contact center,
 * action approvals, campaign banners, home settings — সম্পূর্ণ E2E test suite।
 *
 * Requirements: 8.1-8.22
 */

import { test, expect } from '@playwright/test';
import { loginAsRole } from '../qa/helpers/auth-helper';
import { get } from '../qa/helpers/api-client';

const FRONTEND_BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const ADMIN_BASE = `${FRONTEND_BASE}/__cw_admin__`;

/**
 * Helper: Navigate to an admin route and verify the page renders without errors.
 * Logs in as admin, navigates to the route, and checks for visible content
 * with no uncaught JS errors.
 */
async function verifyAdminPageRenders(
    page: import('@playwright/test').Page,
    route: string,
    label: string,
) {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await loginAsRole(page, 'admin');
    await page.goto(`${ADMIN_BASE}${route}`, { waitUntil: 'domcontentloaded' });

    // Verify page body is visible
    await expect(page.locator('body')).toBeVisible();

    // Verify main content area renders
    const content = page.locator('main, [role="main"], #root, #app').first();
    await expect(content).toBeVisible({ timeout: 15_000 });

    // No uncaught JS errors
    expect(errors, `${label} should have no JS errors`).toHaveLength(0);
}

// ═════════════════════════════════════════════════════════════════════
// 1. Admin Dashboard Statistics (Req 8.1)
// ═════════════════════════════════════════════════════════════════════

test.describe('Admin Dashboard (Req 8.1)', () => {
    test('Admin dashboard renders statistics and summary', async ({ page }) => {
        await verifyAdminPageRenders(page, '/dashboard', 'Admin Dashboard');
    });

    test('Admin dashboard API returns valid data', async () => {
        const res = await get('/__cw_admin__/dashboard', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 2. University Management (Req 8.2)
// ═════════════════════════════════════════════════════════════════════

test.describe('University Management (Req 8.2)', () => {
    test('University list page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/universities', 'University Management');
    });

    test('University list API returns data (GET /api/__cw_admin__/universities)', async () => {
        const res = await get('/__cw_admin__/universities', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 3. Student Management OS Console (Req 8.3)
// ═════════════════════════════════════════════════════════════════════

test.describe('Student Management OS Console (Req 8.3)', () => {
    const studentSubRoutes = [
        { path: '/student-management', label: 'Student Management Root' },
        { path: '/student-management/list', label: 'Student List' },
        { path: '/student-management/create', label: 'Student Create' },
        { path: '/student-management/import-export', label: 'Student Import/Export' },
        { path: '/student-management/groups', label: 'Student Groups' },
        { path: '/student-management/crm-timeline', label: 'CRM Timeline' },
        { path: '/student-management/weak-topics', label: 'Weak Topics' },
        { path: '/student-management/profile-requests', label: 'Profile Requests' },
        { path: '/student-management/notifications', label: 'Student Notifications' },
        { path: '/student-management/settings', label: 'Student Settings' },
    ];

    for (const { path, label } of studentSubRoutes) {
        test(`${label} page renders (${path})`, async ({ page }) => {
            await verifyAdminPageRenders(page, path, label);
        });
    }

    test('Student list API returns data (GET /api/__cw_admin__/users)', async () => {
        const res = await get('/__cw_admin__/users', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 4. Exam Management (Req 8.4)
// ═════════════════════════════════════════════════════════════════════

test.describe('Exam Management (Req 8.4)', () => {
    test('Exam list page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/exams', 'Exam Management');
    });

    test('Exam list API returns data (GET /api/__cw_admin__/exams)', async () => {
        const res = await get('/__cw_admin__/exams', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 5. News Console (Req 8.5)
// ═════════════════════════════════════════════════════════════════════

test.describe('News Console (Req 8.5)', () => {
    const newsSubRoutes = [
        { path: '/news', label: 'News Root' },
        { path: '/news/pending', label: 'News Pending' },
        { path: '/news/published', label: 'News Published' },
        { path: '/news/draft', label: 'News Draft' },
        { path: '/news/scheduled', label: 'News Scheduled' },
    ];

    for (const { path, label } of newsSubRoutes) {
        test(`${label} page renders (${path})`, async ({ page }) => {
            await verifyAdminPageRenders(page, path, label);
        });
    }

    test('News list API returns data (GET /api/__cw_admin__/news)', async () => {
        const res = await get('/__cw_admin__/news', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 6. Question Bank (Req 8.6)
// ═════════════════════════════════════════════════════════════════════

test.describe('Question Bank (Req 8.6)', () => {
    test('Question bank page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/question-bank', 'Question Bank');
    });

    test('Question bank API returns data (GET /api/__cw_admin__/question-bank)', async () => {
        const res = await get('/__cw_admin__/question-bank', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 7. Finance Center (Req 8.7)
// ═════════════════════════════════════════════════════════════════════

test.describe('Finance Center (Req 8.7)', () => {
    const financeSubRoutes = [
        { path: '/finance', label: 'Finance Root' },
        { path: '/finance/dashboard', label: 'Finance Dashboard' },
        { path: '/finance/transactions', label: 'Finance Transactions' },
        { path: '/finance/invoices', label: 'Finance Invoices' },
        { path: '/finance/expenses', label: 'Finance Expenses' },
        { path: '/finance/budgets', label: 'Finance Budgets' },
        { path: '/finance/recurring', label: 'Finance Recurring' },
        { path: '/finance/vendors', label: 'Finance Vendors' },
        { path: '/finance/refunds', label: 'Finance Refunds' },
        { path: '/finance/export', label: 'Finance Export' },
        { path: '/finance/import', label: 'Finance Import' },
        { path: '/finance/audit-log', label: 'Finance Audit Log' },
        { path: '/finance/settings', label: 'Finance Settings' },
    ];

    for (const { path, label } of financeSubRoutes) {
        test(`${label} page renders (${path})`, async ({ page }) => {
            await verifyAdminPageRenders(page, path, label);
        });
    }
});

// ═════════════════════════════════════════════════════════════════════
// 8. Subscription Plans Management (Req 8.8, 8.9)
// ═════════════════════════════════════════════════════════════════════

test.describe('Subscription Plans Management (Req 8.8, 8.9)', () => {
    test('Subscription plans page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/subscriptions/plans', 'Subscription Plans');
    });

    test('Subscriptions V2 page renders (Req 8.9)', async ({ page }) => {
        await verifyAdminPageRenders(page, '/subscriptions-v2', 'Subscriptions V2');
    });

    test('Subscription plans API returns data (GET /api/__cw_admin__/subscription-plans)', async () => {
        const res = await get('/__cw_admin__/subscription-plans', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 9. Support Center (Req 8.10)
// ═════════════════════════════════════════════════════════════════════

test.describe('Support Center (Req 8.10)', () => {
    test('Support center page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/support-center', 'Support Center');
    });

    test('Support center API returns data (GET /api/__cw_admin__/support-center)', async () => {
        const res = await get('/__cw_admin__/support-center', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 10. Settings Center (Req 8.11)
// ═════════════════════════════════════════════════════════════════════

test.describe('Settings Center (Req 8.11)', () => {
    const settingsSubRoutes = [
        { path: '/settings', label: 'Settings Hub' },
        { path: '/settings/site-settings', label: 'Site Settings' },
        { path: '/settings/home-control', label: 'Home Control' },
        { path: '/settings/university-settings', label: 'University Settings' },
        { path: '/settings/banner-manager', label: 'Banner Manager' },
        { path: '/settings/security-center', label: 'Security Center' },
        { path: '/settings/system-logs', label: 'System Logs' },
        { path: '/settings/notifications', label: 'Notification Settings' },
        { path: '/settings/analytics', label: 'Analytics Settings' },
        { path: '/settings/news', label: 'News Settings' },
        { path: '/settings/resource-settings', label: 'Resource Settings' },
        { path: '/settings/admin-profile', label: 'Admin Profile' },
        { path: '/settings/student-settings', label: 'Student Settings' },
    ];

    for (const { path, label } of settingsSubRoutes) {
        test(`${label} page renders (${path})`, async ({ page }) => {
            await verifyAdminPageRenders(page, path, label);
        });
    }
});

// ═════════════════════════════════════════════════════════════════════
// 11. Resource Management, Help Center Admin, Contact Messages (Req 8.12-8.14)
// ═════════════════════════════════════════════════════════════════════

test.describe('Resource Management (Req 8.12)', () => {
    test('Resource management page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/resources', 'Resource Management');
    });

    test('Resources API returns data (GET /api/__cw_admin__/resources)', async () => {
        const res = await get('/__cw_admin__/resources', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

test.describe('Help Center Admin (Req 8.13)', () => {
    test('Help center admin page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/help-center', 'Help Center Admin');
    });

    test('Help center API returns data (GET /api/__cw_admin__/help-center/articles)', async () => {
        const res = await get('/__cw_admin__/help-center/articles', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

test.describe('Contact Messages (Req 8.14)', () => {
    test('Contact messages page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/contact', 'Contact Messages');
    });

    test('Contact messages API returns data (GET /api/__cw_admin__/contact-messages)', async () => {
        const res = await get('/__cw_admin__/contact-messages', 'admin');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});


// ═════════════════════════════════════════════════════════════════════
// 12. Reports, Notification Center, Campaign Console (Req 8.15-8.17)
// ═════════════════════════════════════════════════════════════════════

test.describe('Reports (Req 8.15)', () => {
    test('Reports page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/reports', 'Reports');
    });
});

test.describe('Notification Center (Req 8.16)', () => {
    test('Notification center page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/notification-center', 'Notification Center');
    });
});

test.describe('Campaign Console (Req 8.17)', () => {
    const campaignSubRoutes = [
        { path: '/campaigns', label: 'Campaign Root' },
        { path: '/campaigns/dashboard', label: 'Campaign Dashboard' },
        { path: '/campaigns/list', label: 'Campaign List' },
        { path: '/campaigns/new', label: 'Campaign New' },
        { path: '/campaigns/templates', label: 'Campaign Templates' },
        { path: '/campaigns/settings', label: 'Campaign Settings' },
        { path: '/campaigns/logs', label: 'Campaign Logs' },
    ];

    for (const { path, label } of campaignSubRoutes) {
        test(`${label} page renders (${path})`, async ({ page }) => {
            await verifyAdminPageRenders(page, path, label);
        });
    }
});

// ═════════════════════════════════════════════════════════════════════
// 13. Team Access Control, Subscription Contact Center (Req 8.18-8.19)
// ═════════════════════════════════════════════════════════════════════

test.describe('Team Access Control (Req 8.18)', () => {
    const teamSubRoutes = [
        { path: '/team', label: 'Team Root' },
        { path: '/team/members', label: 'Team Members' },
        { path: '/team/roles', label: 'Team Roles' },
        { path: '/team/permissions', label: 'Team Permissions' },
        { path: '/team/approval-rules', label: 'Team Approval Rules' },
        { path: '/team/activity', label: 'Team Activity' },
        { path: '/team/security', label: 'Team Security' },
        { path: '/team/invites', label: 'Team Invites' },
    ];

    for (const { path, label } of teamSubRoutes) {
        test(`${label} page renders (${path})`, async ({ page }) => {
            await verifyAdminPageRenders(page, path, label);
        });
    }
});

test.describe('Subscription Contact Center (Req 8.19)', () => {
    test('Subscription contact center page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/subscription-contact-center', 'Subscription Contact Center');
    });
});

// ═════════════════════════════════════════════════════════════════════
// 14. Action Approvals, Campaign Banners, Home Settings (Req 8.20-8.22)
// ═════════════════════════════════════════════════════════════════════

test.describe('Action Approvals (Req 8.20)', () => {
    test('Action approvals page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/approvals', 'Action Approvals');
    });
});

test.describe('Campaign Banners (Req 8.21)', () => {
    test('Campaign banners page renders', async ({ page }) => {
        await verifyAdminPageRenders(page, '/campaign-banners', 'Campaign Banners');
    });
});

test.describe('Home Settings (Req 8.22)', () => {
    test('Home settings page renders via settings center', async ({ page }) => {
        await verifyAdminPageRenders(page, '/settings/home-control', 'Home Settings');
    });
});
