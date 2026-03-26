import mongoose, { Document, Schema } from 'mongoose';

export type RuleFrequency = 'monthly' | 'weekly' | 'yearly' | 'custom';

export interface IFinanceRecurringRule extends Document {
    name: string;
    direction: 'income' | 'expense';
    amount: number;
    currency: string;
    accountCode: string;
    categoryLabel: string;
    description: string;
    method: string;
    tags: string[];
    costCenterId?: string;
    vendorId?: mongoose.Types.ObjectId;
    frequency: RuleFrequency;
    dayOfMonth?: number;
    intervalDays?: number;
    nextRunAtUTC: Date;
    endAtUTC?: Date;
    isActive: boolean;
    lastRunAtUTC?: Date;
    lastCreatedTxnId?: mongoose.Types.ObjectId;
    createdByAdminId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FinanceRecurringRuleSchema = new Schema<IFinanceRecurringRule>(
    {
        name: { type: String, required: true, trim: true },
        direction: { type: String, enum: ['income', 'expense'], required: true },
        amount: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'BDT', trim: true },
        accountCode: { type: String, required: true, trim: true, uppercase: true },
        categoryLabel: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: '' },
        method: { type: String, default: 'manual', trim: true },
        tags: [{ type: String, trim: true }],
        costCenterId: { type: String, trim: true, default: '' },
        vendorId: { type: Schema.Types.ObjectId, ref: 'FinanceVendor', default: null },
        frequency: {
            type: String,
            enum: ['monthly', 'weekly', 'yearly', 'custom'],
            default: 'monthly',
        },
        dayOfMonth: { type: Number, min: 1, max: 31, default: null },
        intervalDays: { type: Number, min: 1, default: null },
        nextRunAtUTC: { type: Date, required: true, index: true },
        endAtUTC: { type: Date, default: null },
        isActive: { type: Boolean, default: true, index: true },
        lastRunAtUTC: { type: Date, default: null },
        lastCreatedTxnId: { type: Schema.Types.ObjectId, ref: 'FinanceTransaction', default: null },
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true, collection: 'finance_recurring_rules' }
);

FinanceRecurringRuleSchema.index({ isActive: 1, nextRunAtUTC: 1 });

export default mongoose.model<IFinanceRecurringRule>('FinanceRecurringRule', FinanceRecurringRuleSchema);
