import mongoose, { Document, Schema } from 'mongoose';

export type ManualPaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cash' | 'manual' | 'bank' | 'card' | 'sslcommerz';
export type ManualPaymentEntryType = 'subscription' | 'due_settlement' | 'exam_fee' | 'other_income';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'rejected';

export interface IManualPayment extends Document {
    studentId: mongoose.Types.ObjectId;
    subscriptionPlanId?: mongoose.Types.ObjectId | null;
    examId?: mongoose.Types.ObjectId | null;
    amount: number;
    currency?: string;
    method: ManualPaymentMethod;
    status: PaymentStatus;
    date: Date;
    paidAt?: Date | null;
    transactionId?: string;
    reference?: string;
    proofUrl?: string;
    proofFileUrl?: string;
    notes?: string;
    entryType: ManualPaymentEntryType;
    paymentDetails?: Record<string, unknown>;
    recordedBy: mongoose.Types.ObjectId;
    approvedBy?: mongoose.Types.ObjectId | null;
    approvedAt?: Date | null;
    verifiedByAdminId?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const ManualPaymentSchema = new Schema<IManualPayment>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        subscriptionPlanId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
        examId: { type: Schema.Types.ObjectId, ref: 'Exam', default: null },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'BDT', trim: true },
        method: {
            type: String,
            enum: ['bkash', 'nagad', 'rocket', 'upay', 'cash', 'manual', 'bank', 'card', 'sslcommerz'],
            default: 'manual'
        },
        status: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded', 'rejected'],
            default: 'pending'
        },
        date: { type: Date, required: true, default: Date.now },
        paidAt: { type: Date, default: null },
        transactionId: { type: String, trim: true, default: '' },
        reference: { type: String, trim: true, default: '' },
        proofUrl: { type: String, trim: true },
        proofFileUrl: { type: String, trim: true, default: '' },
        notes: { type: String, trim: true, default: '' },
        entryType: {
            type: String,
            enum: ['subscription', 'due_settlement', 'exam_fee', 'other_income'],
            default: 'subscription'
        },
        paymentDetails: { type: Schema.Types.Mixed },
        recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        approvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAt: { type: Date, default: null },
        verifiedByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true, collection: 'manual_payments' }
);

ManualPaymentSchema.index({ studentId: 1, date: -1 });
ManualPaymentSchema.index({ date: -1, entryType: 1 });
ManualPaymentSchema.index({ status: 1, method: 1, date: -1 });
ManualPaymentSchema.index({ examId: 1, studentId: 1, status: 1 });
ManualPaymentSchema.index({ transactionId: 1 }, { sparse: true });
ManualPaymentSchema.index({ reference: 1 }, { sparse: true });

export default mongoose.model<IManualPayment>('ManualPayment', ManualPaymentSchema);
