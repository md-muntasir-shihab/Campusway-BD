import mongoose, { Document, Schema } from 'mongoose';

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled' | 'overdue';
export type InvoicePurpose = 'subscription' | 'exam' | 'service' | 'custom';

export interface IFinanceInvoice extends Document {
    invoiceNo: string;
    studentId?: mongoose.Types.ObjectId;
    purpose: InvoicePurpose;
    planId?: mongoose.Types.ObjectId;
    examId?: mongoose.Types.ObjectId;
    serviceId?: mongoose.Types.ObjectId;
    amountBDT: number;
    paidAmountBDT: number;
    status: InvoiceStatus;
    dueDateUTC?: Date;
    issuedAtUTC: Date;
    paidAtUTC?: Date;
    notes?: string;
    isDeleted: boolean;
    createdByAdminId: mongoose.Types.ObjectId;
    linkedTxnIds: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const FinanceInvoiceSchema = new Schema<IFinanceInvoice>(
    {
        invoiceNo: { type: String, required: true, unique: true, trim: true, index: true },
        studentId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
        purpose: {
            type: String,
            enum: ['subscription', 'exam', 'service', 'custom'],
            default: 'custom',
            index: true,
        },
        planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
        examId: { type: Schema.Types.ObjectId, ref: 'Exam', default: null },
        serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null },
        amountBDT: { type: Number, required: true, min: 0 },
        paidAmountBDT: { type: Number, default: 0, min: 0 },
        status: {
            type: String,
            enum: ['unpaid', 'partial', 'paid', 'cancelled', 'overdue'],
            default: 'unpaid',
            index: true,
        },
        dueDateUTC: { type: Date, default: null, index: true },
        issuedAtUTC: { type: Date, default: Date.now },
        paidAtUTC: { type: Date, default: null },
        notes: { type: String, trim: true, default: '' },
        isDeleted: { type: Boolean, default: false },
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        linkedTxnIds: [{ type: Schema.Types.ObjectId, ref: 'FinanceTransaction' }],
    },
    { timestamps: true, collection: 'finance_invoices' }
);

FinanceInvoiceSchema.index({ status: 1, dueDateUTC: 1 });
FinanceInvoiceSchema.index({ studentId: 1, status: 1 });

export default mongoose.model<IFinanceInvoice>('FinanceInvoice', FinanceInvoiceSchema);
