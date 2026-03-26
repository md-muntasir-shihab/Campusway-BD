import mongoose, { Document, Schema } from 'mongoose';

export type NotificationJobType = 'scheduled' | 'bulk' | 'triggered' | 'test_send';
export type NotificationJobChannel = 'sms' | 'email' | 'both';
export type NotificationJobTarget = 'single' | 'group' | 'filter' | 'selected';
export type NotificationJobStatus = 'queued' | 'processing' | 'done' | 'failed' | 'partial';

export interface INotificationJob extends Document {
    campaignName?: string;
    type: NotificationJobType;
    channel: NotificationJobChannel;
    target: NotificationJobTarget;
    targetStudentId?: mongoose.Types.ObjectId;
    targetGroupId?: mongoose.Types.ObjectId;
    targetStudentIds?: mongoose.Types.ObjectId[];
    targetFilterJson?: string;
    audienceType?: string;
    audienceRef?: string;
    templateKey: string;
    templateIds?: mongoose.Types.ObjectId[];
    payloadOverrides?: Record<string, string>;
    customBody?: string;
    customSubject?: string;
    selectedFieldMap?: Record<string, boolean>;
    recipientMode?: string;
    guardianTargeted: boolean;
    status: NotificationJobStatus;
    scheduledAtUTC?: Date;
    processedAtUTC?: Date;
    lastAttemptedAtUTC?: Date;
    nextRetryAtUTC?: Date;
    totalTargets: number;
    sentCount: number;
    failedCount: number;
    estimatedCost: number;
    actualCost: number;
    triggerKey?: string;
    duplicatePreventionKey?: string;
    originModule?: 'campaign' | 'news' | 'notice' | 'trigger';
    originEntityId?: string;
    originAction?: string;
    quietHoursApplied: boolean;
    createdByAdminId: mongoose.Types.ObjectId;
    errorMessage?: string;
    isTestSend?: boolean;
    testMeta?: {
        recipientMode?: string;
        messageMode?: string;
        recipientDisplay?: string;
        renderedPreview?: string;
        providerId?: string;
        logOnly?: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

const NotificationJobSchema = new Schema<INotificationJob>(
    {
        campaignName: { type: String, trim: true },
        type: {
            type: String,
            enum: ['scheduled', 'bulk', 'triggered', 'test_send'],
            required: true,
            index: true,
        },
        channel: {
            type: String,
            enum: ['sms', 'email', 'both'],
            required: true,
        },
        target: {
            type: String,
            enum: ['single', 'group', 'filter', 'selected'],
            required: true,
        },
        targetStudentId: { type: Schema.Types.ObjectId, ref: 'User' },
        targetGroupId: { type: Schema.Types.ObjectId, ref: 'StudentGroup' },
        targetStudentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        targetFilterJson: { type: String },
        audienceType: { type: String, trim: true },
        audienceRef: { type: String, trim: true },
        templateKey: { type: String, required: true, trim: true, uppercase: true },
        templateIds: [{ type: Schema.Types.ObjectId, ref: 'NotificationTemplate' }],
        payloadOverrides: { type: Schema.Types.Mixed },
        customBody: { type: String },
        customSubject: { type: String },
        selectedFieldMap: { type: Schema.Types.Mixed },
        recipientMode: { type: String, trim: true },
        guardianTargeted: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ['queued', 'processing', 'done', 'failed', 'partial'],
            default: 'queued',
            index: true,
        },
        scheduledAtUTC: { type: Date },
        processedAtUTC: { type: Date },
        lastAttemptedAtUTC: { type: Date },
        nextRetryAtUTC: { type: Date },
        totalTargets: { type: Number, default: 0, min: 0 },
        sentCount: { type: Number, default: 0, min: 0 },
        failedCount: { type: Number, default: 0, min: 0 },
        estimatedCost: { type: Number, default: 0, min: 0 },
        actualCost: { type: Number, default: 0, min: 0 },
        triggerKey: { type: String, trim: true, uppercase: true },
        duplicatePreventionKey: { type: String, trim: true, sparse: true },
        originModule: { type: String, enum: ['campaign', 'news', 'notice', 'trigger'], default: 'campaign', index: true },
        originEntityId: { type: String, trim: true, default: '' },
        originAction: { type: String, trim: true, default: '' },
        quietHoursApplied: { type: Boolean, default: false },
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        errorMessage: { type: String },
        isTestSend: { type: Boolean, default: false, index: true },
        testMeta: {
            type: Schema.Types.Mixed,
            default: null,
        },
    },
    { timestamps: true, collection: 'notification_jobs' }
);

NotificationJobSchema.index({ status: 1, scheduledAtUTC: 1 });
NotificationJobSchema.index({ createdByAdminId: 1, createdAt: -1 });
NotificationJobSchema.index({ originModule: 1, originEntityId: 1, createdAt: -1 });

export default mongoose.model<INotificationJob>('NotificationJob', NotificationJobSchema);
