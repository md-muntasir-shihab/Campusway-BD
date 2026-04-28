import mongoose, { Schema, Document } from 'mongoose';

export interface IStudentProfile extends Document {
    user_id: mongoose.Types.ObjectId;
    user_unique_id: string; // Admin assigned
    full_name: string;
    guardian_name?: string;
    username?: string;
    email?: string;
    profile_photo_url?: string;
    phone?: string;
    phone_number?: string;
    guardian_phone?: string;
    guardian_email?: string;
    guardianOtpHash?: string;
    guardianOtpExpiresAt?: Date;
    guardianPhoneVerifiedAt?: Date;
    guardianPhoneVerificationStatus?: 'unverified' | 'pending' | 'verified';
    roll_number?: string;
    registration_id?: string;
    institution_name?: string;
    dob?: Date;
    gender?: 'male' | 'female' | 'other';
    department?: 'science' | 'arts' | 'commerce';
    ssc_batch?: string;
    hsc_batch?: string;
    admittedAt?: Date | null;
    groupIds?: mongoose.Types.ObjectId[];
    college_name?: string;
    college_address?: string;
    present_address?: string;
    permanent_address?: string;
    district?: string;
    country?: string;
    profile_completion_percentage: number;
    points: number;
    rank?: number;

    // Engagement & streak tracking
    streak_current?: number;
    streak_longest?: number;
    streak_last_activity_date?: Date | null;
    streak_freeze_count?: number;
    daily_practice_goal?: number;
    daily_practice_count_today?: number;
    last_practice_at?: Date | null;
    examIdentity?: Record<string, unknown>;
    examHistory?: Array<Record<string, unknown>>;
    latestExamResultSummary?: string;
    examDataLastSyncAt?: Date | null;
    examDataLastSyncSource?: string;
    createdAt: Date;
    updatedAt: Date;
}

const StudentProfileSchema = new Schema<IStudentProfile>({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    user_unique_id: { type: String, unique: true, sparse: true },
    full_name: { type: String, required: true, trim: true },
    guardian_name: { type: String, trim: true },
    username: { type: String, trim: true, lowercase: true },
    email: { type: String, trim: true, lowercase: true },
    profile_photo_url: { type: String },
    phone: { type: String, trim: true },
    phone_number: { type: String, unique: true, sparse: true, index: true },
    guardian_phone: { type: String, trim: true },
    guardian_email: { type: String, trim: true, lowercase: true },
    guardianOtpHash: { type: String, default: '' },
    guardianOtpExpiresAt: { type: Date, default: null },
    guardianPhoneVerifiedAt: { type: Date, default: null },
    guardianPhoneVerificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified'],
        default: 'unverified'
    },
    roll_number: { type: String, trim: true, index: true },
    registration_id: { type: String, trim: true, index: true },
    institution_name: { type: String, trim: true, index: true },
    dob: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    department: { type: String, enum: ['science', 'arts', 'commerce'] },
    ssc_batch: { type: String },
    hsc_batch: { type: String },
    admittedAt: { type: Date, default: null },
    groupIds: { type: [{ type: Schema.Types.ObjectId, ref: 'StudentGroup' }], default: [] },
    college_name: { type: String },
    college_address: { type: String },
    present_address: { type: String },
    permanent_address: { type: String },
    district: { type: String },
    country: { type: String, default: 'Bangladesh' },
    profile_completion_percentage: { type: Number, default: 0, min: 0, max: 100 },
    points: { type: Number, default: 0, index: true },
    rank: { type: Number },

    // Engagement & streak tracking
    streak_current: { type: Number, default: 0, min: 0 },
    streak_longest: { type: Number, default: 0, min: 0 },
    streak_last_activity_date: { type: Date, default: null },
    streak_freeze_count: { type: Number, default: 0, min: 0 },
    daily_practice_goal: { type: Number, default: 10, min: 0 },
    daily_practice_count_today: { type: Number, default: 0, min: 0 },
    last_practice_at: { type: Date, default: null },
    examIdentity: { type: Schema.Types.Mixed, default: {} },
    examHistory: { type: [Schema.Types.Mixed], default: [] } as any,
    latestExamResultSummary: { type: String, default: '' },
    examDataLastSyncAt: { type: Date, default: null },
    examDataLastSyncSource: { type: String, default: '' },
}, { timestamps: true });

StudentProfileSchema.index({ full_name: 1 });
StudentProfileSchema.index({ institution_name: 1, roll_number: 1 });
StudentProfileSchema.index({ hsc_batch: 1, admittedAt: -1 });
StudentProfileSchema.index({ groupIds: 1 });
StudentProfileSchema.index({ streak_current: -1 });
StudentProfileSchema.index({ streak_last_activity_date: -1 });

export default mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);
