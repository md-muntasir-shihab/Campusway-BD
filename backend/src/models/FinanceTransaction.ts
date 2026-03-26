import mongoose, { Document, Schema } from 'mongoose';

export type TxnDirection = 'income' | 'expense';
export type TxnStatus = 'pending' | 'approved' | 'paid' | 'cancelled' | 'refunded';
export type TxnMethod = 'cash' | 'bkash' | 'nagad' | 'bank' | 'card' | 'manual' | 'gateway' | 'upay' | 'rocket' | 'auto';
export type TxnSourceType =
    | 'subscription_payment'
    | 'exam_payment'
    | 'service_sale'
    | 'manual_income'
    | 'expense'
    | 'refund'
    | 'sms_cost'
    | 'email_cost'
    | 'sms_campaign_cost'
    | 'email_campaign_cost'
    | 'onboarding_message_cost'
    | 'result_notification_cost'
    | 'guardian_notification_cost'
    | 'auto_notification_cost'
    | 'hosting_cost'
    | 'staff_payout'
    | 'sms_test_send_cost'
    | 'email_test_send_cost'
    | 'other';

export interface IAttachment {
    url: string;
    type: 'image' | 'pdf' | 'other';
    filename?: string;
    sizeBytes?: number;
    uploadedAtUTC: Date;
}

export interface IFinanceTransaction extends Document {
    txnCode: string;
    direction: TxnDirection;
    amount: number;
    currency: string;
    dateUTC: Date;
    accountCode: string;
    categoryLabel: string;
    description: string;
    status: TxnStatus;
    method: TxnMethod;
    tags: string[];
    costCenterId?: string;
    vendorId?: mongoose.Types.ObjectId;

    // source link
    sourceType: TxnSourceType;
    sourceId?: string;
    studentId?: mongoose.Types.ObjectId;
    planId?: mongoose.Types.ObjectId;
    examId?: mongoose.Types.ObjectId;
    serviceId?: mongoose.Types.ObjectId;

    // reference info
    txnRefId?: string;
    invoiceNo?: string;
    note?: string;

    // workflow
    createdByAdminId: mongoose.Types.ObjectId;
    approvedByAdminId?: mongoose.Types.ObjectId;
    approvedAtUTC?: Date;
    paidAtUTC?: Date;

    // attachments
    attachments: IAttachment[];

    // soft delete
    isDeleted: boolean;
    deletedAt?: Date;
    deletedByAdminId?: mongoose.Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
    {
        url: { type: String, required: true, trim: true },
        type: { type: String, enum: ['image', 'pdf', 'other'], default: 'other' },
        filename: { type: String, trim: true },
        sizeBytes: { type: Number },
        uploadedAtUTC: { type: Date, default: Date.now },
    },
    { _id: false }
);

const FinanceTransactionSchema = new Schema<IFinanceTransaction>(
    {
        txnCode: { type: String, required: true, unique: true, trim: true, index: true },
        direction: { type: String, enum: ['income', 'expense'], required: true, index: true },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'BDT', trim: true },
        dateUTC: { type: Date, required: true, index: true },
        accountCode: { type: String, required: true, trim: true, uppercase: true, index: true },
        categoryLabel: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: '' },
        status: {
            type: String,
            enum: ['pending', 'approved', 'paid', 'cancelled', 'refunded'],
            default: 'paid',
            index: true,
        },
        method: {
            type: String,
            enum: ['cash', 'bkash', 'nagad', 'bank', 'card', 'manual', 'gateway', 'upay', 'rocket', 'auto'],
            default: 'manual',
        },
        tags: [{ type: String, trim: true }],
        costCenterId: { type: String, trim: true },

        vendorId: { type: Schema.Types.ObjectId, ref: 'FinanceVendor', default: null },

        // source linking
        sourceType: {
            type: String,
            enum: [
                'subscription_payment', 'exam_payment', 'service_sale', 'manual_income',
                'expense', 'refund', 'sms_cost', 'email_cost',
                'sms_campaign_cost', 'email_campaign_cost', 'onboarding_message_cost',
                'result_notification_cost', 'guardian_notification_cost', 'auto_notification_cost',
                'hosting_cost', 'staff_payout', 'sms_test_send_cost', 'email_test_send_cost', 'other',
            ],
            required: true,
            index: true,
        },
        sourceId: { type: String, trim: true, index: true },
        studentId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
        planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
        examId: { type: Schema.Types.ObjectId, ref: 'Exam', default: null },
        serviceId: { type: Schema.Types.ObjectId, ref: 'Service', default: null },

        // reference
        txnRefId: { type: String, trim: true },
        invoiceNo: { type: String, trim: true },
        note: { type: String, trim: true, default: '' },

        // workflow
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        approvedByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        approvedAtUTC: { type: Date, default: null },
        paidAtUTC: { type: Date, default: null },

        // attachments
        attachments: { type: [AttachmentSchema], default: [] },

        // soft delete
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: { type: Date, default: null },
        deletedByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true, collection: 'finance_transactions' }
);

FinanceTransactionSchema.index({ direction: 1, dateUTC: -1 });
FinanceTransactionSchema.index({ direction: 1, status: 1, dateUTC: -1 });
FinanceTransactionSchema.index({ sourceType: 1, sourceId: 1 });
FinanceTransactionSchema.index({ studentId: 1, dateUTC: -1 });
FinanceTransactionSchema.index({ costCenterId: 1, dateUTC: -1 });
FinanceTransactionSchema.index({ accountCode: 1, dateUTC: -1 });
FinanceTransactionSchema.index({ isDeleted: 1, direction: 1, dateUTC: -1 });

export default mongoose.model<IFinanceTransaction>('FinanceTransaction', FinanceTransactionSchema);
