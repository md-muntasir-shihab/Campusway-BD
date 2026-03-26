import mongoose, { Document, Schema } from 'mongoose';

export interface INewsAuditEvent extends Document {
    actorId?: mongoose.Types.ObjectId;
    action: string;
    entityType: 'news' | 'source' | 'settings' | 'media' | 'export' | 'workflow';
    entityId?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
    createdAt: Date;
}

const NewsAuditEventSchema = new Schema<INewsAuditEvent>(
    {
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        action: { type: String, required: true },
        entityType: { type: String, enum: ['news', 'source', 'settings', 'media', 'export', 'workflow'], required: true },
        entityId: { type: String, default: '' },
        before: { type: Schema.Types.Mixed, default: undefined },
        after: { type: Schema.Types.Mixed, default: undefined },
        meta: { type: Schema.Types.Mixed, default: undefined },
        ip: { type: String, default: '' },
        userAgent: { type: String, default: '' },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        collection: 'news_audit_events',
    }
);

NewsAuditEventSchema.index({ createdAt: -1, action: 1 });
NewsAuditEventSchema.index({ entityType: 1, entityId: 1 });

export default mongoose.model<INewsAuditEvent>('NewsAuditEvent', NewsAuditEventSchema);

