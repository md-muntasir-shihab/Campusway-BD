/**
 * Centralized model index — single import point for all Mongoose models.
 *
 * Usage:
 *   import { Exam, User, AuditLog } from '../models';
 *   import { ExamModel, UserModel } from '../models';  // backward-compatible aliases
 *
 * Duplicate model files have been consolidated:
 *   - exam.model.ts → Exam.ts (richer schema, exam_collection)
 *   - examSession.model.ts → ExamSession.ts (richer schema, exam_attempts)
 *   - user.model.ts → User.ts (richer schema, users)
 *   - auditLog.model.ts → AuditLog.ts (richer schema, auditlogs)
 *   - newsItem.model.ts → News.ts (richer schema, news)
 */

// ── PascalCase models (default exports) ─────────────────────────────────────
export {
    default as ActionApproval,
    type ActionApprovalStatus,
    type IActionApproval,
    type IActionApprovalRequestContext,
    type IActionApprovalReviewSummaryItem,
    type IActionApprovalTargetSummary,
} from './ActionApproval';
export { default as ActiveSession, type IActiveSession } from './ActiveSession';
export { default as AdminNotificationRead } from './AdminNotificationRead';
export { default as AdminProfile } from './AdminProfile';
export { default as AnnouncementNotice } from './AnnouncementNotice';
export {
    default as AntiCheatViolationLog,
    type IAntiCheatViolationLog,
    type ViolationType,
} from './AntiCheatViolationLog';
export { default as AudienceSnapshot, type IAudienceSnapshot } from './AudienceSnapshot';
export { default as AuditLog, type IAuditLog } from './AuditLog';
export { default as BackupJob, type BackupStorage, type BackupType } from './BackupJob';
export { default as Badge } from './Badge';
export { default as Banner } from './Banner';
export {
    default as BattleSession,
    type IBattleSession,
    type IBattleAnswer,
    type IBattleReward,
} from './BattleSession';
export { default as ChartOfAccounts } from './ChartOfAccounts';
export { default as CoinLog, type ICoinLog } from './CoinLog';
export { default as ConsentRecord } from './ConsentRecord';
export { default as ContactMessage, type IContactMessage, type ContactMessageStatus } from './ContactMessage';
export {
    default as DoubtThread,
    type IDoubtThread,
    type IDoubtReply,
    type IReplyVoter,
} from './DoubtThread';
export { default as ContentBlock } from './ContentBlock';
export { default as CredentialVault } from './CredentialVault';
export { default as EventLog } from './EventLog';
export { default as Exam, type IExam, type IScheduleWindow } from './Exam';
export { default as ExamCenter } from './ExamCenter';
export { default as ExamCertificate } from './ExamCertificate';
export { default as ExamEvent, type IExamEvent } from './ExamEvent';
export { default as ExamImportJob, type ExamImportSyncMode } from './ExamImportJob';
export { default as ExamImportRowIssue } from './ExamImportRowIssue';
export { default as ExamImportTemplate } from './ExamImportTemplate';
export {
    default as ExaminerApplication,
    type IExaminerApplication,
    type IApplicationData,
} from './ExaminerApplication';
export {
    default as ExamPackage,
    type IExamPackage,
    type ICouponCode,
} from './ExamPackage';
export { default as ExamMappingProfile } from './ExamMappingProfile';
export { default as ExamProfileSyncLog } from './ExamProfileSyncLog';
export { default as ExamResult } from './ExamResult';
export { default as ExamSession, type IExamSession } from './ExamSession';
export { default as ExpenseEntry } from './ExpenseEntry';
export { default as ExperimentAssignment } from './ExperimentAssignment';
export { default as ExternalExamJoinLog } from './ExternalExamJoinLog';
export { default as FinanceBudget } from './FinanceBudget';
export { default as FinanceInvoice } from './FinanceInvoice';
export { default as FinanceRecurringRule } from './FinanceRecurringRule';
export { default as FinanceRefund } from './FinanceRefund';
export { default as FinanceSettings } from './FinanceSettings';
export { default as FinanceTransaction } from './FinanceTransaction';
export { default as FinanceVendor } from './FinanceVendor';
export { default as FounderProfile } from './FounderProfile';
export { default as GroupMembership, type MembershipStatus } from './GroupMembership';
export { default as HelpArticle } from './HelpArticle';
export { default as HelpCategory } from './HelpCategory';
export { default as HomeAlert } from './HomeAlert';
export { default as HomeConfig } from './HomeConfig';
export { default as HomePage } from './HomePage';
export {
    default as HomeSettings,
    type HomeLinkItem,
    type HomeSettingsShape,
    createHomeSettingsDefaults,
} from './HomeSettings';
export { default as IdempotencyKey } from './IdempotencyKey';
export { default as ImportExportLog } from './ImportExportLog';
export { default as JobRunLog, type IJobRunLog } from './JobRunLog';
export { default as LeaderboardEntry, type ILeaderboardEntry } from './LeaderboardEntry';
export {
    default as LeagueProgress,
    type ILeagueProgress,
    type ILeagueTierHistory,
} from './LeagueProgress';
export { default as LegalPage } from './LegalPage';
export { default as MistakeVaultEntry, type IMistakeVaultEntry } from './MistakeVaultEntry';
export { default as LiveAlertAck } from './LiveAlertAck';
export { default as LoginActivity } from './LoginActivity';
export { default as ManualPayment, type IManualPayment, type PaymentStatus } from './ManualPayment';
export { default as MemberPermissionOverride } from './MemberPermissionOverride';
export { default as News, type INews } from './News';
export { default as NewsAuditEvent } from './NewsAuditEvent';
export { default as NewsCategory } from './NewsCategory';
export { default as NewsFetchJob } from './NewsFetchJob';
export { default as NewsMedia } from './NewsMedia';
export { default as NewsSource } from './NewsSource';
export { default as NewsSystemSettings } from './NewsSystemSettings';
export { default as Notification } from './Notification';
export { default as NotificationDeliveryLog } from './NotificationDeliveryLog';
export { default as NotificationJob } from './NotificationJob';
export { default as NotificationProvider, type INotificationProvider } from './NotificationProvider';
export {
    default as NotificationSettings,
    type INotificationSettings,
    type IQuietHours,
    applyMigrationDefaults,
    ADVANCED_SETTINGS_DEFAULTS,
} from './NotificationSettings';
export { default as NotificationTemplate } from './NotificationTemplate';
export { default as OtpVerification } from './OtpVerification';
export { default as PasswordReset } from './PasswordReset';
export { default as PaymentWebhookEvent } from './PaymentWebhookEvent';
export { default as ProfileUpdateRequest } from './ProfileUpdateRequest';
export { default as Question } from './Question';
export { default as QuestionBankAnalytics } from './QuestionBankAnalytics';
export { default as QuestionCategory, type IQuestionCategory } from './QuestionCategory';
export { default as QuestionChapter, type IQuestionChapter } from './QuestionChapter';
export { default as QuestionGroup, type IQuestionGroup } from './QuestionGroup';
export { default as QuestionSubGroup, type IQuestionSubGroup } from './QuestionSubGroup';
export { default as QuestionTopic, type IQuestionTopic } from './QuestionTopic';
export { default as QuestionBankQuestion, type IQuestionBankQuestion, type IBankQuestionOption, type QuestionType, type QuestionStatus, type ReviewStatus } from './QuestionBankQuestion';
export { default as QuestionBankSet, type IQuestionBankSet, type ISetRules } from './QuestionBankSet';
export { default as QuestionBankSettings } from './QuestionBankSettings';
export { default as QuestionBankUsage } from './QuestionBankUsage';
export { default as QuestionImportJob } from './QuestionImportJob';
export { default as QuestionMedia } from './QuestionMedia';
export { default as QuestionRevision } from './QuestionRevision';
export { default as Resource } from './Resource';
export { default as ResourceSettings, RESOURCE_ALLOWED_TYPES, RESOURCE_SETTINGS_DEFAULTS } from './ResourceSettings';
export { default as RolePermissionSet } from './RolePermissionSet';
export { default as SecureUpload, type ISecureUpload, type SecureUploadCategory, type SecureUploadVisibility } from './SecureUpload';
export { default as SecurityAlert } from './SecurityAlert';
export { default as SecurityAlertLog } from './SecurityAlertLog';
export { default as SecurityAuditLog } from './SecurityAuditLog';
export { default as SecurityRateLimitEvent, type SecurityRateLimitBucket } from './SecurityRateLimitEvent';
export { default as SecuritySettings, type RiskyActionKey, type SecurityLogLevel } from './SecuritySettings';
export { default as SecurityToken, type ISecurityToken, type SecurityTokenPurpose } from './SecurityToken';
export { default as Service } from './Service';
export { default as ServiceAuditLog } from './ServiceAuditLog';
export { default as ServiceCategory } from './ServiceCategory';
export { default as ServicePageConfig } from './ServicePageConfig';
export { default as ServicePricingPlan } from './ServicePricingPlan';
export { default as Settings } from './Settings';
export { default as SettingsAuditEntry } from './SettingsAuditEntry';
export { default as StaffPayout } from './StaffPayout';
export { default as StudentApplication } from './StudentApplication';
export { default as StudentBadge } from './StudentBadge';
export { default as StudentContactTimeline } from './StudentContactTimeline';
export { default as StudentDashboardConfig } from './StudentDashboardConfig';
export { default as StudentDueLedger } from './StudentDueLedger';
export { default as StreakRecord, type IStreakRecord, type IStreakCalendarEntry } from './StreakRecord';
export {
    default as StudyRoutine,
    type IStudyRoutine,
    type IWeeklyScheduleEntry,
    type IScheduleItem,
    type IExamCountdown,
} from './StudyRoutine';
export {
    default as StudentAnalyticsAggregate,
    type IStudentAnalyticsAggregate,
    type IAccuracyEntry,
    type IRecentScore,
} from './StudentAnalyticsAggregate';
export { default as StudentGroup, type IStudentGroup } from './StudentGroup';
export { default as StudentImportJob } from './StudentImportJob';
export { default as StudentNotificationRead } from './StudentNotificationRead';
export { default as StudentProfile, type IStudentProfile } from './StudentProfile';
export { default as StudentSettings, StudentSettingsModel } from './StudentSettings';
export { default as StudentWatchlist } from './StudentWatchlist';
export { default as SubscriptionAutomationLog } from './SubscriptionAutomationLog';
export { default as SubscriptionContactPreset } from './SubscriptionContactPreset';
export { default as SubscriptionPlan } from './SubscriptionPlan';
export { default as SubscriptionSettings } from './SubscriptionSettings';
export { default as SupportTicket, type ISupportTicket, type SupportTicketStatus, type SupportTicketThreadState } from './SupportTicket';
export { default as SupportTicketMessage, type ISupportTicketMessage } from './SupportTicketMessage';
export { default as SuppressionEntry } from './SuppressionEntry';
export { default as TeamApprovalRule } from './TeamApprovalRule';
export { default as TeamAuditLog } from './TeamAuditLog';
export { default as TeamInvite } from './TeamInvite';
export { default as TeamRole } from './TeamRole';
export { default as TopicMastery, type ITopicMastery } from './TopicMastery';
export { default as University, type IExamCenter } from './University';
export { default as UniversityCategory } from './UniversityCategory';
export { default as UniversityCluster } from './UniversityCluster';
export { default as UniversityImportJob } from './UniversityImportJob';
export {
    default as UniversitySettings,
    ALLOWED_CATEGORIES,
    ensureUniversitySettings,
    getUniversitySettingsDefaults,
} from './UniversitySettings';
export {
    default as User,
    type IUser,
    type UserRole,
    type UserStatus,
    type IUserPermissions,
    type IUserPermissionsV2,
} from './User';
export { default as UserSubscription, type IUserSubscription, type UserSubscriptionStatus } from './UserSubscription';
export { default as XPLog, type IXPLog } from './XPLog';
export {
    default as WebsiteSettings,
    createWebsiteStaticPagesDefaults,
    normalizeWebsiteStaticPages,
} from './WebsiteSettings';

// ── Named-export models (no PascalCase equivalent) ──────────────────────────
export { AnswerModel } from './answer.model';
export { ExamQuestionModel } from './examQuestion.model';
export { PaymentModel } from './payment.model';
export { ResultModel } from './result.model';
export { RssSourceModel } from './rssSource.model';
export { NewsSettingsModel } from './newsSettings.model';
export { SubscriptionModel } from './subscription.model';
