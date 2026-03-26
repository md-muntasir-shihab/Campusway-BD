import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { authenticate, authorize, authorizePermission, forbidden, requirePermission } from '../middlewares/auth';
import { enforceAdminPanelPolicy, enforceAdminReadOnlyMode } from '../middlewares/securityGuards';
import { subscriptionActionRateLimiter, financeExportRateLimiter, financeImportRateLimiter } from '../middlewares/securityRateLimit';
import { requireSensitiveAction, trackSensitiveExport } from '../middlewares/sensitiveAction';
import { requireTwoPersonApproval } from '../middlewares/twoPersonApproval';
import {
    adminGetExams,
    adminGetExamById,
    adminCreateExam,
    adminUpdateExam,
    adminDeleteExam,
    adminPublishExam,
    adminForceSubmit,
    adminPublishResult,
    adminGetQuestions,
    adminCreateQuestion,
    adminUpdateQuestion,
    adminDeleteQuestion,
    adminReorderQuestions,
    adminImportQuestionsFromExcel,
    adminGetExamAnalytics,
    adminExportExamResults,
    adminGetExamResults,
    adminEvaluateResult,
    adminDailyReport,
    adminUpdateUserSubscription,
    adminResetExamAttempt,
    adminGetStudentReport,
    adminBulkImportUniversities,
    adminGetLiveExamSessions,
    adminLiveStream,
    adminLiveAttemptAction,
    adminExportExamEvents,
    adminStartExamPreview,
    adminCloneExam,
    adminRegenerateExamShareLink,
    adminSignExamBannerUpload,
    adminDownloadExamResultsImportTemplate,
    adminImportExamResults,
    adminImportExternalExamResults,
    adminExportExamReport,
} from '../controllers/adminExamController';
import {
    adminGetAllUniversities,
    adminGetUniversityCategories,
    adminExportUniversities,
    adminGetUniversityById,
    adminCreateUniversity,
    adminUpdateUniversity,
    adminDeleteUniversity,
    adminToggleUniversityStatus,
    adminReorderFeaturedUniversities,
    adminBulkDeleteUniversities,
    adminBulkUpdateUniversities,
} from '../controllers/universityController';
import {
    adminCreateUniversityCluster,
    adminDeleteUniversityCluster,
    adminGetUniversityClusterById,
    adminGetUniversityClusters,
    adminResolveUniversityClusterMembers,
    adminSyncUniversityClusterDates,
    adminUpdateUniversityCluster,
} from '../controllers/universityClusterController';
import {
    adminCommitUniversityImport,
    adminDownloadUniversityImportTemplate,
    adminDownloadUniversityImportErrors,
    adminGetUniversityImportJob,
    adminInitUniversityImport,
    adminValidateUniversityImport,
} from '../controllers/universityImportController';
import {
    adminCreateUniversityCategory,
    adminDeleteUniversityCategory,
    adminGetUniversityCategoryMaster,
    adminSyncUniversityCategoryConfig,
    adminToggleUniversityCategory,
    adminUpdateUniversityCategory,
} from '../controllers/universityCategoryController';
import {
    adminGetBanners,
    adminCreateBanner,
    adminUpdateBanner,
    adminDeleteBanner,
    adminPublishBanner,
    adminSignBannerUpload,
} from '../controllers/bannerController';
import { getHomeConfig, updateHomeConfig } from '../controllers/homeConfigController';
import {
    adminGetAlerts,
    adminCreateAlert,
    adminUpdateAlert,
    adminDeleteAlert,
    adminToggleAlert,
    adminPublishAlert,
} from '../controllers/homeAlertController';
import {
    getSettings,
    updateSettings,
    updateHome,
    updateHero,
    updatePromotionalBanner,
    updateAnnouncement,
    updateStats
} from '../controllers/homeSystemController';
import {
    adminGetHomeSettings,
    adminGetHomeSettingsDefaults,
    adminUpdateHomeSettings,
    adminResetHomeSettingsSection,
} from '../controllers/homeSettingsAdminController';
import { adminGetDashboardSummary } from '../controllers/adminSummaryController';
import { uploadMedia, uploadMiddleware } from '../controllers/mediaController';
import {
    adminGetResources, adminCreateResource, adminUpdateResource, adminDeleteResource,
    adminToggleResourcePublish, adminToggleResourceFeatured,
    adminGetResourceSettings, adminUpdateResourceSettings,
    getSiteSettings, updateSiteSettings,
    adminExportNews, adminExportSubscriptionPlans as adminExportSubscriptionPlansLegacy, adminExportUniversities as adminExportUniversitiesLegacy,
    adminGetNewsCategories, adminCreateNewsCategory, adminUpdateNewsCategory,
    adminDeleteNewsCategory, adminToggleNewsCategory,
} from '../controllers/cmsController';
import {
    adminArchiveContactMessage,
    adminDeleteContactMessage,
    adminGetContactMessageById,
    adminGetContactMessages,
    adminMarkContactMessageRead,
    adminResolveContactMessage,
    adminUpdateContactMessage,
} from '../controllers/contactController';
import {
    adminNewsV2Dashboard,
    adminNewsV2FetchNow,
    adminNewsV2GetItems,
    adminNewsV2GetItemById,
    adminNewsV2AiCheckItem,
    adminNewsV2CreateItem,
    adminNewsV2UpdateItem,
    adminNewsV2DeleteItem,
    adminNewsV2SubmitReview,
    adminNewsV2Approve,
    adminNewsV2Reject,
    adminNewsV2PublishNow,
    adminNewsV2ApprovePublish,
    adminNewsV2Schedule,
    adminNewsV2MoveToDraft,
    adminNewsV2PublishAnyway,
    adminNewsV2PublishSend,
    adminNewsV2ConvertToNotice,
    adminNewsV2Archive,
    adminNewsV2MergeDuplicate,
    adminNewsV2BulkApprove,
    adminNewsV2BulkReject,
    adminNewsV2GetSources,
    adminNewsV2CreateSource,
    adminNewsV2UpdateSource,
    adminNewsV2DeleteSource,
    adminNewsV2TestSource,
    adminNewsV2ReorderSources,
    adminNewsV2GetAppearanceSettings,
    adminNewsV2UpdateAppearanceSettings,
    adminNewsV2GetAiSettings,
    adminNewsV2UpdateAiSettings,
    adminNewsV2GetShareSettings,
    adminNewsV2UpdateShareSettings,
    adminNewsV2GetAllSettings,
    adminNewsV2UpdateAllSettings,
    adminNewsV2GetMedia,
    adminNewsV2UploadMedia,
    adminNewsV2MediaFromUrl,
    adminNewsV2DeleteMedia,
    adminNewsV2ExportNews,
    adminNewsV2ExportSources,
    adminNewsV2ExportLogs,
    adminNewsV2GetAuditLogs,
} from '../controllers/newsV2Controller';
import {
    adminGetServices, adminCreateService, adminUpdateService, adminDeleteService,
    adminReorderServices, adminToggleServiceStatus, adminToggleServiceFeatured
} from '../controllers/serviceController';
import {
    adminGetCategories, adminCreateCategory, adminUpdateCategory, adminDeleteCategory
} from '../controllers/serviceCategoryController';
import {
    createQuestion,
    getQuestions,
    getQuestionById,
    updateQuestion,
    deleteQuestion,
    bulkImportQuestions,
    getQuestionImportJob,
    approveQuestion,
    lockQuestion,
    searchSimilarQuestions,
    exportQuestions,
    revertQuestionRevision,
    signQuestionMediaUpload,
    createQuestionMedia,
} from '../controllers/questionBankController';
import {
    adminAssignBadge,
    adminConfirmGuardianOtp,
    adminCreateBadge,
    adminCreateNotification,
    adminDeleteBadge,
    adminDeleteNotification,
    adminExportStudentExamHistory,
    adminGetBadges,
    adminGetNotifications,
    adminGetStudentDashboardConfig,
    adminIssueGuardianOtp,
    adminRevokeBadge,
    adminToggleNotification,
    adminUpdateBadge,
    adminUpdateNotification,
    adminUpdateStudentDashboardConfig,
} from '../controllers/adminDashboardController';
import {
    getActiveSessions,
    forceLogoutUser,
    getTwoFactorUsers,
    updateTwoFactorUser,
    resetTwoFactorUser,
    getTwoFactorFailures,
} from '../controllers/authController';
import {
    forceLogoutAllUsers,
    getAdminSecuritySettings,
    lockAdminPanel,
    resetAdminSecuritySettings,
    updateAdminSecuritySettings,
} from '../controllers/securityCenterController';
import {
    getSecurityDashboardMetrics,
    getAuditLogsList,
} from '../controllers/securityDashboardController';
import {
    adminApprovePendingAction,
    adminGetPendingApprovals,
    adminRejectPendingAction,
} from '../controllers/actionApprovalController';
import {
    getRuntimeSettings,
    getAdminUiLayoutSettings,
    updateRuntimeSettingsController,
    updateAdminUiLayoutSettings,
} from '../controllers/runtimeSettingsController';
import {
    getUniversitySettings,
    updateUniversitySettings,
} from '../controllers/universitySettingsController';
import {
    adminGetNotificationAutomationSettings,
    adminUpdateNotificationAutomationSettings,
} from '../controllers/notificationAutomationController';
import {
    adminExportEventLogs,
    adminGetAnalyticsOverview,
    adminGetAnalyticsSettings,
    adminUpdateAnalyticsSettings,
} from '../controllers/analyticsController';
import {
    adminGetSecurityAlerts,
    adminGetSecurityAlertSummary,
    adminMarkAlertRead,
    adminMarkAllAlertsRead,
    adminResolveAlert,
    adminDeleteAlert as adminDeleteSecurityAlert,
    adminGetMaintenanceStatus,
    adminUpdateMaintenanceStatus,
} from '../controllers/securityAlertController';
import {
    adminGetHelpCategories,
    adminCreateHelpCategory,
    adminUpdateHelpCategory,
    adminDeleteHelpCategory,
    adminGetHelpArticles,
    adminGetHelpArticle,
    adminCreateHelpArticle,
    adminUpdateHelpArticle,
    adminDeleteHelpArticle,
    adminPublishHelpArticle,
    adminUnpublishHelpArticle,
} from '../controllers/helpCenterController';
import {
    adminGetContentBlocks,
    adminGetContentBlock,
    adminCreateContentBlock,
    adminUpdateContentBlock,
    adminDeleteContentBlock,
    adminToggleContentBlock,
} from '../controllers/contentBlockController';
import {
    adminGetWeakTopics,
    adminGetStudentWeakTopics,
    adminGetHardestQuestions,
} from '../controllers/weakTopicController';
import {
    adminGetStudentTimeline,
    adminAddTimelineEntry,
    adminDeleteTimelineEntry,
    adminGetTimelineSummary,
} from '../controllers/studentTimelineController';
import {
    adminGetNotificationSummary,
    adminGetProviders,
    adminCreateProvider,
    adminUpdateProvider,
    adminDeleteProvider,
    adminTestProvider,
    adminGetTemplates,
    adminCreateTemplate,
    adminUpdateTemplate,
    adminDeleteTemplate,
    adminGetJobs,
    adminSendNotification,
    adminRetryFailedJob,
    adminGetDeliveryLogs,
} from '../controllers/notificationCenterController';
import {
    adminGetActiveSubscriptions,
    adminGetSubscriptionStats,
    adminExtendSubscription,
    adminExpireSubscription,
    adminReactivateSubscription,
    adminToggleAutoRenew,
    adminGetAutomationLogs,
    adminGetStudentSubscriptionHistory,
} from '../controllers/renewalAutomationController';
import {
    adminExportExamInsights,
    adminExportReportsSummary,
    adminGetExamInsights,
    adminGetReportsSummary,
} from '../controllers/adminReportsController';
import {
    adminCommitExamImport,
    adminCreateExamCenter,
    adminCreateExamImportTemplate,
    adminCreateExamMappingProfile,
    adminDeleteExamCenter,
    adminDeleteExamImportTemplate,
    adminDeleteExamMappingProfile,
    adminGetExamCenterSettings,
    adminGetExamCenters,
    adminGetExamImportLogs,
    adminGetExamImportTemplates,
    adminGetExamMappingProfiles,
    adminGetExamProfileSyncLogs,
    adminPreviewExamImport,
    adminRunExamProfileSync,
    adminUpdateExamCenter,
    adminUpdateExamCenterSettings,
    adminUpdateExamImportTemplate,
    adminUpdateExamMappingProfile,
} from '../controllers/examCenterController';
import {
    adminCreateExpense,
    adminCreatePayment,
    adminCreateStaffPayout,
    adminDispatchReminders,
    adminFinanceStream,
    adminGetDues,
    adminGetExpenses,
    adminGetFinanceCashflow,
    adminGetFinanceExpenseBreakdown,
    adminGetFinanceRevenueSeries,
    adminGetFinanceStudentGrowth,
    adminGetFinancePlanDistribution,
    adminGetFinanceSummary,
    adminGetFinanceTestBoard,
    adminExportPayments,
    adminGetPayments,
    adminGetStaffPayouts,
    adminGetStudentLtv,
    adminGetStudentPayments,
    adminSendDueReminder,
    adminUpdateDue,
    adminUpdateExpense,
    adminUpdatePayment,
    adminApprovePayment,
} from '../controllers/adminFinanceController';
import {
    fcGetDashboard,
    fcGetTransactions, fcGetTransaction, fcCreateTransaction, fcUpdateTransaction, fcDeleteTransaction,
    fcBulkApproveTransactions, fcBulkMarkPaid,
    fcGetInvoices, fcCreateInvoice, fcUpdateInvoice, fcMarkInvoicePaid,
    fcGetBudgets, fcCreateBudget, fcUpdateBudget, fcDeleteBudget,
    fcGetRecurringRules, fcCreateRecurringRule, fcUpdateRecurringRule, fcDeleteRecurringRule, fcRunRecurringRuleNow,
    fcGetChartOfAccounts, fcCreateAccount,
    fcGetVendors, fcCreateVendor,
    fcGetSettings, fcUpdateSettings,
    fcGetAuditLogs, fcGetAuditLogDetail,
    fcExportTransactions, fcImportPreview, fcImportCommit, fcDownloadTemplate,
    fcGetRefunds, fcCreateRefund, fcApproveRefund,
    fcGeneratePLReport,
    fcRestoreTransaction,
} from '../controllers/financeCenterController';
import { validate } from '../middlewares/validate';
import {
    createTransactionSchema, updateTransactionSchema, bulkIdsSchema,
    createInvoiceSchema, updateInvoiceSchema, markInvoicePaidSchema,
    createBudgetSchema, updateBudgetSchema,
    createRecurringRuleSchema, updateRecurringRuleSchema,
    createAccountSchema, createVendorSchema,
    updateSettingsSchema,
    createRefundSchema, processRefundSchema,
    importCommitSchema,
} from '../validators/financeSchemas';
import {
    adminCreateNotice,
    adminGetNotices,
    adminToggleNotice,
} from '../controllers/adminSupportController';
import {
    adminGetActionableAlerts,
    adminGetActionableAlertsUnreadCount,
    adminMarkAllActionableAlertsRead,
    adminMarkActionableAlertsRead,
    adminMarkSingleActionableAlertRead,
} from '../controllers/adminAlertController';
import {
    adminGetSupportTicketById,
    adminGetSupportTickets,
    adminMarkSupportTicketRead,
    adminReplySupportTicket,
    adminUpdateSupportTicketStatus,
} from '../controllers/supportController';
import {
    adminDownloadBackup,
    adminListBackups,
    adminRestoreBackup,
    adminRunBackup,
} from '../controllers/backupController';
import {
    adminGetUsers, adminGetUserById, adminCreateUser, adminUpdateUser,
    adminUpdateUserRole, adminToggleUserStatus, adminGetAuditLogs as adminGetSystemAuditLogs, adminBulkImportStudents,
    adminGetStudentProfile, adminUpdateStudentProfile,
    adminResetUserPassword, adminExportStudents,
    adminDeleteUser, adminSetUserStatus, adminSetUserPermissions,
    adminBulkUserAction, adminGetUserActivity, adminGetAdminProfile, adminUpdateAdminProfile,
    adminUserStream,
    adminGetStudents, adminCreateStudent, adminUpdateStudent,
    adminUpdateStudentSubscription, adminUpdateStudentGroups, adminGetStudentExams,
    adminGetStudentGroups, adminCreateStudentGroup, adminUpdateStudentGroup, adminDeleteStudentGroup,
    adminExportStudentGroups, adminImportStudentGroups, adminBulkStudentAction,
    adminGetProfileUpdateRequests, adminApproveProfileUpdateRequest, adminRejectProfileUpdateRequest,
} from '../controllers/adminUserController';
import {
    adminAssignSubscription,
    adminActivateUserSubscription,
    adminCreateSubscriptionPlan,
    adminDuplicateSubscriptionPlan,
    adminCreateUserSubscription,
    adminDeleteSubscriptionPlan,
    adminExportSubscriptionPlans,
    adminGetSubscriptionPlanById,
    adminExportSubscriptions,
    adminGetSubscriptionPlans,
    adminGetSubscriptionSettings,
    adminGetUserSubscriptions,
    adminExpireUserSubscription,
    adminLegacyAssignStudentSubscription,
    adminReorderSubscriptionPlans,
    adminSuspendSubscription,
    adminSuspendUserSubscriptionById,
    adminToggleSubscriptionPlanFeatured,
    adminToggleSubscriptionPlan,
    adminUpdateSubscriptionSettings,
    adminUpdateSubscriptionPlan,
} from '../controllers/subscriptionController';
import {
    adminCreateSocialLink,
    adminDeleteSocialLink,
    adminGetSocialLinks,
    adminUpdateSocialLink,
} from '../controllers/socialLinksController';
import {
    teamActivateMember,
    teamCreateApprovalRule,
    teamCreateMember,
    teamCreateRole,
    teamDeleteApprovalRule,
    teamDeleteRole,
    teamDuplicateRole,
    teamGetActivity,
    teamGetActivityById,
    teamGetApprovalRules,
    teamGetInvites,
    teamGetMemberById,
    teamGetMembers,
    teamGetPermissions,
    teamGetRoleById,
    teamGetRoles,
    teamGetSecurityOverview,
    teamResendInvite,
    teamResetPassword,
    teamRevokeSessions,
    teamSuspendMember,
    teamUpdateApprovalRule,
    teamUpdateMember,
    teamUpdateMemberOverride,
    teamUpdateRole,
    teamUpdateRolePermissions,
} from '../controllers/teamAccessController';
import {
    adminGetJobHealth,
    adminGetJobRuns,
} from '../controllers/adminJobsController';
import {
    adminInitStudentImport,
    adminValidateStudentImport,
    adminCommitStudentImport,
    adminDownloadStudentTemplate,
    adminGetStudentImportJob,
} from '../controllers/studentImportController';
import {
    permissionMatrixToMarkdown,
    ROLE_PERMISSION_MATRIX,
    type PermissionAction,
    type PermissionModule,
} from '../security/permissionsMatrix';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const canEditExams = authorizePermission('canEditExams');
const canManageStudents = authorizePermission('canManageStudents');
const canViewReports = authorizePermission('canViewReports');
const canDeleteData = authorizePermission('canDeleteData');
const canManageFinance = authorizePermission('canManageFinance');
const canManagePlans = authorizePermission('canManagePlans');
const canManageTickets = authorizePermission('canManageTickets');
const canManageBackups = authorizePermission('canManageBackups');

