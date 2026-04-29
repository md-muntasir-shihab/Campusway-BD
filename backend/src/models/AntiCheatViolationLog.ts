import mongoose, { Document, Schema } from 'mongoose';

export type ViolationType = 'tab_switch' | 'copy_attempt' | 'fullscreen_exit' | 'fingerprint_match' | 'ip_duplicate';

export interface IAntiCheatViolationLog extends Document {
    session: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    exam: mongoose.Types.ObjectId;
    violationType: ViolationType;
    details?: string;
    deviceFingerprint?: string;
    ipAddress?: string;
    timestamp: Date;
}

const AntiCheatViolationLogSchema = new Schema<IAntiCheatViolationLog>(
    {
        session: {
            type: Schema.Types.ObjectId,
            ref: 'ExamSession',
            required: true,
        },
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        exam: {
            type: Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
        },
        violationType: {
            type: String,
            enum: ['tab_switch', 'copy_attempt', 'fullscreen_exit', 'fingerprint_match', 'ip_duplicate'],
            required: true,
        },
        details: { type: String, default: null },
        deviceFingerprint: { type: String, default: null },
        ipAddress: { type: String, default: null },
        timestamp: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true, collection: 'anti_cheat_violations' },
);

// Query violations by exam + student
AntiCheatViolationLogSchema.index({ exam: 1, student: 1 });
// Query violations by session
AntiCheatViolationLogSchema.index({ session: 1 });
// Filter by violation type, sorted by most recent
AntiCheatViolationLogSchema.index({ violationType: 1, timestamp: -1 });

export default mongoose.model<IAntiCheatViolationLog>('AntiCheatViolationLog', AntiCheatViolationLogSchema);
