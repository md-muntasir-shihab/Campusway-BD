import mongoose, { Schema, Document } from 'mongoose';

export interface IExamEvent extends Document {
    attempt: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    exam: mongoose.Types.ObjectId;
    eventType: 'save' | 'tab_switch' | 'fullscreen_exit' | 'copy_attempt' | 'submit' | 'error' | 'resume' | 'warn_sent' | 'admin_action' | 'message_sent' | 'blur' | 'client_error' | 'context_menu_blocked' | 'anti_cheat_decision';
    metadata: Record<string, any>;
    ip: string;
    userAgent: string;
    createdAt: Date;
}

const ExamEventSchema = new Schema<IExamEvent>({
    attempt: { type: Schema.Types.ObjectId, ref: 'ExamSession', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
    eventType: {
        type: String,
        enum: ['save', 'tab_switch', 'fullscreen_exit', 'copy_attempt', 'submit', 'error', 'resume', 'warn_sent', 'admin_action', 'message_sent', 'blur', 'client_error', 'context_menu_blocked', 'anti_cheat_decision'],
        required: true
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' }
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'exam_audit_events' });

ExamEventSchema.index({ attempt: 1, createdAt: -1 });
ExamEventSchema.index({ exam: 1, eventType: 1 });
ExamEventSchema.index({ exam: 1, attempt: 1, createdAt: -1 });

export default mongoose.model<IExamEvent>('ExamEvent', ExamEventSchema);