function inferModuleFromPath(pathname: string): PermissionModule | null {
    const clean = String(pathname || '').trim().toLowerCase();
    if (!clean || clean === '/health' || clean.startsWith('/openapi')) return null;
    if (clean.startsWith('/settings/site') || clean === '/settings' || clean.startsWith('/social-links')) return 'site_settings';
    if (clean.startsWith('/settings/home') || clean.startsWith('/home-settings') || clean.startsWith('/home')) return 'home_control';
    if (clean.startsWith('/banners')) return 'banner_manager';
    if (clean.startsWith('/universities') || clean.startsWith('/university-categories') || clean.startsWith('/university-clusters')) return 'universities';
    if (clean.startsWith('/news') || clean.startsWith('/news-category')) return 'news';
    if (clean.startsWith('/exams') || clean.startsWith('/live')) return 'exams';
    if (clean.startsWith('/question-bank')) return 'question_bank';
    if (clean.startsWith('/students') || clean.startsWith('/student-groups') || clean.startsWith('/users')) return 'students_groups';
    if (clean.startsWith('/subscription-plans') || clean.startsWith('/subscriptions')) return 'subscription_plans';
    if (clean.startsWith('/payments') || clean.startsWith('/finance') || clean.startsWith('/dues') || clean.startsWith('/staff-payouts')) return 'payments';
    if (clean.startsWith('/resources')) return 'resources';
    if (clean.startsWith('/support-tickets') || clean.startsWith('/notices') || clean.startsWith('/contact-messages')) return 'support_center';
    if (clean.startsWith('/reports')) return 'reports_analytics';
    if (clean.startsWith('/security') || clean.startsWith('/security-settings') || clean.startsWith('/security-alerts') || clean.startsWith('/audit-logs') || clean.startsWith('/backups') || clean.startsWith('/jobs') || clean.startsWith('/approvals') || clean.startsWith('/maintenance')) return 'security_logs';
    if (clean.startsWith('/team')) return 'team_access_control';
    if (clean.startsWith('/help-center')) return 'support_center';
    if (clean.startsWith('/content-blocks')) return 'site_settings';
    if (clean.startsWith('/analytics/weak-topics')) return 'reports_analytics';
    if (clean.startsWith('/notification-center')) return 'site_settings';
    if (clean.startsWith('/renewal')) return 'subscription_plans';
    return null;
}

function inferActionFromRequest(method: string, pathname: string): PermissionAction {
    const cleanPath = String(pathname || '').toLowerCase();
    const upperMethod = String(method || '').toUpperCase();
    if (cleanPath.includes('bulk')) return 'bulk';
    if (cleanPath.includes('/export')) return 'export';
    if (cleanPath.includes('publish')) return 'publish';
    if (cleanPath.includes('approve') || cleanPath.includes('reject')) return 'approve';
    if (upperMethod === 'GET' || upperMethod === 'HEAD' || upperMethod === 'OPTIONS') return 'view';
    if (upperMethod === 'POST') return 'create';
    if (upperMethod === 'DELETE') return 'delete';
    return 'edit';
}

const enforceModulePermissions = (req: Request, res: Response, next: NextFunction) => {
    const moduleName = inferModuleFromPath(req.path);
    if (!moduleName) {
        next();
        return;
    }
    const action = inferActionFromRequest(req.method, req.path);
    return requirePermission(moduleName, action)(req as any, res, next);
};

const requireTwoPersonForStudentBulkDelete = (req: Request, res: Response, next: NextFunction) => {
    const action = String((req.body as Record<string, unknown>)?.action || '').trim().toLowerCase();
    if (action !== 'delete') {
        next();
        return;
    }
    return requireTwoPersonApproval('students.bulk_delete', 'students_groups', 'bulk')(req as any, res, next);
};

const requireTwoPersonForPaymentRefund = (req: Request, res: Response, next: NextFunction) => {
    const status = String((req.body as Record<string, unknown>)?.status || '').trim().toLowerCase();
    if (status !== 'refunded') {
        next();
        return;
    }
    return requireTwoPersonApproval('payments.mark_refunded', 'payments', 'approve')(req as any, res, next);
};

const requireTwoPersonForUniversitiesBulkDelete = (req: Request, res: Response, next: NextFunction) => (
    requireTwoPersonApproval('universities.bulk_delete', 'universities', 'bulk')(req as any, res, next)
);

const requireTwoPersonForExamResultPublish = (req: Request, res: Response, next: NextFunction) => (
    requireTwoPersonApproval('exams.publish_result', 'exams', 'publish')(req as any, res, next)
);

const requireTwoPersonForBreakingNewsPublish = (req: Request, res: Response, next: NextFunction) => (
    requireTwoPersonApproval('news.publish_breaking', 'news', 'publish')(req as any, res, next)
);

const requireTwoPersonForNewsDelete = (req: Request, res: Response, next: NextFunction) => (
    requireTwoPersonApproval('news.bulk_delete', 'news', 'bulk')(req as any, res, next)
);

