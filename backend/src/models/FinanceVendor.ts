import mongoose, { Document, Schema } from 'mongoose';

export interface IFinanceVendor extends Document {
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
    address?: string;
    category?: string; // e.g. hosting, marketing, payroll
    notes?: string;
    isActive: boolean;
    createdByAdminId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const FinanceVendorSchema = new Schema<IFinanceVendor>(
    {
        name: { type: String, required: true, trim: true },
        contact: { type: String, trim: true, default: '' },
        email: { type: String, trim: true, lowercase: true, default: '' },
        phone: { type: String, trim: true, default: '' },
        address: { type: String, trim: true, default: '' },
        category: { type: String, trim: true, default: 'general' },
        notes: { type: String, trim: true, default: '' },
        isActive: { type: Boolean, default: true, index: true },
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true, collection: 'finance_vendors' }
);

FinanceVendorSchema.index({ name: 'text' });
FinanceVendorSchema.index({ category: 1, isActive: 1 });

export default mongoose.model<IFinanceVendor>('FinanceVendor', FinanceVendorSchema);
