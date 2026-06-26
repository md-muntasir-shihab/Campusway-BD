import mongoose, { Document, Schema } from 'mongoose';

// Canonical list of timeline types — the single source of truth shared by the
// model schema, the backend route validators, and (mirrored) by the frontend.
// Any change here MUST be mirrored in frontend/src/pages/admin/students/StudentCrmTimelinePage.tsx.
export const TIMELINE_TYPES = [
    'note', 'call', 'message', 'support_ticket_link', 'payment_note',
    'account_event', 'login_event', 'profile_update',
    'subscription_event', 'exam_event', 'notification_event', 'security_event',
] as const;
export type StudentContactTimelineType = (typeof TIMELINE_TYPES)[number];

// Manual (admin-authored) entry types — a subset that admins are allowed to
// create directly. System events are produced programmatically only.
export const MANUAL_TIMELINE_TYPES = [
    'note', 'call', 'message', 'support_ticket_link', 'payment_note',
] as const;
export type ManualTimelineType = (typeof MANUAL_TIMELINE_TYPES)[number];

export type TimelineSourceType = 'manual' | 'system';

export interface IStudentContactTimeline extends Document {
    studentId: mongoose.Types.ObjectId;
    type: StudentContactTimelineType;
    content: string;
    linkedId?: mongoose.Types.ObjectId;
    createdByAdminId?: mongoose.Types.ObjectId;
    sourceType: TimelineSourceType;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const StudentContactTimelineSchema = new Schema<IStudentContactTimeline>(
    {
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: TIMELINE_TYPES,
            required: true,
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        linkedId: { type: Schema.Types.ObjectId },
        createdByAdminId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        sourceType: {
            type: String,
            enum: ['manual', 'system'],
            default: 'manual',
        },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true, collection: 'student_contact_timeline' }
);

StudentContactTimelineSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.model<IStudentContactTimeline>('StudentContactTimeline', StudentContactTimelineSchema);
