import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminNotificationRead extends Document {
    adminUserId: mongoose.Types.ObjectId;
    notificationId: mongoose.Types.ObjectId;
    readAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AdminNotificationReadSchema = new Schema<IAdminNotificationRead>(
    {
        adminUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },
        readAt: { type: Date, default: Date.now },
    },
    { timestamps: true, collection: 'admin_notification_reads' }
);

AdminNotificationReadSchema.index({ adminUserId: 1, notificationId: 1 }, { unique: true });

export default mongoose.model<IAdminNotificationRead>('AdminNotificationRead', AdminNotificationReadSchema);
