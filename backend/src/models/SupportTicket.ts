import mongoose, { Document, Schema } from 'mongoose';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SupportTicketThreadState = 'pending' | 'replied' | 'idle' | 'resolved' | 'closed';
export type SupportTicketMessageSenderType = 'student' | 'admin' | 'system';

export interface ISupportTicketTimelineItem {
    actorId: mongoose.Types.ObjectId;
    actorRole: string;
    message: string;
    createdAt: Date;
}

export interface ISupportTicket extends Document {
    ticketNo: string;
    studentId: mongoose.Types.ObjectId;
    subject: string;
    message: string;
    status: SupportTicketStatus;
    priority: SupportTicketPriority;
    assignedTo?: mongoose.Types.ObjectId | null;
    subscriptionSnapshot?: Record<string, unknown>;
    messageCount: number;
    latestMessagePreview: string;
    lastMessageAt?: Date | null;
    lastMessageSenderType?: SupportTicketMessageSenderType | null;
    unreadCountForAdmin: number;
    unreadCountForUser: number;
    threadState: SupportTicketThreadState;
    timeline: ISupportTicketTimelineItem[];
    createdAt: Date;
    updatedAt: Date;
}

const SupportTicketTimelineSchema = new Schema<ISupportTicketTimelineItem>(
    {
        actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        actorRole: { type: String, trim: true, required: true },
        message: { type: String, trim: true, required: true },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const SupportTicketSchema = new Schema<ISupportTicket>(
    {
        ticketNo: { type: String, required: true, unique: true, index: true },
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        subject: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
        priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        subscriptionSnapshot: { type: Schema.Types.Mixed, default: {} },
        messageCount: { type: Number, default: 0, min: 0 },
        latestMessagePreview: { type: String, trim: true, default: '' },
        lastMessageAt: { type: Date, default: null, index: true },
        lastMessageSenderType: { type: String, enum: ['student', 'admin', 'system', null], default: null },
        unreadCountForAdmin: { type: Number, default: 0, min: 0, index: true },
        unreadCountForUser: { type: Number, default: 0, min: 0, index: true },
        threadState: {
            type: String,
            enum: ['pending', 'replied', 'idle', 'resolved', 'closed'],
            default: 'pending',
            index: true,
        },
        timeline: { type: [SupportTicketTimelineSchema], default: [] },
    },
    { timestamps: true, collection: 'support_tickets' }
);

SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ studentId: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ status: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ threadState: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ unreadCountForAdmin: 1, lastMessageAt: -1 });
SupportTicketSchema.index({ unreadCountForUser: 1, lastMessageAt: -1 });

export default mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
