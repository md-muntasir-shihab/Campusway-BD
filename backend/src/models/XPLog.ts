import mongoose, { Document, Schema } from 'mongoose';

export interface IXPLog extends Document {
    student: mongoose.Types.ObjectId;
    amount: number;
    event: string;
    sourceId?: mongoose.Types.ObjectId;
    multiplier: number;
    createdAt: Date;
    updatedAt: Date;
}

const XPLogSchema = new Schema<IXPLog>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        amount: { type: Number, required: true, default: 0 },
        event: { type: String, required: true, trim: true },
        sourceId: {
            type: Schema.Types.ObjectId,
            default: null,
        },
        multiplier: { type: Number, required: true, default: 1 },
    },
    { timestamps: true, collection: 'xp_logs' },
);

// Fast lookups by student
XPLogSchema.index({ student: 1, createdAt: -1 });
// Filter by event type
XPLogSchema.index({ event: 1 });

export default mongoose.model<IXPLog>('XPLog', XPLogSchema);
