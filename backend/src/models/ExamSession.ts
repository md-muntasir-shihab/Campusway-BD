import mongoose, { Schema, Document } from 'mongoose';

/**
 * ExamSession model — tracks an in-progress exam attempt for auto-save and fraud detection.
 *
 * Key fields:
 * - `exam` / `student`: References to the Exam and User documents
 * - `attemptNo`: Which attempt number this is for the student
 * - `answers`: Array of per-question responses with change history
 * - `status`: in_progress | submitted | evaluated | expired
 * - `tabSwitchCount`, `copyAttemptCount`, `fullscreenExitCount`: Anti-cheat counters
 * - `cheat_flags`: Timestamped reasons for suspicious activity
 * - `submissionType`: manual | auto_timeout | auto_expired | forced
 * - `expiresAt`: When the session auto-expires
 *
 * @collection exam_attempts
 */
export interface IExamSession extends Document {
    exam: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    attemptNo: number;
    attemptRevision: number;
    startedAt: Date;
    lastSavedAt: Date;
    autoSaves: number;
    answers: {
        questionId: string;
        selectedAnswer: string;
        writtenAnswerUrl?: string;
        savedAt: Date;
        /* ── Answer change tracking ── */
        answerHistory: { value: string; timestamp: Date }[];
        changeCount: number;
    }[];
    tabSwitchEvents: { timestamp: Date; count: number }[];
    ipAddress: string;
    deviceInfo: string;
    browserInfo: string;
    userAgent: string;
    deviceFingerprint: string;
    sessionLocked: boolean;
    lockReason?: string;
    isActive: boolean;
    expiresAt: Date;
    /* ── Submission details ── */
    submittedAt?: Date;
    submissionType?: 'manual' | 'auto_timeout' | 'auto_expired' | 'forced';
    tabSwitchCount: number;
    copyAttemptCount: number;
    fullscreenExitCount: number;
    violationsCount: number;
    forcedSubmittedAt?: Date;
    forcedSubmittedBy?: mongoose.Types.ObjectId;
    currentQuestionId?: string;

    /* ── Phase 8: Advanced Security & Written Uploads ── */
    cheat_flags: { reason: string; timestamp: Date }[];
    auto_submitted: boolean;
    status: 'in_progress' | 'submitted' | 'evaluated' | 'expired';
    createdAt: Date;
    updatedAt: Date;
}

const ExamSessionSchema = new Schema<IExamSession>({
    exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    attemptNo: { type: Number, default: 1 },
    attemptRevision: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    lastSavedAt: { type: Date, default: Date.now },
    autoSaves: { type: Number, default: 0 },
    answers: [{
        questionId: String,
        selectedAnswer: String,
        writtenAnswerUrl: String,
        savedAt: { type: Date, default: Date.now },
        answerHistory: [{
            value: String,
            timestamp: { type: Date, default: Date.now },
        }],
        changeCount: { type: Number, default: 0 },
    }],
    tabSwitchEvents: [{
        timestamp: { type: Date, default: Date.now },
        count: Number,
    }],
    ipAddress: { type: String, default: '' },
    deviceInfo: { type: String, default: '' },
    browserInfo: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    deviceFingerprint: { type: String, default: '' },
    sessionLocked: { type: Boolean, default: false },
    lockReason: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
    submittedAt: Date,
    submissionType: { type: String, enum: ['manual', 'auto_timeout', 'auto_expired', 'forced'] },
    tabSwitchCount: { type: Number, default: 0 },
    copyAttemptCount: { type: Number, default: 0 },
    fullscreenExitCount: { type: Number, default: 0 },
    violationsCount: { type: Number, default: 0 },
    forcedSubmittedAt: { type: Date, default: null },
    forcedSubmittedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    currentQuestionId: { type: String, default: '' },

    cheat_flags: [{
        reason: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }],
    auto_submitted: { type: Boolean, default: false },
    status: { type: String, enum: ['in_progress', 'submitted', 'evaluated', 'expired'], default: 'in_progress' },
}, { timestamps: true, collection: 'exam_attempts' });

ExamSessionSchema.index({ exam: 1, student: 1 });
ExamSessionSchema.index({ exam: 1, student: 1, isActive: 1 });
ExamSessionSchema.index({ exam: 1, student: 1, isActive: 1, status: 1, attemptNo: -1 });
ExamSessionSchema.index({ expiresAt: 1, isActive: 1 });

export default mongoose.model<IExamSession>('ExamSession', ExamSessionSchema);
