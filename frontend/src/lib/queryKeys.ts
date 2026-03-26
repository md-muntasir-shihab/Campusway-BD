import type { QueryClient } from '@tanstack/react-query';

export const queryKeys = {
    home: ['home'] as const,
    homeSettings: ['home_settings'] as const,
    homeSettingsLegacy: ['home-settings'] as const,
    universityCategories: ['universityCategories'] as const,
    universityCategoriesLegacy: ['university-categories'] as const,
    universities: ['universities'] as const,
    publicSettings: ['public_settings'] as const,
    siteSettings: ['site_settings'] as const,
    websiteSettings: ['website-settings'] as const,
    footer: ['footer'] as const,
    header: ['header'] as const,
    newsSettings: ['news_settings'] as const,
    news: ['news'] as const,
    plans: ['plans'] as const,
    plansPublicLegacy: ['public-subscription-plans'] as const,
    plansAdminLegacy: ['admin-subscription-plans'] as const,
    studentMe: ['student_me'] as const,
    studentMeLegacy: ['subscriptions.me'] as const,
    socialLinks: ['site-social-links'] as const,
    securitySettings: ['admin', 'security-settings'] as const,
    runtimeSettings: ['admin', 'runtime-settings'] as const,
    pendingApprovals: ['admin', 'pending-approvals'] as const,
    auditLogs: ['admin', 'audit-logs'] as const,
    jobRuns: ['admin', 'job-runs'] as const,
    jobHealth: ['admin', 'job-health'] as const,
    supportTickets: ['admin', 'support-tickets'] as const,
    supportNotices: ['admin', 'support-notices'] as const,
    notificationAutomationSettings: ['admin', 'notification-automation-settings'] as const,
    analyticsSettings: ['admin', 'analytics-settings'] as const,
    reportsSummary: ['admin', 'reports-summary'] as const,
    analyticsOverview: ['admin', 'analytics-overview'] as const,
    examInsights: ['admin', 'exam-insights'] as const,
} as const;

export const invalidationGroups = {
    homeSave: [
        queryKeys.home,
        queryKeys.homeSettings,
        queryKeys.homeSettingsLegacy,
        queryKeys.universityCategories,
        queryKeys.universityCategoriesLegacy,
    ],
    siteSave: [
        queryKeys.publicSettings,
        queryKeys.siteSettings,
        queryKeys.websiteSettings,
        queryKeys.home,
    ],
    socialSave: [
        queryKeys.socialLinks,
        queryKeys.publicSettings,
        queryKeys.siteSettings,
        queryKeys.websiteSettings,
        queryKeys.home,
        queryKeys.footer,
        queryKeys.header,
    ],
    newsSave: [
        queryKeys.newsSettings,
        queryKeys.news,
        queryKeys.home,
    ],
    plansSave: [
        queryKeys.plans,
        queryKeys.plansPublicLegacy,
        queryKeys.plansAdminLegacy,
        queryKeys.home,
        queryKeys.studentMe,
        queryKeys.studentMeLegacy,
    ],
    universitySave: [
        queryKeys.universities,
        queryKeys.universityCategories,
        queryKeys.universityCategoriesLegacy,
        queryKeys.home,
    ],
    notificationsAutomationSave: [
        queryKeys.notificationAutomationSettings,
        queryKeys.supportTickets,
    ],
    analyticsSave: [
        queryKeys.analyticsSettings,
        queryKeys.analyticsOverview,
        queryKeys.reportsSummary,
    ],
} as const;

export async function invalidateQueryGroup(
    queryClient: QueryClient,
    keys: ReadonlyArray<readonly unknown[]>,
): Promise<void> {
    await Promise.all(
        keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}
