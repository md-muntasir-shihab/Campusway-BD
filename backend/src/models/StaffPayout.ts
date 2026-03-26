import mongoose, { Document, Schema } from 'mongoose';

export interface IStaffPayout extends Document {
    userId: mongoose.Types.ObjectId;
    role: string;
    amount: number;
    periodMonth: string; // YYYY-MM
    paidAt: Date;
    method: 'bkash' | 'cash' | 'manual' | 'bank';
    notes?: string;
    recordedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const StaffPayoutSchema = new Schema<IStaffPayout>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        role: { type: String, trim: true, required: true },
        amount: { type: Number, required: true, min: 0 },
        periodMonth: { type: String, required: true, match: /^\d{4}\-(0[1-9]|1[0-2])$/ },
        paidAt: { type: Date, required: true, default: Date.now },
        method: { type: String, enum: ['bkash', 'cash', 'manual', 'bank'], default: 'manual' },
        notes: { type: String, trim: true, default: '' },
        recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true, collection: 'staff_payouts' }
);

StaffPayoutSchema.index({ paidAt: -1, periodMonth: 1 });

export default mongoose.model<IStaffPayout>('StaffPayout', StaffPayoutSchema);
