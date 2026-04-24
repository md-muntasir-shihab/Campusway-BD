import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionContactPreset extends Document {
    name: string;
    prefix: string;
    suffix: string;
    separator: string;
    includeName: boolean;
    includeEmail: boolean;
    includeGuardian: boolean;
    includePlan: boolean;
    includeStatus: boolean;
    excludeExpiredByDefault: boolean;
    isDefault: boolean;
    createdByAdminId?: mongoose.Types.ObjectId | null;
    updatedByAdminId?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const SubscriptionContactPresetSchema = new Schema<ISubscriptionContactPreset>(
    {
        name: { type: String, required: true, trim: true },
        prefix: { type: String, trim: true, default: '' },
        suffix: { type: String, trim: true, default: '' },
        separator: { type: String, trim: true, default: '\n' },
        includeName: { type: Boolean, default: false },
        includeEmail: { type: Boolean, default: false },
        includeGuardian: { type: Boolean, default: false },
        includePlan: { type: Boolean, default: false },
        includeStatus: { type: Boolean, default: false },
        excludeExpiredByDefault: { type: Boolean, default: true },
        isDefault: { type: Boolean, default: false },
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        updatedByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true, collection: 'subscription_contact_presets' },
);

SubscriptionContactPresetSchema.index({ isDefault: 1, updatedAt: -1 });
SubscriptionContactPresetSchema.index({ name: 1 }, { unique: true });

export default mongoose.model<ISubscriptionContactPreset>('SubscriptionContactPreset', SubscriptionContactPresetSchema);
