import mongoose, { Document, Schema } from 'mongoose';

export type SupportTicketMessageSenderType = 'student' | 'admin' | 'system';

export interface ISupportTicketMessage extends Document {
    ticketId: mongoose.Types.ObjectId;
    senderType: SupportTicketMessageSenderType;
    senderId?: mongoose.Types.ObjectId | null;
    message: string;
    attachments: Array<Record<string, unknown>>;
    readByAdminAt?: Date | null;
    readByUserAt?: Date | null;
    sequence: number;
    createdAt: Date;
    updatedAt: Date;
}

const SupportTicketMessageSchema = new Schema<ISupportTicketMessage>(
    {
        ticketId: { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true, index: true },
        senderType: {
            type: String,
            enum: ['student', 'admin', 'system'],
            required: true,
            index: true,
        },
        senderId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        message: { type: String, required: true, trim: true, maxlength: 5000 },
        attachments: { type: [Schema.Types.Mixed], default: [] } as any,
        readByAdminAt: { type: Date, default: null, index: true },
        readByUserAt: { type: Date, default: null, index: true },
        sequence: { type: Number, required: true, min: 1 },
    },
    { timestamps: true, collection: 'support_ticket_messages' }
);

SupportTicketMessageSchema.index({ ticketId: 1, sequence: 1 }, { unique: true });
SupportTicketMessageSchema.index({ ticketId: 1, createdAt: 1 });
SupportTicketMessageSchema.index({ ticketId: 1, readByAdminAt: 1, senderType: 1 });
SupportTicketMessageSchema.index({ ticketId: 1, readByUserAt: 1, senderType: 1 });

export default mongoose.model<ISupportTicketMessage>('SupportTicketMessage', SupportTicketMessageSchema);
