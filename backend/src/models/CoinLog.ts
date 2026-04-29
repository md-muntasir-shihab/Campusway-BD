import mongoose, { Document, Schema } from 'mongoose';

export interface ICoinLog extends Document {
    student: mongoose.Types.ObjectId;
    amount: number;
    event: string;
    sourceId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CoinLogSchema = new Schema<ICoinLog>(
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
    },
    { timestamps: true, collection: 'coin_logs' },
);

// Fast lookups by student
CoinLogSchema.index({ student: 1, createdAt: -1 });
// Filter by event type
CoinLogSchema.index({ event: 1 });

export default mongoose.model<ICoinLog>('CoinLog', CoinLogSchema);
