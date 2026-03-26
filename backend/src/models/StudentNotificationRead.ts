import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentNotificationRead extends Document {
    studentId: mongoose.Types.ObjectId;
    notificationId: mongoose.Types.ObjectId;
    readAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const StudentNotificationReadSchema = new Schema<IStudentNotificationRead>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        notificationId: { type: Schema.Types.ObjectId, ref: 'Notification', required: true, index: true },
        readAt: { type: Date, default: Date.now },
    },
    { timestamps: true, collection: 'student_notification_reads' }
);

StudentNotificationReadSchema.index({ studentId: 1, notificationId: 1 }, { unique: true });

export default mongoose.model<IStudentNotificationRead>('StudentNotificationRead', StudentNotificationReadSchema);
