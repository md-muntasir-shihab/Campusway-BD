import mongoose, { Document, Schema } from 'mongoose';

export type CoaType = 'income' | 'expense' | 'asset' | 'liability';

export interface IChartOfAccounts extends Document {
    code: string;
    name: string;
    type: CoaType;
    parentCode?: string;
    description?: string;
    isActive: boolean;
    isSystem: boolean; // system accounts cannot be deleted
    createdAt: Date;
    updatedAt: Date;
}

const ChartOfAccountsSchema = new Schema<IChartOfAccounts>(
    {
        code: { type: String, required: true, unique: true, trim: true, uppercase: true },
        name: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['income', 'expense', 'asset', 'liability'],
            required: true,
            index: true,
        },
        parentCode: { type: String, trim: true, uppercase: true, default: '' },
        description: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true },
        isSystem: { type: Boolean, default: false },
    },
    { timestamps: true, collection: 'chart_of_accounts' }
);

ChartOfAccountsSchema.index({ type: 1, isActive: 1 });
ChartOfAccountsSchema.index({ parentCode: 1 });

export default mongoose.model<IChartOfAccounts>('ChartOfAccounts', ChartOfAccountsSchema);