const requireSensitiveExport = (moduleName: string, actionName: string, enforceExportRolePolicy = false) => (
    requireSensitiveAction({
        actionKey: 'students.export',
        moduleName,
        actionName,
        enforceExportRolePolicy,
    })
);

const requireSecurityStepUp = (moduleName: string, actionName: string) => (
    requireSensitiveAction({
        actionKey: 'security.settings_change',
        moduleName,
        actionName,
    })
);

const requireProviderStepUp = (moduleName: string, actionName: string) => (
    requireSensitiveAction({
        actionKey: 'providers.credentials_change',
        moduleName,
        actionName,
    })
);

const requireDestructiveStepUp = (moduleName: string, actionName: string) => (
    requireSensitiveAction({
        actionKey: 'data.destructive_change',
        moduleName,
        actionName,
    })
);

/* All admin routes require auth + appropriate roles */
router.use(authenticate);
router.use(enforceAdminPanelPolicy);
router.use(enforceAdminReadOnlyMode);
router.use(enforceModulePermissions);

router.get('/permissions/matrix', authorize('superadmin', 'admin'), (req: Request, res: Response) => {
    const includeMarkdown = String(req.query.format || '').trim().toLowerCase() === 'markdown';
    const responseBody: Record<string, unknown> = {
        modules: Object.keys(ROLE_PERMISSION_MATRIX.superadmin),
        actions: Object.keys(ROLE_PERMISSION_MATRIX.superadmin.site_settings),
        roles: ROLE_PERMISSION_MATRIX,
    };

    if (includeMarkdown) {
        responseBody.markdown = permissionMatrixToMarkdown();
    }

    res.json(responseBody);
});

/* ── Team & Access Control ── */
router.get('/team/members', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamGetMembers);
router.post('/team/members', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamCreateMember);
router.get('/team/members/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamGetMemberById);
router.put('/team/members/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamUpdateMember);
router.post('/team/members/:id/suspend', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamSuspendMember);
router.post('/team/members/:id/activate', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamActivateMember);
router.post('/team/members/:id/reset-password', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), requireSecurityStepUp('team_access', 'member_reset_password'), teamResetPassword);
router.post('/team/members/:id/revoke-sessions', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), requireSecurityStepUp('team_access', 'member_revoke_sessions'), teamRevokeSessions);
router.post('/team/members/:id/resend-invite', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamResendInvite);

router.get('/team/roles', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamGetRoles);
router.post('/team/roles', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), requireSecurityStepUp('team_access', 'role_create'), teamCreateRole);
router.get('/team/roles/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamGetRoleById);
router.put('/team/roles/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), requireSecurityStepUp('team_access', 'role_update'), teamUpdateRole);
router.post('/team/roles/:id/duplicate', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), requireSecurityStepUp('team_access', 'role_duplicate'), teamDuplicateRole);
router.delete('/team/roles/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), requireSecurityStepUp('team_access', 'role_delete'), teamDeleteRole);

router.get('/team/permissions', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamGetPermissions);
router.put('/team/permissions/roles/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), requireSecurityStepUp('team_access', 'role_permissions_update'), teamUpdateRolePermissions);
router.put('/team/permissions/members/:id/override', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamUpdateMemberOverride);

router.get('/team/approval-rules', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamGetApprovalRules);
router.post('/team/approval-rules', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamCreateApprovalRule);
router.put('/team/approval-rules/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamUpdateApprovalRule);
router.delete('/team/approval-rules/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), requireDestructiveStepUp('team_access', 'approval_rule_delete'), teamDeleteApprovalRule);

router.get('/team/activity', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamGetActivity);
router.get('/team/activity/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamGetActivityById);

router.get('/team/security', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamGetSecurityOverview);
router.get('/team/invites', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), teamGetInvites);

router.get('/approvals/pending', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminGetPendingApprovals);
router.post('/approvals/:id/approve', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminApprovePendingAction);
router.post('/approvals/:id/reject', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminRejectPendingAction);
router.get('/jobs/runs', authorize('superadmin', 'admin', 'moderator', 'editor', 'support_agent', 'finance_agent'), adminGetJobRuns);
router.get('/jobs/health', authorize('superadmin', 'admin', 'moderator', 'editor', 'support_agent', 'finance_agent'), adminGetJobHealth);

/* ── Health ── */
router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'OK', message: 'Admin API is running', timestamp: new Date().toISOString() });
});
router.get('/dashboard/summary', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), adminGetDashboardSummary);
router.get('/openapi/exam-console.json', authorize('superadmin', 'admin', 'moderator', 'editor'), (_req: Request, res: Response) => {
    const candidatePaths = [
        path.resolve(process.cwd(), '../docs/openapi/exam-console.json'),
        path.resolve(process.cwd(), 'docs/openapi/exam-console.json'),
    ];
    const filePath = candidatePaths.find((candidate) => fs.existsSync(candidate));
    if (!filePath) {
        res.status(404).json({ message: 'OpenAPI artifact not found.' });
        return;
    }
    res.sendFile(filePath);
});
router.get('/openapi/question-bank.json', authorize('superadmin', 'admin', 'moderator', 'editor'), (_req: Request, res: Response) => {
    const candidatePaths = [
        path.resolve(process.cwd(), '../docs/openapi/question-bank.json'),
        path.resolve(process.cwd(), 'docs/openapi/question-bank.json'),
    ];
    const filePath = candidatePaths.find((candidate) => fs.existsSync(candidate));
    if (!filePath) {
        res.status(404).json({ message: 'OpenAPI artifact not found.' });
        return;
    }
    res.sendFile(filePath);
});
router.get('/openapi/news-system.json', authorize('superadmin', 'admin', 'moderator', 'editor'), (_req: Request, res: Response) => {
    const candidatePaths = [
        path.resolve(process.cwd(), '../docs/openapi/news-system.json'),
        path.resolve(process.cwd(), 'docs/openapi/news-system.json'),
    ];
    const filePath = candidatePaths.find((candidate) => fs.existsSync(candidate));
    if (!filePath) {
        res.status(404).json({ message: 'OpenAPI artifact not found.' });
        return;
    }
    res.sendFile(filePath);
});

/* ─────────────────────────────────────────────────────────────
   ROLE-BASED MIDDLEWARE
   superadmin → full access
   admin → nearly full access
   moderator → content management
   editor → content editing
   viewer → read-only
───────────────────────────────────────────────────────────── */

