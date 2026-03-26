import mongoose, { Document, Schema } from 'mongoose';

export interface IFinanceBudget extends Document {
    month: string; // YYYY-MM
    accountCode: string;
    categoryLabel: string;
    amountLimit: number;
    alertThresholdPercent: number;
    direction: 'income' | 'expense';
    costCenterId?: string;
    notes?: string;
    createdByAdminId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FinanceBudgetSchema = new Schema<IFinanceBudget>(
    {
        month: { type: String, required: true, trim: true, index: true }, // e.g. "2025-03"
        accountCode: { type: String, required: true, trim: true, uppercase: true },
        categoryLabel: { type: String, required: true, trim: true },
        amountLimit: { type: Number, required: true, min: 0 },
        alertThresholdPercent: { type: Number, default: 80, min: 0, max: 100 },
        direction: { type: String, enum: ['income', 'expense'], default: 'expense' },
        costCenterId: { type: String, trim: true, default: '' },
        notes: { type: String, trim: true, default: '' },
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true, collection: 'finance_budgets' }
);

FinanceBudgetSchema.index({ month: 1, accountCode: 1 }, { unique: true });
FinanceBudgetSchema.index({ month: 1, direction: 1 });

export default mongoose.model<IFinanceBudget>('FinanceBudget', FinanceBudgetSchema);
