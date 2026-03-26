import mongoose, { Schema, Document } from 'mongoose';

export interface IFinanceRefund extends Document {
    refundCode: string;
    originalPaymentId?: mongoose.Types.ObjectId;
    financeTxnId?: mongoose.Types.ObjectId;
    studentId?: mongoose.Types.ObjectId;
    amountBDT: number;
    reason: string;
    status: 'requested' | 'approved' | 'paid' | 'rejected';
    rejectionNote?: string;
    processedByAdminId?: mongoose.Types.ObjectId;
    processedAtUTC?: Date;
    createdByAdminId: mongoose.Types.ObjectId;
    isDeleted: boolean;
    deletedAt?: Date;
}

const FinanceRefundSchema = new Schema<IFinanceRefund>(
    {
        refundCode: { type: String, required: true, unique: true },
        originalPaymentId: { type: Schema.Types.ObjectId, ref: 'ManualPayment' },
        financeTxnId: { type: Schema.Types.ObjectId, ref: 'FinanceTransaction' },
        studentId: { type: Schema.Types.ObjectId, ref: 'User' },
        amountBDT: { type: Number, required: true, min: 0 },
        reason: { type: String, required: true, trim: true, maxlength: 1000 },
        status: { type: String, enum: ['requested', 'approved', 'paid', 'rejected'], default: 'requested' },
        rejectionNote: { type: String, trim: true, maxlength: 500 },
        processedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
        processedAtUTC: { type: Date },
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date },
    },
    { timestamps: true, collection: 'finance_refunds' }
);

FinanceRefundSchema.index({ status: 1, isDeleted: 1 });
FinanceRefundSchema.index({ studentId: 1 });

export default mongoose.model<IFinanceRefund>('FinanceRefund', FinanceRefundSchema);
