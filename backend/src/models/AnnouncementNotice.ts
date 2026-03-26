import mongoose, { Document, Schema } from 'mongoose';

export type AnnouncementTarget = 'all' | 'groups' | 'students';

export interface IAnnouncementNotice extends Document {
    title: string;
    message: string;
    target: AnnouncementTarget;
    targetIds: string[];
    sourceNewsId?: mongoose.Types.ObjectId | null;
    priority?: 'normal' | 'priority' | 'breaking';
    classification?: {
        primaryCategory?: string;
        tags?: string[];
        universityIds?: mongoose.Types.ObjectId[];
        clusterIds?: mongoose.Types.ObjectId[];
        groupIds?: mongoose.Types.ObjectId[];
    };
    deliveryMeta?: {
        lastJobId?: mongoose.Types.ObjectId | null;
        lastChannel?: 'sms' | 'email' | 'both';
        lastAudienceSummary?: string;
        lastSentAt?: Date | null;
    };
    templateRef?: string;
    triggerRef?: string;
    startAt: Date;
    endAt?: Date | null;
    isActive: boolean;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const AnnouncementNoticeSchema = new Schema<IAnnouncementNotice>(
    {
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        target: { type: String, enum: ['all', 'groups', 'students'], default: 'all', index: true },
        targetIds: { type: [String], default: [] },
        sourceNewsId: { type: Schema.Types.ObjectId, ref: 'News', default: null },
        priority: { type: String, enum: ['normal', 'priority', 'breaking'], default: 'normal', index: true },
        classification: {
            primaryCategory: { type: String, default: '' },
            tags: [{ type: String }],
            universityIds: [{ type: Schema.Types.ObjectId }],
            clusterIds: [{ type: Schema.Types.ObjectId }],
            groupIds: [{ type: Schema.Types.ObjectId }],
        },
        deliveryMeta: {
            lastJobId: { type: Schema.Types.ObjectId, ref: 'NotificationJob', default: null },
            lastChannel: { type: String, enum: ['sms', 'email', 'both'], default: undefined },
            lastAudienceSummary: { type: String, default: '' },
            lastSentAt: { type: Date, default: null },
        },
        templateRef: { type: String, default: '' },
        triggerRef: { type: String, default: '' },
        startAt: { type: Date, default: Date.now, index: true },
        endAt: { type: Date, default: null, index: true },
        isActive: { type: Boolean, default: true, index: true },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true, collection: 'announcement_notices' }
);

AnnouncementNoticeSchema.index({ isActive: 1, startAt: -1, endAt: 1 });
AnnouncementNoticeSchema.index({ sourceNewsId: 1 });
AnnouncementNoticeSchema.index({ priority: 1, isActive: 1, startAt: -1 });

export default mongoose.model<IAnnouncementNotice>('AnnouncementNotice', AnnouncementNoticeSchema);
