import mongoose, { Document, Schema } from 'mongoose';

export type AutomationAction =
    | 'reminder_sent'
    | 'expired'
    | 'renewed'
    | 'access_locked'
    | 'sessions_revoked'
    | 'grace_period_started'
    | 'payment_retry';

export interface ISubscriptionAutomationLog extends Document {
    studentId: mongoose.Types.ObjectId;
    planId?: mongoose.Types.ObjectId;
    subscriptionId?: mongoose.Types.ObjectId;
    action: AutomationAction;
    channel?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

const SubscriptionAutomationLogSchema = new Schema<ISubscriptionAutomationLog>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
        subscriptionId: { type: Schema.Types.ObjectId, ref: 'UserSubscription' },
        action: {
            type: String,
            required: true,
            enum: ['reminder_sent', 'expired', 'renewed', 'access_locked', 'sessions_revoked', 'grace_period_started', 'payment_retry'],
        },
        channel: { type: String, maxlength: 30 },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'subscription_automation_logs' },
);

SubscriptionAutomationLogSchema.index({ studentId: 1, createdAt: -1 });
SubscriptionAutomationLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model<ISubscriptionAutomationLog>('SubscriptionAutomationLog', SubscriptionAutomationLogSchema);
