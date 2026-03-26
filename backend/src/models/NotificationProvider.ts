import mongoose, { Document, Schema } from 'mongoose';

export type NotificationProviderType = 'sms' | 'email';
export type NotificationProviderName = 'twilio' | 'local_bd_rest' | 'custom' | 'sendgrid' | 'smtp';

export interface INotificationProvider extends Document {
    type: NotificationProviderType;
    provider: NotificationProviderName;
    displayName: string;
    isEnabled: boolean;
    /**
     * AES-256-GCM encrypted JSON blob containing provider credentials.
     * This field must NEVER be returned to the frontend.
     */
    credentialsEncrypted: string;
    senderConfig: {
        fromName?: string;
        fromEmail?: string;
        smsSenderId?: string;
    };
    rateLimit: {
        perMinute: number;
        perDay: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const NotificationProviderSchema = new Schema<INotificationProvider>(
    {
        type: {
            type: String,
            enum: ['sms', 'email'],
            required: true,
            index: true,
        },
        provider: {
            type: String,
            enum: ['twilio', 'local_bd_rest', 'custom', 'sendgrid', 'smtp'],
            required: true,
        },
        displayName: { type: String, required: true, trim: true },
        isEnabled: { type: Boolean, default: true, index: true },
        credentialsEncrypted: { type: String, required: true, select: false },
        senderConfig: {
            type: new Schema(
                {
                    fromName: { type: String, trim: true },
                    fromEmail: { type: String, trim: true, lowercase: true },
                    smsSenderId: { type: String, trim: true },
                },
                { _id: false }
            ),
            default: () => ({}),
        },
        rateLimit: {
            type: new Schema(
                {
                    perMinute: { type: Number, default: 30, min: 1 },
                    perDay: { type: Number, default: 1000, min: 1 },
                },
                { _id: false }
            ),
            default: () => ({ perMinute: 30, perDay: 1000 }),
        },
    },
    { timestamps: true, collection: 'notification_providers' }
);

NotificationProviderSchema.index({ type: 1, isEnabled: 1 });

export default mongoose.model<INotificationProvider>('NotificationProvider', NotificationProviderSchema);
