import mongoose, { Document, Schema } from 'mongoose';

export interface IExternalExamJoinLog extends Document {
    examId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    joinedAt: Date;
    attemptNo: number;
    attemptRef: string;
    status: 'awaiting_result' | 'imported';
    sourcePanel: string;
    registration_id_snapshot?: string;
    user_unique_id_snapshot?: string;
    username_snapshot?: string;
    email_snapshot?: string;
    phone_number_snapshot?: string;
    full_name_snapshot?: string;
    groupIds_snapshot: string[];
    externalExamUrl?: string;
    importedResultId?: mongoose.Types.ObjectId | null;
    importedAt?: Date | null;
    matchedBy?: string;
    ip: string;
    userAgent: string;
    createdAt: Date;
    updatedAt: Date;
}

const ExternalExamJoinLogSchema = new Schema<IExternalExamJoinLog>(
    {
        examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        joinedAt: { type: Date, default: Date.now, index: true },
        attemptNo: { type: Number, default: 1 },
        attemptRef: { type: String, default: '', trim: true },
        status: { type: String, enum: ['awaiting_result', 'imported'], default: 'awaiting_result' },
        sourcePanel: { type: String, default: 'exam_start' },
        registration_id_snapshot: { type: String, default: '' },
        user_unique_id_snapshot: { type: String, default: '' },
        username_snapshot: { type: String, default: '' },
        email_snapshot: { type: String, default: '' },
        phone_number_snapshot: { type: String, default: '' },
        full_name_snapshot: { type: String, default: '' },
        groupIds_snapshot: { type: [String], default: [] },
        externalExamUrl: { type: String, default: '' },
        importedResultId: { type: Schema.Types.ObjectId, ref: 'ExamResult', default: null },
        importedAt: { type: Date, default: null },
        matchedBy: { type: String, default: '' },
        ip: { type: String, default: '' },
        userAgent: { type: String, default: '' },
    },
    { timestamps: true, collection: 'external_exam_join_logs' }
);

ExternalExamJoinLogSchema.index({ examId: 1, joinedAt: -1 });
ExternalExamJoinLogSchema.index({ studentId: 1, joinedAt: -1 });
ExternalExamJoinLogSchema.index({ examId: 1, studentId: 1, attemptNo: 1 });
ExternalExamJoinLogSchema.index({ attemptRef: 1 }, { sparse: true });

export default mongoose.model<IExternalExamJoinLog>('ExternalExamJoinLog', ExternalExamJoinLogSchema);