/* ── Site Settings ── */
router.get('/settings', authorize('superadmin', 'admin'), getSiteSettings);
router.put('/settings', authorize('superadmin', 'admin'), updateSiteSettings);
router.get('/settings/site', authorize('superadmin', 'admin', 'moderator', 'editor'), getSettings);
router.put('/settings/site', authorize('superadmin', 'admin'), uploadMiddleware.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), updateSettings);
router.get('/settings/home', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetHomeSettings);
router.put('/settings/home', authorize('superadmin', 'admin', 'moderator', 'editor'), adminUpdateHomeSettings);
router.get('/social-links', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetSocialLinks);
router.post('/social-links', authorize('superadmin', 'admin'), adminCreateSocialLink);
router.put('/social-links/:id', authorize('superadmin', 'admin'), adminUpdateSocialLink);
router.delete('/social-links/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('site_settings', 'social_link_delete'), adminDeleteSocialLink);
router.get('/settings/runtime', authorize('superadmin', 'admin'), getRuntimeSettings);
router.put('/settings/runtime', authorize('superadmin', 'admin'), updateRuntimeSettingsController);
router.get('/settings/admin-ui', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'), getAdminUiLayoutSettings);
router.put('/settings/admin-ui', authorize('superadmin', 'admin'), updateAdminUiLayoutSettings);
router.get('/settings/notifications', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetNotificationAutomationSettings);
router.put('/settings/notifications', authorize('superadmin', 'admin'), adminUpdateNotificationAutomationSettings);
router.get('/settings/analytics', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetAnalyticsSettings);
router.put('/settings/analytics', authorize('superadmin', 'admin'), adminUpdateAnalyticsSettings);
router.get('/settings/university', authorize('superadmin', 'admin', 'moderator', 'editor'), getUniversitySettings);
router.put('/settings/university', authorize('superadmin', 'admin'), updateUniversitySettings);

/* ── Security ── */
router.get('/security-settings', authorize('superadmin', 'admin'), getAdminSecuritySettings);
router.put('/security-settings', authorize('superadmin', 'admin'), requireSensitiveAction({ actionKey: 'security.settings_change', moduleName: 'security_center', actionName: 'settings_update' }), updateAdminSecuritySettings);
router.post('/security-settings/reset-defaults', authorize('superadmin', 'admin'), requireSensitiveAction({ actionKey: 'security.settings_change', moduleName: 'security_center', actionName: 'settings_reset' }), resetAdminSecuritySettings);
router.post('/security-settings/force-logout-all', authorize('superadmin', 'admin'), requireSensitiveAction({ actionKey: 'security.settings_change', moduleName: 'security_center', actionName: 'force_logout_all' }), forceLogoutAllUsers);
router.post('/security-settings/admin-panel-lock', authorize('superadmin', 'admin'), requireSensitiveAction({ actionKey: 'security.settings_change', moduleName: 'security_center', actionName: 'admin_panel_lock' }), lockAdminPanel);
router.get('/security/sessions', authorize('superadmin', 'admin', 'moderator'), canManageStudents, getActiveSessions);
router.post('/security/force-logout', authorize('superadmin', 'admin'), canManageStudents, requireSensitiveAction({ actionKey: 'security.settings_change', moduleName: 'security_center', actionName: 'force_logout_user' }), forceLogoutUser);
router.get('/security/2fa/users', authorize('superadmin', 'admin'), canManageStudents, getTwoFactorUsers);
router.patch('/security/2fa/users/:id', authorize('superadmin', 'admin'), canManageStudents, requireSensitiveAction({ actionKey: 'security.settings_change', moduleName: 'security_center', actionName: 'update_user_2fa' }), updateTwoFactorUser);
router.post('/security/2fa/users/:id/reset', authorize('superadmin', 'admin'), canManageStudents, requireSensitiveAction({ actionKey: 'security.settings_change', moduleName: 'security_center', actionName: 'reset_user_2fa' }), resetTwoFactorUser);
router.get('/security/2fa/failures', authorize('superadmin', 'admin'), canManageStudents, getTwoFactorFailures);
router.get('/security/dashboard', authorize('superadmin', 'admin'), getSecurityDashboardMetrics);
router.get('/audit-logs', authorize('superadmin', 'admin'), getAuditLogsList);

/* ── Reports & Analytics ── */
router.get('/reports/summary', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminGetReportsSummary);
router.get('/reports/export', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, requireSensitiveExport('reports', 'summary_export'), trackSensitiveExport({ moduleName: 'reports', actionName: 'summary_export' }), adminExportReportsSummary);
router.get('/reports/analytics', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminGetAnalyticsOverview);
router.get('/reports/events/export', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, requireSensitiveExport('reports', 'event_logs_export'), trackSensitiveExport({ moduleName: 'reports', actionName: 'event_logs_export' }), adminExportEventLogs);
router.get('/reports/exams/:examId/insights', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminGetExamInsights);
router.get('/reports/exams/:examId/insights/export', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, requireSensitiveExport('reports', 'exam_insights_export'), trackSensitiveExport({ moduleName: 'reports', actionName: 'exam_insights_export', targetType: 'exam', targetParam: 'examId' }), adminExportExamInsights);

/* ── Exams ── */
router.get('/exams', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetExams);
router.get('/exams/daily-report', authorize('superadmin', 'admin', 'moderator'), canViewReports, adminDailyReport);
router.get('/exams/live-sessions', authorize('superadmin', 'admin', 'moderator'), canViewReports, adminGetLiveExamSessions);
router.get('/live/attempts', authorize('superadmin', 'admin', 'moderator'), canViewReports, adminGetLiveExamSessions);
router.get('/live/stream', authorize('superadmin', 'admin', 'moderator'), canViewReports, adminLiveStream);
router.post('/live/attempts/:attemptId/action', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminLiveAttemptAction);
router.get('/exams/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetExamById);
router.post('/exams', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminCreateExam);
router.post('/exams/sign-banner-upload', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminSignExamBannerUpload);
router.post('/exams/:id/clone', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminCloneExam);
router.post('/exams/:id/share-link/regenerate', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminRegenerateExamShareLink);
router.put('/exams/:id', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminUpdateExam);
router.delete('/exams/:id', authorize('superadmin', 'admin'), canDeleteData, requireDestructiveStepUp('exams', 'exam_delete'), adminDeleteExam);
router.patch('/exams/:id/publish', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminPublishExam);
router.patch('/exams/:id/publish-result', authorize('superadmin', 'admin'), canEditExams, requireTwoPersonForExamResultPublish, adminPublishResult);
router.patch('/exams/:examId/force-submit/:studentId', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminForceSubmit);
router.patch('/exams/evaluate/:resultId', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, adminEvaluateResult);
router.get('/exams/:examId/results', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminGetExamResults);
router.get('/exams/:examId/analytics', authorize('superadmin', 'admin', 'moderator'), canViewReports, adminGetExamAnalytics);
router.get('/exams/:examId/export', authorize('superadmin', 'admin'), canViewReports, requireSensitiveAction({ actionKey: 'students.export', moduleName: 'reports', actionName: 'exam_results_export', enforceExportRolePolicy: true }), adminExportExamResults);
router.get('/exams/:id/results/import-template', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminDownloadExamResultsImportTemplate);
router.post('/exams/:id/results/import', authorize('superadmin', 'admin', 'moderator'), canEditExams, upload.single('file'), adminImportExamResults);
router.post('/exams/:id/results/import-external', authorize('superadmin', 'admin', 'moderator'), canEditExams, upload.single('file'), adminImportExternalExamResults);
router.post('/exams/:id/import/preview', authorize('superadmin', 'admin', 'moderator'), canEditExams, upload.single('file'), adminPreviewExamImport);
router.post('/exams/:id/import/commit', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminCommitExamImport);
router.get('/exams/:id/import/logs', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminGetExamImportLogs);
router.post('/exams/:id/profile-sync/run', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminRunExamProfileSync);
router.get('/exams/:id/profile-sync/logs', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminGetExamProfileSyncLogs);
router.get('/exams/:id/reports/export', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, requireSensitiveAction({ actionKey: 'students.export', moduleName: 'reports', actionName: 'exam_report_export', enforceExportRolePolicy: true }), adminExportExamReport);
router.get('/exams/:id/events/export', authorize('superadmin', 'admin', 'moderator'), canViewReports, requireSensitiveExport('reports', 'exam_events_export'), trackSensitiveExport({ moduleName: 'reports', actionName: 'exam_events_export', targetType: 'exam', targetParam: 'id' }), adminExportExamEvents);
router.post('/exams/:id/preview/start', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminStartExamPreview);
router.patch('/exams/:examId/reset-attempt/:userId', authorize('superadmin', 'admin'), canEditExams, adminResetExamAttempt);
router.get('/exam-import-templates', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminGetExamImportTemplates);
router.post('/exam-import-templates', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminCreateExamImportTemplate);
router.put('/exam-import-templates/:id', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminUpdateExamImportTemplate);
router.delete('/exam-import-templates/:id', authorize('superadmin', 'admin'), canDeleteData, requireDestructiveStepUp('exams', 'exam_import_template_delete'), adminDeleteExamImportTemplate);
router.get('/exam-mapping-profiles', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminGetExamMappingProfiles);
router.post('/exam-mapping-profiles', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminCreateExamMappingProfile);
router.put('/exam-mapping-profiles/:id', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminUpdateExamMappingProfile);
router.delete('/exam-mapping-profiles/:id', authorize('superadmin', 'admin'), canDeleteData, requireDestructiveStepUp('exams', 'exam_mapping_profile_delete'), adminDeleteExamMappingProfile);
router.get('/exam-centers', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminGetExamCenters);
router.post('/exam-centers', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminCreateExamCenter);
router.put('/exam-centers/:id', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminUpdateExamCenter);
router.delete('/exam-centers/:id', authorize('superadmin', 'admin'), canDeleteData, requireDestructiveStepUp('exams', 'exam_center_delete'), adminDeleteExamCenter);
router.get('/exam-center-settings', authorize('superadmin', 'admin', 'moderator', 'editor'), canViewReports, adminGetExamCenterSettings);
router.put('/exam-center-settings', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminUpdateExamCenterSettings);

/* ── Questions (per-exam) ── */
router.get('/exams/:examId/questions', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetQuestions);
router.post('/exams/:examId/questions', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, adminCreateQuestion);
router.put('/exams/:examId/questions/reorder', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminReorderQuestions);
router.put('/exams/:examId/questions/:questionId', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, adminUpdateQuestion);
router.delete('/exams/:examId/questions/:questionId', authorize('superadmin', 'admin', 'moderator'), canEditExams, requireDestructiveStepUp('exams', 'exam_question_delete'), adminDeleteQuestion);
router.post('/exams/:examId/questions/import-excel', authorize('superadmin', 'admin', 'moderator'), canEditExams, adminImportQuestionsFromExcel);
router.get('/exams/:id/questions/template.xlsx', authorize('superadmin', 'admin', 'moderator', 'editor'), async (_req: Request, res: Response) => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Questions');
    ws.columns = [
        { header: 'question_en', key: 'question_en', width: 40 },
        { header: 'question_bn', key: 'question_bn', width: 40 },
        { header: 'optionA_en', key: 'optionA_en', width: 20 },
        { header: 'optionA_bn', key: 'optionA_bn', width: 20 },
        { header: 'optionB_en', key: 'optionB_en', width: 20 },
        { header: 'optionB_bn', key: 'optionB_bn', width: 20 },
        { header: 'optionC_en', key: 'optionC_en', width: 20 },
        { header: 'optionC_bn', key: 'optionC_bn', width: 20 },
        { header: 'optionD_en', key: 'optionD_en', width: 20 },
        { header: 'optionD_bn', key: 'optionD_bn', width: 20 },
        { header: 'correctKey', key: 'correctKey', width: 10 },
        { header: 'marks', key: 'marks', width: 8 },
        { header: 'negativeMarks', key: 'negativeMarks', width: 12 },
        { header: 'explanation_en', key: 'explanation_en', width: 30 },
        { header: 'explanation_bn', key: 'explanation_bn', width: 30 },
    ];
    ws.addRow({ question_en: 'What is 2+2?', optionA_en: '3', optionB_en: '4', optionC_en: '5', optionD_en: '6', correctKey: 'B', marks: 1 });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="questions_template.xlsx"');
    await wb.xlsx.write(res);
    res.end();
});

/* ── Global Question Bank ── */
router.get('/question-bank', authorize('superadmin', 'admin', 'moderator', 'editor'), getQuestions);
router.get('/question-bank/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), getQuestionById);
router.post('/question-bank', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, createQuestion);
router.put('/question-bank/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, updateQuestion);
router.delete('/question-bank/:id', authorize('superadmin', 'admin', 'moderator'), canDeleteData, requireDestructiveStepUp('question_bank', 'question_delete'), deleteQuestion);
router.post('/question-bank/:id/approve', authorize('superadmin', 'admin', 'moderator'), canEditExams, approveQuestion);
router.post('/question-bank/:id/lock', authorize('superadmin', 'admin', 'moderator'), canEditExams, lockQuestion);
router.post('/question-bank/:id/revert/:revisionNo', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, revertQuestionRevision);
router.post('/question-bank/search/similar', authorize('superadmin', 'admin', 'moderator', 'editor'), searchSimilarQuestions);
router.post('/question-bank/bulk-import', authorize('superadmin', 'admin', 'moderator'), canEditExams, upload.single('file'), bulkImportQuestions);
router.get('/question-bank/import/:jobId', authorize('superadmin', 'admin', 'moderator', 'editor'), getQuestionImportJob);
router.post('/question-bank/export', authorize('superadmin', 'admin', 'moderator', 'editor'), requireSensitiveExport('question_bank', 'bank_export'), trackSensitiveExport({ moduleName: 'question_bank', actionName: 'bank_export' }), exportQuestions);
router.post('/question-bank/media/sign-upload', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, signQuestionMediaUpload);
router.post('/question-bank/media', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, createQuestionMedia);
// Consolidated under /question-bank

/* ── Universities (Full CRUD) ── */
router.get('/universities', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetAllUniversities);
router.get('/universities/categories', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetUniversityCategories);
router.get('/university-categories', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetUniversityCategoryMaster);
router.post('/university-categories', authorize('superadmin', 'admin', 'moderator'), adminCreateUniversityCategory);
router.put('/university-categories/:id', authorize('superadmin', 'admin', 'moderator'), adminUpdateUniversityCategory);
router.post('/university-categories/:id/sync-config', authorize('superadmin', 'admin', 'moderator'), adminSyncUniversityCategoryConfig);
router.patch('/university-categories/:id/toggle', authorize('superadmin', 'admin', 'moderator'), adminToggleUniversityCategory);
router.delete('/university-categories/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('universities', 'category_delete'), adminDeleteUniversityCategory);
router.get('/universities/export', authorize('superadmin', 'admin', 'moderator', 'editor'), requireSensitiveExport('universities', 'export'), trackSensitiveExport({ moduleName: 'universities', actionName: 'export' }), adminExportUniversities);
router.get('/universities/template.xlsx', authorize('superadmin', 'admin', 'moderator', 'editor'), adminDownloadUniversityImportTemplate);
router.put('/universities/reorder-featured', authorize('superadmin', 'admin', 'moderator'), adminReorderFeaturedUniversities);
router.post('/universities/bulk-delete', authorize('superadmin', 'admin'), requireDestructiveStepUp('universities', 'bulk_delete'), requireTwoPersonForUniversitiesBulkDelete, adminBulkDeleteUniversities);
router.patch('/universities/bulk-update', authorize('superadmin', 'admin', 'moderator'), adminBulkUpdateUniversities);
router.get('/universities/import/template', authorize('superadmin', 'admin', 'moderator', 'editor'), adminDownloadUniversityImportTemplate);
router.post('/universities/import', authorize('superadmin', 'admin'), upload.single('file'), adminInitUniversityImport);
router.post('/universities/import/init', authorize('superadmin', 'admin'), upload.single('file'), adminInitUniversityImport);
router.post('/universities/import/:jobId/validate', authorize('superadmin', 'admin', 'moderator'), adminValidateUniversityImport);
router.post('/universities/import/:jobId/commit', authorize('superadmin', 'admin'), adminCommitUniversityImport);
router.get('/universities/import/:jobId/errors.csv', authorize('superadmin', 'admin', 'moderator'), adminDownloadUniversityImportErrors);
router.get('/universities/import/:jobId', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetUniversityImportJob);
router.get('/universities/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetUniversityById);
router.post('/universities', authorize('superadmin', 'admin', 'moderator'), adminCreateUniversity);
router.put('/universities/:id', authorize('superadmin', 'admin', 'moderator'), adminUpdateUniversity);
router.delete('/universities/:id', authorize('superadmin', 'admin'), canDeleteData, requireDestructiveStepUp('universities', 'university_delete'), adminDeleteUniversity);
router.patch('/universities/:id/toggle-status', authorize('superadmin', 'admin'), adminToggleUniversityStatus);
router.post('/universities/import-excel', authorize('superadmin', 'admin'), upload.single('file'), adminBulkImportUniversities);

/* â”€â”€ University Clusters â”€â”€ */
router.get('/university-clusters', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetUniversityClusters);
router.post('/university-clusters', authorize('superadmin', 'admin', 'moderator'), adminCreateUniversityCluster);
router.get('/university-clusters/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetUniversityClusterById);
router.put('/university-clusters/:id', authorize('superadmin', 'admin', 'moderator'), adminUpdateUniversityCluster);
router.post('/university-clusters/:id/members/resolve', authorize('superadmin', 'admin', 'moderator'), adminResolveUniversityClusterMembers);
router.patch('/university-clusters/:id/sync-dates', authorize('superadmin', 'admin', 'moderator'), adminSyncUniversityClusterDates);
router.delete('/university-clusters/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('universities', 'cluster_delete'), adminDeleteUniversityCluster);

/* ── Legacy News CRUD ── */

/* ── News Hub (spec aliases) ── */
router.get('/news/dashboard', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2Dashboard);
router.post('/news/fetch-now', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2FetchNow);
router.get('/news', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2GetItems);
router.post('/news', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2CreateItem);
router.post('/news/bulk-approve', authorize('superadmin', 'admin', 'moderator'), adminNewsV2BulkApprove);
router.post('/news/bulk-reject', authorize('superadmin', 'admin', 'moderator'), adminNewsV2BulkReject);
router.get('/news/settings', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2GetAllSettings);
router.put('/news/settings', authorize('superadmin', 'admin', 'moderator'), adminNewsV2UpdateAllSettings);
router.patch('/news/settings', authorize('superadmin', 'admin', 'moderator'), adminNewsV2UpdateAllSettings);
router.get('/news/settings/appearance', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2GetAppearanceSettings);
router.put('/news/settings/appearance', authorize('superadmin', 'admin', 'moderator'), adminNewsV2UpdateAppearanceSettings);
router.get('/news/settings/ai', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2GetAiSettings);
router.put('/news/settings/ai', authorize('superadmin', 'admin', 'moderator'), adminNewsV2UpdateAiSettings);
router.get('/news/settings/share', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2GetShareSettings);
router.put('/news/settings/share', authorize('superadmin', 'admin', 'moderator'), adminNewsV2UpdateShareSettings);
router.get('/news/notices', authorize('superadmin', 'admin', 'moderator', 'editor', 'support_agent'), canManageTickets, adminGetNotices);
router.post('/news/notices', authorize('superadmin', 'admin', 'moderator', 'support_agent'), canManageTickets, adminCreateNotice);
router.patch('/news/notices/:id/toggle', authorize('superadmin', 'admin', 'moderator', 'support_agent'), canManageTickets, adminToggleNotice);
router.get('/news/media', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2GetMedia);
router.post('/news/media/upload', authorize('superadmin', 'admin', 'moderator', 'editor'), uploadMiddleware.single('file'), adminNewsV2UploadMedia);
router.post('/news/media/from-url', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2MediaFromUrl);
router.delete('/news/media/:id', authorize('superadmin', 'admin', 'moderator'), requireDestructiveStepUp('news', 'news_media_delete'), adminNewsV2DeleteMedia);
router.get('/news/export', authorize('superadmin', 'admin', 'moderator', 'editor'), requireSensitiveExport('news', 'news_export'), trackSensitiveExport({ moduleName: 'news', actionName: 'news_export' }), adminNewsV2ExportNews);
router.get('/news/exports/sources', authorize('superadmin', 'admin', 'moderator', 'editor'), requireSensitiveExport('news', 'rss_sources_export'), trackSensitiveExport({ moduleName: 'news', actionName: 'rss_sources_export' }), adminNewsV2ExportSources);
router.get('/news/exports/logs', authorize('superadmin', 'admin', 'moderator', 'editor'), requireSensitiveExport('news', 'news_logs_export'), trackSensitiveExport({ moduleName: 'news', actionName: 'news_logs_export' }), adminNewsV2ExportLogs);
router.get('/news/audit-logs', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2GetAuditLogs);
router.get('/news/sources', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2GetSources);
router.post('/news/sources', authorize('superadmin', 'admin', 'moderator'), adminNewsV2CreateSource);
router.put('/news/sources/:id', authorize('superadmin', 'admin', 'moderator'), adminNewsV2UpdateSource);
router.delete('/news/sources/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('news', 'source_delete'), adminNewsV2DeleteSource);
router.post('/news/sources/:id/test', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2TestSource);
router.post('/news/sources/reorder', authorize('superadmin', 'admin', 'moderator'), adminNewsV2ReorderSources);
router.post('/news/:id/ai-check', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2AiCheckItem);
router.post('/news/:id/approve', authorize('superadmin', 'admin', 'moderator'), adminNewsV2Approve);
router.post('/news/:id/approve-publish', authorize('superadmin', 'admin', 'moderator'), adminNewsV2ApprovePublish);
router.post('/news/:id/reject', authorize('superadmin', 'admin', 'moderator'), adminNewsV2Reject);
router.post('/news/:id/schedule', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2Schedule);
router.post('/news/:id/publish-now', authorize('superadmin', 'admin', 'moderator'), adminNewsV2PublishNow);
router.post('/news/:id/publish-send', authorize('superadmin', 'admin', 'moderator'), requireSensitiveAction({ actionKey: 'news.publish_breaking', moduleName: 'news', actionName: 'publish_send' }), adminNewsV2PublishSend);
router.post('/news/:id/move-to-draft', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2MoveToDraft);
router.post('/news/:id/archive', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2Archive);
router.post('/news/:id/convert-to-notice', authorize('superadmin', 'admin', 'moderator', 'editor', 'support_agent'), canManageTickets, adminNewsV2ConvertToNotice);
router.post('/news/:id/publish-anyway', authorize('superadmin', 'admin', 'moderator'), adminNewsV2PublishAnyway);
router.post('/news/:id/merge', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2MergeDuplicate);
router.post('/news/:id/submit-review', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2SubmitReview);
router.get('/news/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2GetItemById);
router.put('/news/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), adminNewsV2UpdateItem);
router.delete('/news/:id', authorize('superadmin', 'admin', 'moderator'), canDeleteData, requireDestructiveStepUp('news', 'news_delete'), requireTwoPersonForNewsDelete, adminNewsV2DeleteItem);

/* ── News Categories ── */
router.get('/news-category', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetNewsCategories);
router.post('/news-category', authorize('superadmin', 'admin'), adminCreateNewsCategory);
router.put('/news-category/:id', authorize('superadmin', 'admin'), adminUpdateNewsCategory);
router.delete('/news-category/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('news', 'category_delete'), adminDeleteNewsCategory);
router.patch('/news-category/:id/toggle', authorize('superadmin', 'admin'), adminToggleNewsCategory);

/* ── News V2 ── */


/* ── Service Categories ── */
router.get('/service-categories', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetCategories);
router.post('/service-categories', authorize('superadmin', 'admin'), adminCreateCategory);
router.put('/service-categories/:id', authorize('superadmin', 'admin'), adminUpdateCategory);
router.delete('/service-categories/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('services', 'service_category_delete'), adminDeleteCategory);

/* ── Services CRUD ── */
router.get('/services', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetServices);
router.post('/services', authorize('superadmin', 'admin', 'moderator'), adminCreateService);
router.put('/services/:id', authorize('superadmin', 'admin', 'moderator'), adminUpdateService);
router.delete('/services/:id', authorize('superadmin', 'admin'), canDeleteData, requireDestructiveStepUp('services', 'service_delete'), adminDeleteService);
router.post('/services/reorder', authorize('superadmin', 'admin', 'moderator'), adminReorderServices);
router.patch('/services/:id/toggle-status', authorize('superadmin', 'admin', 'moderator'), adminToggleServiceStatus);
router.patch('/services/:id/toggle-featured', authorize('superadmin', 'admin', 'moderator'), adminToggleServiceFeatured);

/* ── Resources CRUD ── */
router.get('/resources', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetResources);
router.post('/resources', authorize('superadmin', 'admin', 'moderator', 'editor'), adminCreateResource);
router.put('/resources/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), adminUpdateResource);
router.delete('/resources/:id', authorize('superadmin', 'admin', 'moderator'), canDeleteData, requireDestructiveStepUp('resources', 'resource_delete'), adminDeleteResource);
router.patch('/resources/:id/toggle-publish', authorize('superadmin', 'admin', 'moderator', 'editor'), adminToggleResourcePublish);
router.patch('/resources/:id/toggle-featured', authorize('superadmin', 'admin', 'moderator', 'editor'), adminToggleResourceFeatured);
router.get('/resource-settings', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetResourceSettings);
router.put('/resource-settings', authorize('superadmin', 'admin', 'moderator'), adminUpdateResourceSettings);

/* ── Contact Messages ── */
router.get('/contact-messages', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminGetContactMessages);
router.get('/contact-messages/:id', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminGetContactMessageById);
router.patch('/contact-messages/:id', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminUpdateContactMessage);
router.post('/contact-messages/:id/mark-read', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminMarkContactMessageRead);
router.post('/contact-messages/:id/resolve', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminResolveContactMessage);
router.post('/contact-messages/:id/archive', authorize('superadmin', 'admin', 'moderator', 'support_agent'), requireDestructiveStepUp('contact_messages', 'contact_message_archive'), adminArchiveContactMessage);
router.delete('/contact-messages/:id', authorize('superadmin', 'admin'), canDeleteData, requireDestructiveStepUp('contact_messages', 'contact_message_delete'), adminDeleteContactMessage);

/* ── Banners & Config ── */
router.get('/banners', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetBanners);
router.get('/banners/active', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetBanners);
router.post('/banners/sign-upload', authorize('superadmin', 'admin', 'moderator'), adminSignBannerUpload);
router.post('/banners', authorize('superadmin', 'admin', 'moderator'), adminCreateBanner);
router.put('/banners/:id', authorize('superadmin', 'admin', 'moderator'), adminUpdateBanner);
router.delete('/banners/:id', authorize('superadmin', 'admin'), canDeleteData, requireDestructiveStepUp('site_settings', 'banner_delete'), adminDeleteBanner);
router.put('/banners/:id/publish', authorize('superadmin', 'admin', 'moderator'), adminPublishBanner);

/* ── Home Alerts (Live Ticker) ── */
router.get('/home-alerts', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetAlerts);
router.post('/home-alerts', authorize('superadmin', 'admin', 'moderator'), adminCreateAlert);
router.put('/home-alerts/:id', authorize('superadmin', 'admin', 'moderator'), adminUpdateAlert);
router.delete('/home-alerts/:id', authorize('superadmin', 'admin'), canDeleteData, requireDestructiveStepUp('site_settings', 'home_alert_delete'), adminDeleteAlert);
router.patch('/home-alerts/:id/toggle', authorize('superadmin', 'admin', 'moderator'), adminToggleAlert);
router.put('/home-alerts/:id/publish', authorize('superadmin', 'admin', 'moderator'), adminPublishAlert);
// Consolidated under /home-alerts
// Deprecated aliases kept temporarily for legacy callers.
router.get('/alerts', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetAlerts);
router.post('/alerts', authorize('superadmin', 'admin', 'moderator'), adminCreateAlert);
router.put('/alerts/:id', authorize('superadmin', 'admin', 'moderator'), adminUpdateAlert);
router.delete('/alerts/:id', authorize('superadmin', 'admin'), canDeleteData, requireDestructiveStepUp('site_settings', 'alert_delete'), adminDeleteAlert);
router.patch('/alerts/:id/toggle', authorize('superadmin', 'admin', 'moderator'), adminToggleAlert);
router.put('/alerts/:id/publish', authorize('superadmin', 'admin', 'moderator'), adminPublishAlert);

router.get('/home-config', authorize('superadmin', 'admin', 'editor'), getHomeConfig);
router.put('/home-config', authorize('superadmin', 'admin', 'editor'), updateHomeConfig);

/* ── Dynamic Home System ── */
router.get('/home-settings', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetHomeSettings);
router.put('/home-settings', authorize('superadmin', 'admin', 'moderator', 'editor'), adminUpdateHomeSettings);
router.get('/home-settings/defaults', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetHomeSettingsDefaults);
router.post('/home-settings/reset-section', authorize('superadmin', 'admin', 'moderator', 'editor'), adminResetHomeSettingsSection);
router.put('/home/settings', authorize('superadmin', 'admin'), uploadMiddleware.fields([{ name: 'logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 }]), updateSettings);
router.put('/home', authorize('superadmin', 'admin'), updateHome);
router.put('/home/hero', authorize('superadmin', 'admin', 'moderator', 'editor'), uploadMiddleware.single('file'), updateHero);
router.put('/home/banner', authorize('superadmin', 'admin'), uploadMiddleware.single('image'), updatePromotionalBanner);
router.put('/home/announcement', authorize('superadmin', 'admin', 'moderator'), updateAnnouncement);
router.put('/home/stats', authorize('superadmin', 'admin'), updateStats);

/* ── Media ── */
router.post('/upload', authorize('superadmin', 'admin', 'moderator', 'editor'), uploadMiddleware.single('file'), uploadMedia);

/* ── Student & User Management ── */
router.get('/users/admin/profile', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetAdminProfile);
router.put('/users/admin/profile', authorize('superadmin', 'admin', 'moderator', 'editor'), adminUpdateAdminProfile);

router.get('/users', authorize('superadmin'), adminGetUsers);
router.get('/users/activity', authorize('superadmin', 'admin'), adminGetUserActivity);
router.get('/users/stream', authorize('superadmin', 'admin'), adminUserStream);
router.get('/users/:id', authorize('superadmin', 'admin'), adminGetUserById);
router.post('/users', authorize('superadmin'), adminCreateUser);
router.put('/users/:id', authorize('superadmin'), adminUpdateUser);
router.put('/users/:id/role', authorize('superadmin'), requireSecurityStepUp('users', 'role_update'), adminUpdateUserRole);
router.patch('/users/:id/toggle-status', authorize('superadmin', 'admin'), adminToggleUserStatus);
router.delete('/users/:id', authorize('superadmin'), requireDestructiveStepUp('users', 'user_delete'), adminDeleteUser);
router.patch('/users/:id/set-status', authorize('superadmin'), adminSetUserStatus);
router.patch('/users/:id/permissions', authorize('superadmin'), adminSetUserPermissions);
router.post('/users/bulk-action', authorize('superadmin'), adminBulkUserAction);
router.get('/audit-logs', authorize('superadmin', 'admin', 'moderator', 'editor'), (req: Request, res: Response) => {
    const scope = String(req.query.scope || '').trim().toLowerCase();
    const moduleScope = String(req.query.module || '').trim().toLowerCase();
    if (scope === 'news' || moduleScope === 'news') {
        void adminNewsV2GetAuditLogs(req as any, res);
        return;
    }

    const role = String((req as any)?.user?.role || '').toLowerCase();
    if (role !== 'superadmin') {
        forbidden(res, { message: 'Only super admin can access system audit logs.' });
        return;
    }

    void adminGetSystemAuditLogs(req as any, res);
});

/* ── Extended Student Management ── */
router.get('/students', authorize('superadmin', 'admin', 'moderator'), canManageStudents, adminGetStudents);
router.post('/students', authorize('superadmin', 'admin', 'moderator'), canManageStudents, adminCreateStudent);
router.put('/students/:id', authorize('superadmin', 'admin', 'moderator'), canManageStudents, adminUpdateStudent);
router.post('/students/bulk-action', authorize('superadmin', 'admin', 'moderator'), canManageStudents, requireTwoPersonForStudentBulkDelete, adminBulkStudentAction);
router.post('/students/bulk-import', authorize('superadmin', 'admin', 'moderator'), canManageStudents, upload.single('file'), adminBulkImportStudents);
router.put('/students/:id/subscription', authorize('superadmin', 'admin', 'moderator'), canManageStudents, subscriptionActionRateLimiter, adminLegacyAssignStudentSubscription);
/* ── Extracted Admin Features ── */
router.post('/users/:id/reset-password', authorize('superadmin', 'admin'), requireSecurityStepUp('users', 'password_reset'), adminResetUserPassword);
router.post('/students/:id/reset-password', authorize('superadmin', 'admin'), canManageStudents, requireSecurityStepUp('students_groups', 'password_reset'), adminResetUserPassword);
router.get('/students/profile-requests', authorize('superadmin', 'admin', 'moderator'), canManageStudents, adminGetProfileUpdateRequests);
router.post('/students/profile-requests/:id/approve', authorize('superadmin', 'admin'), canManageStudents, adminApproveProfileUpdateRequest);
router.post('/students/profile-requests/:id/reject', authorize('superadmin', 'admin'), canManageStudents, adminRejectProfileUpdateRequest);

/* ── Student Import/Export ── */
router.get('/students/import/template', authorize('superadmin', 'admin', 'moderator', 'editor'), adminDownloadStudentTemplate);
router.post('/students/import/init', authorize('superadmin', 'admin'), upload.single('file'), adminInitStudentImport);
router.get('/students/import/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetStudentImportJob);
router.post('/students/import/:id/validate', authorize('superadmin', 'admin', 'moderator'), adminValidateStudentImport);
router.post('/students/import/:id/commit', authorize('superadmin', 'admin'), adminCommitStudentImport);

router.get('/user-stream', authorize('superadmin', 'admin'), adminUserStream);
router.get('/student-groups', authorize('superadmin', 'admin', 'moderator'), adminGetStudentGroups);
router.get('/student-groups/export', authorize('superadmin', 'admin', 'moderator'), canViewReports, requireSensitiveExport('students_groups', 'student_groups_export', true), trackSensitiveExport({ moduleName: 'students_groups', actionName: 'student_groups_export' }), adminExportStudentGroups);
router.post('/student-groups/import', authorize('superadmin', 'admin', 'moderator'), canManageStudents, upload.single('file'), adminImportStudentGroups);
router.post('/student-groups', authorize('superadmin', 'admin', 'moderator'), adminCreateStudentGroup);
router.put('/student-groups/:id', authorize('superadmin', 'admin', 'moderator'), adminUpdateStudentGroup);
router.delete('/student-groups/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('students_groups', 'student_group_delete'), adminDeleteStudentGroup);

/* ── Subscription Plans ── */
router.get('/subscription-plans', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetSubscriptionPlans);
router.get('/subscription-plans/export', authorize('superadmin', 'admin', 'moderator', 'editor'), canManagePlans, requireSensitiveExport('subscription_plans', 'plans_export'), trackSensitiveExport({ moduleName: 'subscription_plans', actionName: 'plans_export' }), adminExportSubscriptionPlans);
router.post('/subscription-plans/:id/duplicate', authorize('superadmin', 'admin'), canManagePlans, adminDuplicateSubscriptionPlan);
router.get('/subscription-plans/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetSubscriptionPlanById);
router.post('/subscription-plans', authorize('superadmin', 'admin'), canManagePlans, adminCreateSubscriptionPlan);
router.put('/subscription-plans/reorder', authorize('superadmin', 'admin'), canManagePlans, adminReorderSubscriptionPlans);
router.put('/subscription-plans/:id', authorize('superadmin', 'admin'), canManagePlans, adminUpdateSubscriptionPlan);
router.delete('/subscription-plans/:id', authorize('superadmin', 'admin'), canManagePlans, requireDestructiveStepUp('subscription_plans', 'plan_delete'), adminDeleteSubscriptionPlan);
router.put('/subscription-plans/:id/toggle', authorize('superadmin', 'admin'), canManagePlans, adminToggleSubscriptionPlan);
router.patch('/subscription-plans/:id/toggle', authorize('superadmin', 'admin'), canManagePlans, adminToggleSubscriptionPlan);
router.put('/subscription-plans/:id/toggle-featured', authorize('superadmin', 'admin'), canManagePlans, adminToggleSubscriptionPlanFeatured);
router.get('/subscription-settings', authorize('superadmin', 'admin', 'moderator', 'editor'), canManagePlans, adminGetSubscriptionSettings);
router.put('/subscription-settings', authorize('superadmin', 'admin'), canManagePlans, adminUpdateSubscriptionSettings);

router.get('/user-subscriptions', authorize('superadmin', 'admin', 'moderator', 'editor'), canManagePlans, adminGetUserSubscriptions);
router.post('/user-subscriptions/create', authorize('superadmin', 'admin'), canManagePlans, adminCreateUserSubscription);
router.put('/user-subscriptions/:id/activate', authorize('superadmin', 'admin'), canManagePlans, adminActivateUserSubscription);
router.put('/user-subscriptions/:id/suspend', authorize('superadmin', 'admin'), canManagePlans, adminSuspendUserSubscriptionById);
router.put('/user-subscriptions/:id/expire', authorize('superadmin', 'admin'), canManagePlans, adminExpireUserSubscription);
router.get('/user-subscriptions/export', authorize('superadmin', 'admin', 'moderator', 'editor'), canManagePlans, requireSensitiveExport('subscription_plans', 'user_subscriptions_export', true), trackSensitiveExport({ moduleName: 'subscription_plans', actionName: 'user_subscriptions_export' }), adminExportSubscriptions);
router.post('/subscriptions/assign', authorize('superadmin', 'admin', 'moderator'), canManagePlans, subscriptionActionRateLimiter, adminAssignSubscription);
router.post('/subscriptions/suspend', authorize('superadmin', 'admin', 'moderator'), canManagePlans, subscriptionActionRateLimiter, adminSuspendSubscription);
router.get('/subscriptions/export', authorize('superadmin', 'admin', 'moderator', 'editor'), canManagePlans, requireSensitiveExport('subscription_plans', 'subscriptions_export', true), trackSensitiveExport({ moduleName: 'subscription_plans', actionName: 'subscriptions_export' }), adminExportSubscriptions);

/* ── Student LTV ── */
router.get('/students/:id/ltv', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetStudentLtv);

/* ── Manual Payments ── */
router.get('/payments', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetPayments);
router.get('/payments/export', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, requireSensitiveExport('payments', 'payments_export', true), trackSensitiveExport({ moduleName: 'payments', actionName: 'payments_export' }), adminExportPayments);
router.post('/payments', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminCreatePayment);
router.put('/payments/:id', authorize('superadmin', 'admin', 'finance_agent'), canManageFinance, requireTwoPersonForPaymentRefund, adminUpdatePayment);
router.get('/students/:id/payments', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetStudentPayments);

/* ── Expenses ── */
router.get('/finance/payments/:id/history', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetPayments); // Placeholder
router.post('/finance/payments/:id/approve', authorize('superadmin', 'admin', 'finance_agent'), canManageFinance, adminApprovePayment);
router.get('/expenses', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetExpenses);
router.post('/expenses', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminCreateExpense);
router.put('/expenses/:id', authorize('superadmin', 'admin', 'finance_agent'), canManageFinance, adminUpdateExpense);

/* ── Staff Payouts ── */
router.get('/staff-payouts', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetStaffPayouts);
router.post('/staff-payouts', authorize('superadmin', 'admin', 'finance_agent'), canManageFinance, adminCreateStaffPayout);

/* ── Finance Analytics ── */
router.get('/finance/summary', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetFinanceSummary);
router.get('/finance/revenue-series', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetFinanceRevenueSeries);
router.get('/finance/student-growth', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetFinanceStudentGrowth);
router.get('/finance/plan-distribution', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetFinancePlanDistribution);
router.get('/finance/expense-breakdown', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetFinanceExpenseBreakdown);
router.get('/finance/cashflow', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetFinanceCashflow);
router.get('/finance/test-board', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetFinanceTestBoard);
router.get('/finance/stream', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminFinanceStream);

/* ── Dues & Reminders ── */
router.get('/dues', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminGetDues);
router.patch('/dues/:studentId', authorize('superadmin', 'admin', 'finance_agent'), canManageFinance, adminUpdateDue);
router.post('/dues/:studentId/remind', authorize('superadmin', 'admin', 'moderator', 'finance_agent'), canManageFinance, adminSendDueReminder);
router.post('/reminders/dispatch', authorize('superadmin', 'admin', 'finance_agent'), canManageFinance, adminDispatchReminders);

/* ── Notices ── */
router.get('/notices', authorize('superadmin', 'admin', 'moderator', 'editor', 'support_agent'), canManageTickets, adminGetNotices);
router.post('/notices', authorize('superadmin', 'admin', 'moderator', 'support_agent'), canManageTickets, adminCreateNotice);
router.patch('/notices/:id/toggle', authorize('superadmin', 'admin', 'moderator', 'support_agent'), canManageTickets, adminToggleNotice);

/* ── Support Tickets ── */
router.get('/support-tickets', authorize('superadmin', 'admin', 'moderator', 'support_agent'), canManageTickets, adminGetSupportTickets);
router.get('/support-tickets/:id', authorize('superadmin', 'admin', 'moderator', 'support_agent'), canManageTickets, adminGetSupportTicketById);
router.patch('/support-tickets/:id/status', authorize('superadmin', 'admin', 'moderator', 'support_agent'), canManageTickets, adminUpdateSupportTicketStatus);
router.post('/support-tickets/:id/status', authorize('superadmin', 'admin', 'moderator', 'support_agent'), canManageTickets, adminUpdateSupportTicketStatus);
router.post('/support-tickets/:id/reply', authorize('superadmin', 'admin', 'moderator', 'support_agent'), canManageTickets, adminReplySupportTicket);
router.post('/support-tickets/:id/mark-read', authorize('superadmin', 'admin', 'moderator', 'support_agent'), canManageTickets, adminMarkSupportTicketRead);

router.get('/alerts/feed', authorize('superadmin', 'admin', 'moderator', 'viewer', 'support_agent', 'finance_agent'), adminGetActionableAlerts);
router.post('/alerts/mark-read', authorize('superadmin', 'admin', 'moderator', 'viewer', 'support_agent', 'finance_agent'), adminMarkActionableAlertsRead);
router.get('/alerts/unread-count', authorize('superadmin', 'admin', 'moderator', 'viewer', 'support_agent', 'finance_agent'), adminGetActionableAlertsUnreadCount);
router.post('/alerts/:id/read', authorize('superadmin', 'admin', 'moderator', 'viewer', 'support_agent', 'finance_agent'), adminMarkSingleActionableAlertRead);
router.post('/alerts/read-all', authorize('superadmin', 'admin', 'moderator', 'viewer', 'support_agent', 'finance_agent'), adminMarkAllActionableAlertsRead);
router.get('/notifications/unread-count', authorize('superadmin', 'admin', 'moderator', 'viewer', 'support_agent', 'finance_agent'), adminGetActionableAlertsUnreadCount);
router.post('/notifications/:id/read', authorize('superadmin', 'admin', 'moderator'), adminMarkSingleActionableAlertRead);
router.post('/notifications/read-all', authorize('superadmin', 'admin', 'moderator'), adminMarkAllActionableAlertsRead);

/* ── Backups ── */
router.post('/backups/run', authorize('superadmin', 'admin'), canManageBackups, adminRunBackup);
router.get('/backups', authorize('superadmin', 'admin', 'moderator'), canManageBackups, adminListBackups);
router.post('/backups/:id/restore', authorize('superadmin', 'admin'), canManageBackups, requireSensitiveAction({ actionKey: 'backups.restore', moduleName: 'backups', actionName: 'restore' }), adminRestoreBackup);
router.get('/backups/:id/download', authorize('superadmin', 'admin'), canManageBackups, adminDownloadBackup);
/* ── Badges ── */
router.get('/badges', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetBadges);
router.post('/badges', authorize('superadmin', 'admin'), adminCreateBadge);
router.put('/badges/:id', authorize('superadmin', 'admin'), adminUpdateBadge);
router.delete('/badges/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('students', 'badge_delete'), adminDeleteBadge);
router.post('/students/:studentId/badges/:badgeId', authorize('superadmin', 'admin'), adminAssignBadge);
router.delete('/students/:studentId/badges/:badgeId', authorize('superadmin', 'admin'), requireDestructiveStepUp('students', 'badge_revoke'), adminRevokeBadge);

/* ── Student Dashboard Configurations ── */
router.get('/dashboard-config', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetStudentDashboardConfig);
router.put('/dashboard-config', authorize('superadmin', 'admin'), adminUpdateStudentDashboardConfig);
// Consolidated under /dashboard-config

/* ── Notifications ── */
router.get('/notifications', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetNotifications);
router.post('/notifications', authorize('superadmin', 'admin', 'moderator'), adminCreateNotification);
router.put('/notifications/:id([0-9a-fA-F]{24})', authorize('superadmin', 'admin', 'moderator'), adminUpdateNotification);
router.patch('/notifications/:id([0-9a-fA-F]{24})/toggle', authorize('superadmin', 'admin', 'moderator'), adminToggleNotification);
router.delete('/notifications/:id([0-9a-fA-F]{24})', authorize('superadmin', 'admin'), requireDestructiveStepUp('notification_center', 'notification_delete'), adminDeleteNotification);

/* ── Parent / Guardian Link ── */
router.post('/students/:studentId/otp', authorize('superadmin', 'admin'), adminIssueGuardianOtp);
router.post('/students/:studentId/confirm-otp', authorize('superadmin', 'admin'), adminConfirmGuardianOtp);

/* ── Admin Dashboard Overrides ── */

/* ── Exports ── */
router.get('/export-news', authorize('superadmin', 'admin'), requireSensitiveExport('news', 'legacy_news_export'), trackSensitiveExport({ moduleName: 'news', actionName: 'legacy_news_export' }), adminExportNews);
router.get('/export-subscription-plans', authorize('superadmin', 'admin'), requireSensitiveExport('subscription_plans', 'legacy_plans_export'), trackSensitiveExport({ moduleName: 'subscription_plans', actionName: 'legacy_plans_export' }), adminExportSubscriptionPlans);
router.get('/export-subscription-plans/legacy', authorize('superadmin', 'admin'), requireSensitiveExport('subscription_plans', 'legacy_plans_json_export'), trackSensitiveExport({ moduleName: 'subscription_plans', actionName: 'legacy_plans_json_export' }), adminExportSubscriptionPlansLegacy);
router.get('/export-universities', authorize('superadmin', 'admin'), requireSensitiveExport('universities', 'legacy_universities_export'), trackSensitiveExport({ moduleName: 'universities', actionName: 'legacy_universities_export' }), adminExportUniversitiesLegacy);
router.get('/export-students', authorize('superadmin', 'admin'), requireSensitiveExport('students_groups', 'students_export', true), trackSensitiveExport({ moduleName: 'students_groups', actionName: 'students_export' }), adminExportStudents);

/* ═══════════════════════════════════════════════════════════
   FINANCE CENTER (unified ledger)
   ═══════════════════════════════════════════════════════════ */
router.get('/fc/dashboard', authorize('superadmin', 'admin', 'moderator'), canManageFinance, fcGetDashboard);

// Transactions
router.get('/fc/transactions', authorize('superadmin', 'admin', 'moderator'), canManageFinance, fcGetTransactions);
router.get(
    '/fc/expenses',
    authorize('superadmin', 'admin', 'moderator'),
    canManageFinance,
    (req: Request, _res: Response, next: NextFunction) => {
        req.query.direction = 'expense';
        next();
    },
    fcGetTransactions,
);
router.get('/fc/transactions/:id', authorize('superadmin', 'admin', 'moderator'), canManageFinance, fcGetTransaction);
router.post('/fc/transactions', authorize('superadmin', 'admin'), canManageFinance, validate(createTransactionSchema), fcCreateTransaction);
router.put('/fc/transactions/:id', authorize('superadmin', 'admin'), canManageFinance, validate(updateTransactionSchema), fcUpdateTransaction);
router.delete('/fc/transactions/:id', authorize('superadmin', 'admin'), canManageFinance, requireDestructiveStepUp('finance_center', 'transaction_delete'), fcDeleteTransaction);
router.post('/fc/transactions/:id/restore', authorize('superadmin', 'admin'), canManageFinance, requireDestructiveStepUp('finance_center', 'transaction_restore'), fcRestoreTransaction);
router.post('/fc/transactions/bulk-approve', authorize('superadmin', 'admin'), canManageFinance, validate(bulkIdsSchema), fcBulkApproveTransactions);
router.post('/fc/transactions/bulk-mark-paid', authorize('superadmin', 'admin'), canManageFinance, validate(bulkIdsSchema), fcBulkMarkPaid);

// Invoices
router.get('/fc/invoices', authorize('superadmin', 'admin', 'moderator'), canManageFinance, fcGetInvoices);
router.post('/fc/invoices', authorize('superadmin', 'admin'), canManageFinance, validate(createInvoiceSchema), fcCreateInvoice);
router.put('/fc/invoices/:id', authorize('superadmin', 'admin'), canManageFinance, validate(updateInvoiceSchema), fcUpdateInvoice);
router.post('/fc/invoices/:id/mark-paid', authorize('superadmin', 'admin'), canManageFinance, validate(markInvoicePaidSchema), fcMarkInvoicePaid);

// Budgets
router.get('/fc/budgets', authorize('superadmin', 'admin', 'moderator'), canManageFinance, fcGetBudgets);
router.post('/fc/budgets', authorize('superadmin', 'admin'), canManageFinance, validate(createBudgetSchema), fcCreateBudget);
router.put('/fc/budgets/:id', authorize('superadmin', 'admin'), canManageFinance, validate(updateBudgetSchema), fcUpdateBudget);
router.delete('/fc/budgets/:id', authorize('superadmin', 'admin'), canManageFinance, requireDestructiveStepUp('finance_center', 'budget_delete'), fcDeleteBudget);

// Recurring Rules
router.get('/fc/recurring-rules', authorize('superadmin', 'admin', 'moderator'), canManageFinance, fcGetRecurringRules);
router.post('/fc/recurring-rules', authorize('superadmin', 'admin'), canManageFinance, validate(createRecurringRuleSchema), fcCreateRecurringRule);
router.put('/fc/recurring-rules/:id', authorize('superadmin', 'admin'), canManageFinance, validate(updateRecurringRuleSchema), fcUpdateRecurringRule);
router.delete('/fc/recurring-rules/:id', authorize('superadmin', 'admin'), canManageFinance, requireDestructiveStepUp('finance_center', 'recurring_rule_delete'), fcDeleteRecurringRule);
router.post('/fc/recurring-rules/:id/run-now', authorize('superadmin', 'admin'), canManageFinance, fcRunRecurringRuleNow);

// Chart of Accounts
router.get('/fc/chart-of-accounts', authorize('superadmin', 'admin', 'moderator'), canManageFinance, fcGetChartOfAccounts);
router.post('/fc/chart-of-accounts', authorize('superadmin', 'admin'), canManageFinance, validate(createAccountSchema), fcCreateAccount);

// Vendors
router.get('/fc/vendors', authorize('superadmin', 'admin', 'moderator'), canManageFinance, fcGetVendors);
router.post('/fc/vendors', authorize('superadmin', 'admin'), canManageFinance, validate(createVendorSchema), fcCreateVendor);

// Settings
router.get('/fc/settings', authorize('superadmin', 'admin'), canManageFinance, fcGetSettings);
router.put('/fc/settings', authorize('superadmin', 'admin'), canManageFinance, validate(updateSettingsSchema), fcUpdateSettings);

// Audit Logs
router.get('/fc/audit-logs', authorize('superadmin', 'admin'), canManageFinance, fcGetAuditLogs);
router.get('/fc/audit-logs/:id', authorize('superadmin', 'admin'), canManageFinance, fcGetAuditLogDetail);

// Export / Import
router.get('/fc/export', authorize('superadmin', 'admin', 'moderator'), canManageFinance, financeExportRateLimiter, requireSensitiveExport('finance_center', 'transactions_export', true), trackSensitiveExport({ moduleName: 'finance_center', actionName: 'transactions_export' }), fcExportTransactions);
router.get('/fc/import-template', authorize('superadmin', 'admin'), canManageFinance, fcDownloadTemplate);
router.post('/fc/import-preview', authorize('superadmin', 'admin'), canManageFinance, financeImportRateLimiter, upload.single('file'), fcImportPreview);
router.post('/fc/import-commit', authorize('superadmin', 'admin'), canManageFinance, financeImportRateLimiter, validate(importCommitSchema), fcImportCommit);

// Refunds
router.get('/fc/refunds', authorize('superadmin', 'admin', 'moderator'), canManageFinance, fcGetRefunds);
router.post('/fc/refunds', authorize('superadmin', 'admin'), canManageFinance, validate(createRefundSchema), fcCreateRefund);
router.post('/fc/refunds/:id/process', authorize('superadmin', 'admin'), canManageFinance, validate(processRefundSchema), fcApproveRefund);

// P&L Report PDF
router.get('/fc/report.pdf', authorize('superadmin', 'admin'), canManageFinance, financeExportRateLimiter, requireSensitiveExport('finance_center', 'profit_loss_report_export', true), trackSensitiveExport({ moduleName: 'finance_center', actionName: 'profit_loss_report_export' }), fcGeneratePLReport);

/* ── Question Bank v2 (Advanced) ── */
import * as qbv2 from '../controllers/questionBankAdvancedController';

// Settings
router.get('/question-bank/v2/settings', authorize('superadmin', 'admin'), qbv2.getSettings);
router.put('/question-bank/v2/settings', authorize('superadmin', 'admin'), qbv2.updateSettings);
// CRUD
router.get('/question-bank/v2/questions', authorize('superadmin', 'admin', 'moderator', 'editor'), qbv2.listBankQuestions);
router.get('/question-bank/v2/questions/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), qbv2.getBankQuestion);
router.post('/question-bank/v2/questions', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, qbv2.createBankQuestion);
router.put('/question-bank/v2/questions/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, qbv2.updateBankQuestion);
router.delete('/question-bank/v2/questions/:id', authorize('superadmin', 'admin', 'moderator'), canDeleteData, requireDestructiveStepUp('question_bank', 'bank_question_delete'), qbv2.deleteBankQuestion);
router.post('/question-bank/v2/questions/:id/archive', authorize('superadmin', 'admin', 'moderator'), canEditExams, requireDestructiveStepUp('question_bank', 'bank_question_archive'), qbv2.archiveBankQuestion);
router.post('/question-bank/v2/questions/:id/restore', authorize('superadmin', 'admin', 'moderator'), canEditExams, requireDestructiveStepUp('question_bank', 'bank_question_restore'), qbv2.restoreBankQuestion);
router.post('/question-bank/v2/questions/:id/duplicate', authorize('superadmin', 'admin', 'moderator', 'editor'), canEditExams, qbv2.duplicateBankQuestion);
// Bulk
router.post('/question-bank/v2/bulk/archive', authorize('superadmin', 'admin', 'moderator'), canEditExams, requireDestructiveStepUp('question_bank', 'bulk_archive'), qbv2.bulkArchive);
router.post('/question-bank/v2/bulk/activate', authorize('superadmin', 'admin', 'moderator'), canEditExams, qbv2.bulkActivate);
router.post('/question-bank/v2/bulk/tags', authorize('superadmin', 'admin', 'moderator'), canEditExams, qbv2.bulkUpdateTags);
router.post('/question-bank/v2/bulk/delete', authorize('superadmin', 'admin'), canDeleteData, qbv2.bulkDelete);
// Import / Export
router.get('/question-bank/v2/import/template', authorize('superadmin', 'admin', 'moderator', 'editor'), qbv2.downloadImportTemplate);
router.post('/question-bank/v2/import/preview', authorize('superadmin', 'admin', 'moderator'), canEditExams, upload.single('file'), qbv2.importPreview);
router.post('/question-bank/v2/import/commit', authorize('superadmin', 'admin', 'moderator'), canEditExams, upload.single('file'), qbv2.importCommit);
router.get('/question-bank/v2/export', authorize('superadmin', 'admin', 'moderator', 'editor'), requireSensitiveExport('question_bank', 'bank_v2_export'), trackSensitiveExport({ moduleName: 'question_bank', actionName: 'bank_v2_export' }), qbv2.exportQuestions);
// Sets
router.get('/question-bank/v2/sets', authorize('superadmin', 'admin', 'moderator', 'editor'), qbv2.listSets);
router.get('/question-bank/v2/sets/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), qbv2.getSet);
router.post('/question-bank/v2/sets', authorize('superadmin', 'admin', 'moderator'), canEditExams, qbv2.createSet);
router.put('/question-bank/v2/sets/:id', authorize('superadmin', 'admin', 'moderator'), canEditExams, qbv2.updateSet);
router.delete('/question-bank/v2/sets/:id', authorize('superadmin', 'admin', 'moderator'), canDeleteData, requireDestructiveStepUp('question_bank', 'question_set_delete'), qbv2.deleteSet);
router.get('/question-bank/v2/sets/:id/resolve', authorize('superadmin', 'admin', 'moderator', 'editor'), qbv2.resolveSetQuestions);
// Exam integration
router.get('/question-bank/v2/exam/:examId/search', authorize('superadmin', 'admin', 'moderator', 'editor'), qbv2.searchBankQuestionsForExam);
router.post('/question-bank/v2/exam/:examId/attach', authorize('superadmin', 'admin', 'moderator'), canEditExams, qbv2.attachBankQuestionsToExam);
router.delete('/question-bank/v2/exam/:examId/questions/:questionId', authorize('superadmin', 'admin', 'moderator'), canEditExams, requireDestructiveStepUp('question_bank', 'question_remove_from_exam'), qbv2.removeBankQuestionFromExam);
router.put('/question-bank/v2/exam/:examId/reorder', authorize('superadmin', 'admin', 'moderator'), canEditExams, qbv2.reorderExamQuestions);
router.post('/question-bank/v2/exam/:examId/finalize', authorize('superadmin', 'admin', 'moderator'), canEditExams, qbv2.finalizeExamSnapshot);
// Analytics
router.get('/question-bank/v2/analytics', authorize('superadmin', 'admin', 'moderator'), qbv2.getAnalytics);
router.post('/question-bank/v2/analytics/:id/refresh', authorize('superadmin', 'admin', 'moderator'), qbv2.refreshAnalyticsForQuestion);
router.post('/question-bank/v2/analytics/refresh-all', authorize('superadmin', 'admin'), qbv2.refreshAllAnalytics);

/* ═══════════════════════════════════════════════════════════
   SECURITY ALERTS & MAINTENANCE
   ═══════════════════════════════════════════════════════════ */
router.get('/security-alerts', authorize('superadmin', 'admin'), adminGetSecurityAlerts);
router.get('/security-alerts/summary', authorize('superadmin', 'admin'), adminGetSecurityAlertSummary);
router.post('/security-alerts/:id/read', authorize('superadmin', 'admin'), adminMarkAlertRead);
router.post('/security-alerts/mark-all-read', authorize('superadmin', 'admin'), adminMarkAllAlertsRead);
router.post('/security-alerts/:id/resolve', authorize('superadmin', 'admin'), adminResolveAlert);
router.delete('/security-alerts/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('security_center', 'security_alert_delete'), adminDeleteSecurityAlert);
router.get('/maintenance/status', authorize('superadmin', 'admin'), adminGetMaintenanceStatus);
router.put('/maintenance/status', authorize('superadmin', 'admin'), adminUpdateMaintenanceStatus);

/* ═══════════════════════════════════════════════════════════
   HELP CENTER (Knowledge Base)
   ═══════════════════════════════════════════════════════════ */
router.get('/help-center/categories', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent'), adminGetHelpCategories);
router.post('/help-center/categories', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminCreateHelpCategory);
router.put('/help-center/categories/:id', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminUpdateHelpCategory);
router.delete('/help-center/categories/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('help_center', 'category_delete'), adminDeleteHelpCategory);
router.get('/help-center/articles', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent'), adminGetHelpArticles);
router.get('/help-center/articles/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent'), adminGetHelpArticle);
router.post('/help-center/articles', authorize('superadmin', 'admin', 'moderator', 'editor', 'support_agent'), adminCreateHelpArticle);
router.put('/help-center/articles/:id', authorize('superadmin', 'admin', 'moderator', 'editor', 'support_agent'), adminUpdateHelpArticle);
router.delete('/help-center/articles/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('help_center', 'article_delete'), adminDeleteHelpArticle);
router.post('/help-center/articles/:id/publish', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminPublishHelpArticle);
router.post('/help-center/articles/:id/unpublish', authorize('superadmin', 'admin', 'moderator', 'support_agent'), adminUnpublishHelpArticle);

/* ═══════════════════════════════════════════════════════════
   CONTENT BLOCKS (Global Promotions / Banners)
   ═══════════════════════════════════════════════════════════ */
router.get('/content-blocks', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetContentBlocks);
router.get('/content-blocks/:id', authorize('superadmin', 'admin', 'moderator', 'editor'), adminGetContentBlock);
router.post('/content-blocks', authorize('superadmin', 'admin', 'moderator'), adminCreateContentBlock);
router.put('/content-blocks/:id', authorize('superadmin', 'admin', 'moderator'), adminUpdateContentBlock);
router.delete('/content-blocks/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('content_blocks', 'content_block_delete'), adminDeleteContentBlock);
router.patch('/content-blocks/:id/toggle', authorize('superadmin', 'admin', 'moderator'), adminToggleContentBlock);

/* ═══════════════════════════════════════════════════════════
   WEAK TOPIC DETECTION (Analytics)
   ═══════════════════════════════════════════════════════════ */
router.get('/analytics/weak-topics', authorize('superadmin', 'admin', 'moderator'), canViewReports, adminGetWeakTopics);
router.get('/analytics/weak-topics/by-student/:studentId', authorize('superadmin', 'admin', 'moderator'), canViewReports, adminGetStudentWeakTopics);
router.get('/analytics/weak-topics/question-difficulty', authorize('superadmin', 'admin', 'moderator'), canViewReports, adminGetHardestQuestions);

/* ═══════════════════════════════════════════════════════════
   STUDENT CRM TIMELINE
   ═══════════════════════════════════════════════════════════ */
router.get('/students/:id/timeline', authorize('superadmin', 'admin', 'moderator'), canManageStudents, adminGetStudentTimeline);
router.post('/students/:id/timeline', authorize('superadmin', 'admin', 'moderator'), canManageStudents, adminAddTimelineEntry);
router.delete('/students/:id/timeline/:entryId', authorize('superadmin', 'admin'), canManageStudents, requireDestructiveStepUp('students_groups', 'timeline_entry_delete'), adminDeleteTimelineEntry);
router.get('/students/:id/timeline/summary', authorize('superadmin', 'admin', 'moderator'), canManageStudents, adminGetTimelineSummary);

/* ═══════════════════════════════════════════════════════════
   NOTIFICATION CENTER (Providers / Templates / Jobs / Logs)
   ═══════════════════════════════════════════════════════════ */
router.get('/notification-center/summary', authorize('superadmin', 'admin', 'moderator'), adminGetNotificationSummary);
router.get('/notification-center/providers', authorize('superadmin', 'admin'), adminGetProviders);
router.post('/notification-center/providers', authorize('superadmin', 'admin'), requireSensitiveAction({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_create' }), adminCreateProvider);
router.put('/notification-center/providers/:id', authorize('superadmin', 'admin'), requireSensitiveAction({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_update' }), adminUpdateProvider);
router.delete('/notification-center/providers/:id', authorize('superadmin', 'admin'), requireSensitiveAction({ actionKey: 'providers.credentials_change', moduleName: 'notification_center', actionName: 'provider_delete' }), adminDeleteProvider);
router.post('/notification-center/providers/:id/test', authorize('superadmin', 'admin'), requireProviderStepUp('notification_center', 'provider_test'), adminTestProvider);
router.get('/notification-center/templates', authorize('superadmin', 'admin', 'moderator'), adminGetTemplates);
router.post('/notification-center/templates', authorize('superadmin', 'admin'), adminCreateTemplate);
router.put('/notification-center/templates/:id', authorize('superadmin', 'admin'), adminUpdateTemplate);
router.delete('/notification-center/templates/:id', authorize('superadmin', 'admin'), requireDestructiveStepUp('notification_center', 'template_delete'), adminDeleteTemplate);
router.get('/notification-center/jobs', authorize('superadmin', 'admin', 'moderator'), adminGetJobs);
router.post('/notification-center/send', authorize('superadmin', 'admin'), adminSendNotification);
router.post('/notification-center/jobs/:id/retry', authorize('superadmin', 'admin'), adminRetryFailedJob);
router.get('/notification-center/delivery-logs', authorize('superadmin', 'admin', 'moderator'), adminGetDeliveryLogs);

/* ═══════════════════════════════════════════════════════════
   RENEWAL AUTOMATION
   ═══════════════════════════════════════════════════════════ */
router.get('/renewal/subscriptions', authorize('superadmin', 'admin', 'moderator'), canManagePlans, adminGetActiveSubscriptions);
router.get('/renewal/stats', authorize('superadmin', 'admin', 'moderator'), canManagePlans, adminGetSubscriptionStats);
router.post('/renewal/subscriptions/:id/extend', authorize('superadmin', 'admin'), canManagePlans, adminExtendSubscription);
router.post('/renewal/subscriptions/:id/expire', authorize('superadmin', 'admin'), canManagePlans, adminExpireSubscription);
router.post('/renewal/subscriptions/:id/reactivate', authorize('superadmin', 'admin'), canManagePlans, adminReactivateSubscription);
router.patch('/renewal/subscriptions/:id/auto-renew', authorize('superadmin', 'admin'), canManagePlans, adminToggleAutoRenew);
router.get('/renewal/logs', authorize('superadmin', 'admin', 'moderator'), canManagePlans, adminGetAutomationLogs);
router.get('/renewal/students/:studentId/history', authorize('superadmin', 'admin', 'moderator'), canManagePlans, adminGetStudentSubscriptionHistory);

export default router;



