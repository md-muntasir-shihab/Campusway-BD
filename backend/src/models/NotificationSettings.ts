import mongoose, { Document, Schema } from 'mongoose';

export interface IQuietHours {
    enabled: boolean;
    startHour: number; // 0-23
    endHour: number;   // 0-23
    timezone: string;
}

export interface ITriggerToggle {
    triggerKey: string;
    enabled: boolean;
    channels: ('sms' | 'email')[];
    guardianIncluded: boolean;
    templateKey?: string;
    delayMinutes?: number;
    batchSize?: number;
    retryEnabled?: boolean;
    quietHoursMode?: 'respect' | 'bypass';
    audienceMode?: 'affected' | 'subscription_active' | 'subscription_renewal_due' | 'custom';
}

export interface INotificationSettings extends Document {
    /* ---- global send limits ---- */
    dailySmsLimit: number;
    dailyEmailLimit: number;
    monthlySmsBudgetBDT: number;
    monthlyEmailBudgetBDT: number;

    /* ---- quiet hours ---- */
    quietHours: IQuietHours;

    /* ---- duplicate prevention ---- */
    duplicatePreventionWindowMinutes: number;

    /* ---- retry policy ---- */
    maxRetryCount: number;
    retryDelayMinutes: number;

    /* ---- automatic trigger toggles ---- */
    triggers: ITriggerToggle[];

    /* ---- reminder config ---- */
    subscriptionReminderDays: number[];   // e.g. [7,3,1]
    resultPublishAutoSend: boolean;
    resultPublishChannels: ('sms' | 'email')[];
    resultPublishGuardianIncluded: boolean;

    /* ---- finance sync toggle ---- */
    autoSyncCostToFinance: boolean;

    createdAt: Date;
    updatedAt: Date;
}

const QuietHoursSchema = new Schema<IQuietHours>(
    {
        enabled: { type: Boolean, default: false },
        startHour: { type: Number, default: 22, min: 0, max: 23 },
        endHour: { type: Number, default: 7, min: 0, max: 23 },
        timezone: { type: String, default: 'Asia/Dhaka' },
    },
    { _id: false },
);

const TriggerToggleSchema = new Schema<ITriggerToggle>(
    {
        triggerKey: { type: String, required: true, trim: true },
        enabled: { type: Boolean, default: true },
        channels: [{ type: String, enum: ['sms', 'email'] }],
        guardianIncluded: { type: Boolean, default: false },
        templateKey: { type: String, trim: true, uppercase: true, default: '' },
        delayMinutes: { type: Number, default: 0, min: 0, max: 10080 },
        batchSize: { type: Number, default: 0, min: 0, max: 10000 },
        retryEnabled: { type: Boolean, default: true },
        quietHoursMode: { type: String, enum: ['respect', 'bypass'], default: 'respect' },
        audienceMode: {
            type: String,
            enum: ['affected', 'subscription_active', 'subscription_renewal_due', 'custom'],
            default: 'affected',
        },
    },
    { _id: false },
);

const NotificationSettingsSchema = new Schema<INotificationSettings>(
    {
        dailySmsLimit: { type: Number, default: 500 },
        dailyEmailLimit: { type: Number, default: 2000 },
        monthlySmsBudgetBDT: { type: Number, default: 5000 },
        monthlyEmailBudgetBDT: { type: Number, default: 1000 },

        quietHours: { type: QuietHoursSchema, default: () => ({}) },

        duplicatePreventionWindowMinutes: { type: Number, default: 60 },

        maxRetryCount: { type: Number, default: 3 },
        retryDelayMinutes: { type: Number, default: 15 },

        triggers: { type: [TriggerToggleSchema], default: [] },

        subscriptionReminderDays: { type: [Number], default: [7, 3, 1] },
        resultPublishAutoSend: { type: Boolean, default: false },
        resultPublishChannels: [{ type: String, enum: ['sms', 'email'] }],
        resultPublishGuardianIncluded: { type: Boolean, default: false },

        autoSyncCostToFinance: { type: Boolean, default: true },
    },
    { timestamps: true },
);

export default mongoose.model<INotificationSettings>('NotificationSettings', NotificationSettingsSchema);
