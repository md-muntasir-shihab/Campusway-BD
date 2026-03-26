import mongoose, { Document, Schema } from 'mongoose';

export type EventLogSource = 'public' | 'student' | 'admin';

export interface IEventLog extends Document {
    userId?: mongoose.Types.ObjectId | null;
    sessionId: string;
    eventName: string;
    module: string;
    meta: Record<string, unknown>;
    source: EventLogSource;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}

const EventLogSchema = new Schema<IEventLog>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        sessionId: { type: String, required: true, trim: true, index: true },
        eventName: { type: String, required: true, trim: true, index: true },
        module: { type: String, required: true, trim: true, index: true },
        meta: { type: Schema.Types.Mixed, default: {} },
        source: { type: String, enum: ['public', 'student', 'admin'], default: 'public', index: true },
        ipAddress: { type: String, default: '' },
        userAgent: { type: String, default: '' },
    },
    { timestamps: true, collection: 'event_logs' }
);

EventLogSchema.index({ createdAt: -1 });
EventLogSchema.index({ module: 1, createdAt: -1 });
EventLogSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IEventLog>('EventLog', EventLogSchema);
