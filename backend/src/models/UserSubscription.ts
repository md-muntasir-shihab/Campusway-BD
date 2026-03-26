import mongoose, { Document, Schema } from 'mongoose';

export type UserSubscriptionStatus = 'active' | 'expired' | 'pending' | 'suspended';

export interface IUserSubscription extends Document {
    userId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    status: UserSubscriptionStatus;
    startAtUTC: Date;
    expiresAtUTC: Date;
    activatedByAdminId?: mongoose.Types.ObjectId | null;
    paymentId?: mongoose.Types.ObjectId | null;
    notes?: string;
    autoRenewEnabled: boolean;
    lastReminderSentAtUTC?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSubscriptionSchema = new Schema<IUserSubscription>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true, index: true },
        status: {
            type: String,
            enum: ['active', 'expired', 'pending', 'suspended'],
            default: 'pending',
            index: true,
        },
        startAtUTC: { type: Date, required: true, default: () => new Date() },
        expiresAtUTC: { type: Date, required: true },
        activatedByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        paymentId: { type: Schema.Types.ObjectId, ref: 'ManualPayment', default: null },
        notes: { type: String, trim: true, default: '' },
        autoRenewEnabled: { type: Boolean, default: false },
        lastReminderSentAtUTC: { type: Date },
    },
    { timestamps: true, collection: 'user_subscriptions' }
);

UserSubscriptionSchema.index({ userId: 1, status: 1, expiresAtUTC: 1 });
UserSubscriptionSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model<IUserSubscription>('UserSubscription', UserSubscriptionSchema);
