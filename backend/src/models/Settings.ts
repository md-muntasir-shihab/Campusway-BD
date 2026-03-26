import mongoose, { Schema, Document } from 'mongoose';

export interface ISiteSettings extends Document {
    siteName: string;
    tagline: string;
    metaTitle: string;
    metaDescription: string;
    logoUrl: string;
    faviconUrl: string;
    footerText: string;
    contactEmail: string;
    contactPhone: string;
    contactAddress: string;
    socialLinks: {
        platform: string;
        url: string;
        icon?: string;
        description?: string;
        enabled?: boolean;
        placements?: Array<'header' | 'footer' | 'home' | 'news' | 'contact'>;
    }[];
    maintenanceMode: boolean;
    security: {
        singleBrowserLogin: boolean;
        forceLogoutOnNewLogin: boolean;
        enable2faAdmin: boolean;
        enable2faStudent: boolean;
        force2faSuperAdmin: boolean;
        default2faMethod: 'email' | 'sms' | 'authenticator';
        otpExpiryMinutes: number;
        maxOtpAttempts: number;
        ipChangeAlert: boolean;
        allowLegacyTokens: boolean;
        strictExamTabLock: boolean;
        strictTokenHashValidation: boolean;
        allowTestOtp: boolean;
        testOtpCode: string;
    };
    featureFlags: {
        studentDashboardV2: boolean;
        studentManagementV2: boolean;
        subscriptionEngineV2: boolean;
        examShareLinks: boolean;
        proctoringSignals: boolean;
        aiQuestionSuggestions: boolean;
        pushNotifications: boolean;
        strictExamTabLock: boolean;
        webNextEnabled: boolean;
        studentRegistrationEnabled: boolean;
        financeDashboardV1: boolean;
        smsReminderEnabled: boolean;
        emailReminderEnabled: boolean;
        backupS3MirrorEnabled: boolean;
        nextAdminEnabled: boolean;
        nextStudentEnabled: boolean;
        trainingMode: boolean;
        requireDeleteKeywordConfirm: boolean;
    };
    notificationAutomation: {
        examStartsSoon: { enabled: boolean; hoursBefore: number[] };
        applicationClosingSoon: { enabled: boolean; hoursBefore: number[] };
        paymentPendingReminder: { enabled: boolean; hoursBefore: number[] };
        resultPublished: { enabled: boolean; hoursBefore: number[] };
        profileScoreGate: { enabled: boolean; hoursBefore: number[]; minScore: number };
        templates: {
            languageMode: 'bn' | 'en' | 'mixed';
            examStartsSoon: string;
            applicationClosingSoon: string;
            paymentPendingReminder: string;
            resultPublished: string;
            profileScoreGate: string;
        };
    };
    analyticsSettings: {
        enabled: boolean;
        trackAnonymous: boolean;
        retentionDays: number;
        eventToggles: {
            universityApplyClick: boolean;
            universityOfficialClick: boolean;
            newsView: boolean;
            newsShare: boolean;
            resourceDownload: boolean;
            examViewed: boolean;
            examStarted: boolean;
            examSubmitted: boolean;
            subscriptionPlanView: boolean;
            subscriptionPlanClick: boolean;
            supportTicketCreated: boolean;
        };
    };
    examCenterSettings: {
        defaultSyncMode: 'fill_missing_only' | 'overwrite_mapped_fields';
        autoCreateExamCenters: boolean;
        notifyStudentsOnSync: boolean;
        notifyGuardiansOnResult: boolean;
        allowExternalImports: boolean;
    };
    adminUiLayout: {
        sidebarOrder: string[];
        settingsCardOrder: string[];
    };
    runtimeVersion: number;
    updatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>({
    siteName: { type: String, default: 'CampusWay' },
    tagline: { type: String, default: "Bangladesh's #1 University Admission Guide" },
    metaTitle: { type: String, default: 'CampusWay - University Admission Guide' },
    metaDescription: { type: String, default: 'Compare admission details, seat counts, exam dates for every university in Bangladesh.' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    footerText: { type: String, default: '© CampusWay. All rights reserved.' },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    contactAddress: { type: String, default: '' },
    socialLinks: [{
        platform: String,
        url: String,
        icon: String,
        description: { type: String, default: '' },
        enabled: { type: Boolean, default: true },
        placements: {
            type: [String],
            default: ['header', 'footer', 'home', 'news', 'contact'],
        },
    }],
    maintenanceMode: { type: Boolean, default: false },
    security: {
        singleBrowserLogin: { type: Boolean, default: true },
        forceLogoutOnNewLogin: { type: Boolean, default: true },
        enable2faAdmin: { type: Boolean, default: false },
        enable2faStudent: { type: Boolean, default: false },
        force2faSuperAdmin: { type: Boolean, default: false },
        default2faMethod: { type: String, enum: ['email', 'sms', 'authenticator'], default: 'email' },
        otpExpiryMinutes: { type: Number, default: 5 },
        maxOtpAttempts: { type: Number, default: 5 },
        ipChangeAlert: { type: Boolean, default: true },
        allowLegacyTokens: { type: Boolean, default: true },
        strictExamTabLock: { type: Boolean, default: false },
        strictTokenHashValidation: { type: Boolean, default: false },
        allowTestOtp: { type: Boolean, default: true },
        testOtpCode: { type: String, default: '123456' },
    },
    featureFlags: {
        studentDashboardV2: { type: Boolean, default: true },
        studentManagementV2: { type: Boolean, default: true },
        subscriptionEngineV2: { type: Boolean, default: false },
        examShareLinks: { type: Boolean, default: false },
        proctoringSignals: { type: Boolean, default: false },
        aiQuestionSuggestions: { type: Boolean, default: false },
        pushNotifications: { type: Boolean, default: false },
        strictExamTabLock: { type: Boolean, default: false },
        webNextEnabled: { type: Boolean, default: false },
        studentRegistrationEnabled: { type: Boolean, default: false },
        financeDashboardV1: { type: Boolean, default: false },
        smsReminderEnabled: { type: Boolean, default: false },
        emailReminderEnabled: { type: Boolean, default: true },
        backupS3MirrorEnabled: { type: Boolean, default: false },
        nextAdminEnabled: { type: Boolean, default: false },
        nextStudentEnabled: { type: Boolean, default: false },
        trainingMode: { type: Boolean, default: false },
        requireDeleteKeywordConfirm: { type: Boolean, default: true },
    },
    notificationAutomation: {
        examStartsSoon: {
            enabled: { type: Boolean, default: true },
            hoursBefore: { type: [Number], default: [24, 3] },
        },
        applicationClosingSoon: {
            enabled: { type: Boolean, default: true },
            hoursBefore: { type: [Number], default: [72, 24] },
        },
        paymentPendingReminder: {
            enabled: { type: Boolean, default: true },
            hoursBefore: { type: [Number], default: [24] },
        },
        resultPublished: {
            enabled: { type: Boolean, default: true },
            hoursBefore: { type: [Number], default: [0] },
        },
        profileScoreGate: {
            enabled: { type: Boolean, default: true },
            hoursBefore: { type: [Number], default: [48, 12] },
            minScore: { type: Number, default: 70 },
        },
        templates: {
            languageMode: { type: String, enum: ['bn', 'en', 'mixed'], default: 'mixed' },
            examStartsSoon: { type: String, default: 'Exam starts soon. Stay prepared.' },
            applicationClosingSoon: { type: String, default: 'Application window is closing soon.' },
            paymentPendingReminder: { type: String, default: 'Your payment is pending. Submit proof to unlock access.' },
            resultPublished: { type: String, default: 'Your result is now published.' },
            profileScoreGate: { type: String, default: 'Complete your profile to reach the minimum score before exam.' },
        },
    },
    analyticsSettings: {
        enabled: { type: Boolean, default: true },
        trackAnonymous: { type: Boolean, default: true },
        retentionDays: { type: Number, default: 90 },
        eventToggles: {
            universityApplyClick: { type: Boolean, default: true },
            universityOfficialClick: { type: Boolean, default: true },
            newsView: { type: Boolean, default: true },
            newsShare: { type: Boolean, default: true },
            resourceDownload: { type: Boolean, default: true },
            examViewed: { type: Boolean, default: true },
            examStarted: { type: Boolean, default: true },
            examSubmitted: { type: Boolean, default: true },
            subscriptionPlanView: { type: Boolean, default: true },
            subscriptionPlanClick: { type: Boolean, default: true },
            supportTicketCreated: { type: Boolean, default: true },
        },
    },
    examCenterSettings: {
        defaultSyncMode: { type: String, enum: ['fill_missing_only', 'overwrite_mapped_fields'], default: 'overwrite_mapped_fields' },
        autoCreateExamCenters: { type: Boolean, default: true },
        notifyStudentsOnSync: { type: Boolean, default: true },
        notifyGuardiansOnResult: { type: Boolean, default: false },
        allowExternalImports: { type: Boolean, default: true },
    },
    adminUiLayout: {
        sidebarOrder: { type: [String], default: [] },
        settingsCardOrder: { type: [String], default: [] },
    },
    runtimeVersion: { type: Number, default: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
