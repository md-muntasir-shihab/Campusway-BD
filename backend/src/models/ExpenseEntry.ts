import mongoose, { Document, Schema } from 'mongoose';

export type ExpenseCategory =
    | 'server'
    | 'marketing'
    | 'staff_salary'
    | 'moderator_salary'
    | 'tools'
    | 'misc';

export interface IExpenseEntry extends Document {
    category: ExpenseCategory;
    amount: number;
    date: Date;
    vendor?: string;
    notes?: string;
    linkedStaffId?: mongoose.Types.ObjectId | null;
    recordedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ExpenseEntrySchema = new Schema<IExpenseEntry>(
    {
        category: {
            type: String,
            enum: ['server', 'marketing', 'staff_salary', 'moderator_salary', 'tools', 'misc'],
            default: 'misc',
            index: true,
        },
        amount: { type: Number, required: true, min: 0 },
        date: { type: Date, required: true, default: Date.now, index: true },
        vendor: { type: String, trim: true, default: '' },
        notes: { type: String, trim: true, default: '' },
        linkedStaffId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true, collection: 'expense_entries' }
);

ExpenseEntrySchema.index({ date: -1, category: 1 });

export default mongoose.model<IExpenseEntry>('ExpenseEntry', ExpenseEntrySchema);
