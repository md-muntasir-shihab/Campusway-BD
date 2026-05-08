import mongoose, { Document, Schema } from 'mongoose';
import { NotificationType } from './Notification';

export interface ChannelPreferences {
    in_app: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
}

export type PreferenceScope = NotificationType | 'global';

export interface INotificationPreference extends Document {
    studentId: mongoose.Types.ObjectId;
    notificationType: PreferenceScope;
    channels: ChannelPreferences;
    createdAt: Date;
    updatedAt: Date;
}

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        notificationType: {
            type: String,
            required: true,
            default: 'global',
        },
        channels: {
            in_app: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            email: { type: Boolean, default: true },
            sms: { type: Boolean, default: true },
        },
    },
    { timestamps: true, collection: 'notification_preferences' }
);

NotificationPreferenceSchema.index({ studentId: 1, notificationType: 1 }, { unique: true });

export default mongoose.model<INotificationPreference>('NotificationPreference', NotificationPreferenceSchema);
