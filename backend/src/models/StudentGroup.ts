import mongoose, { Document, Schema } from 'mongoose';

export type GroupType = 'manual' | 'dynamic';
export type CardStyleVariant = 'solid' | 'gradient' | 'outline' | 'minimal';
export type JoinMethod = 'open' | 'approval_required' | 'invite_only' | 'code_based';
export type GroupVisibility = 'public' | 'private' | 'invite_only';

export interface IStudentGroup extends Document {
    name: string;
    slug: string;
    shortCode?: string;
    batchTag?: string;
    description?: string;
    isActive: boolean;
    studentCount: number;
    memberCountCached: number;
    createdByAdminId?: mongoose.Types.ObjectId;
    type: GroupType;

    // Visual / card UI
    color?: string;
    icon?: string;
    cardStyleVariant?: CardStyleVariant;
    sortOrder: number;
    isFeatured: boolean;

    // Academic targeting
    batch?: string;
    department?: string;

    // Admin policy defaults
    visibilityNote?: string;
    defaultExamVisibility?: 'all_students' | 'group_only' | 'hidden';
    defaultCommunicationAudience?: boolean;

    /** @deprecated Use GroupMembership collection. Kept for migration compatibility. */
    manualStudents?: mongoose.Types.ObjectId[];
    rules?: {
        batches?: string[];
        sscBatches?: string[];
        departments?: string[];
        statuses?: string[];
        planCodes?: string[];
        planIds?: string[];
        groupIds?: string[];
        bucket?: string;
        hasPhone?: boolean;
        hasEmail?: boolean;
        hasGuardian?: boolean;
        paymentDue?: boolean;
        renewalThresholdDays?: number;
        profileScoreRange?: { min?: number; max?: number };
    };
    meta?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;

    // Exam system extensions (Requirement 13.6)
    parent_group_id?: mongoose.Types.ObjectId;
    join_method?: JoinMethod;
    join_code?: string;
    max_members?: number;
    visibility?: GroupVisibility;
}

const StudentGroupSchema = new Schema<IStudentGroup>(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
        shortCode: { type: String, trim: true, uppercase: true, sparse: true },
        batchTag: { type: String, trim: true, default: '' },
        description: { type: String, default: '' },
        isActive: { type: Boolean, default: true },
        studentCount: { type: Number, default: 0 },
        memberCountCached: { type: Number, default: 0 },
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
        type: { type: String, enum: ['manual', 'dynamic'], default: 'manual' },

        // Visual / card UI
        color: { type: String, trim: true, default: '#6366f1' },
        icon: { type: String, trim: true, default: 'Users' },
        cardStyleVariant: { type: String, enum: ['solid', 'gradient', 'outline', 'minimal'], default: 'solid' },
        sortOrder: { type: Number, default: 0 },
        isFeatured: { type: Boolean, default: false },

        // Academic targeting
        batch: { type: String, trim: true },
        department: { type: String, trim: true },

        // Admin policy defaults
        visibilityNote: { type: String, trim: true, default: '' },
        defaultExamVisibility: { type: String, enum: ['all_students', 'group_only', 'hidden'], default: 'all_students' },
        defaultCommunicationAudience: { type: Boolean, default: false },

        /** @deprecated */
        manualStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        rules: {
            batches: [String],
            sscBatches: [String],
            departments: [String],
            statuses: [String],
            planCodes: [String],
            planIds: [String],
            groupIds: [String],
            bucket: { type: String, trim: true, default: '' },
            hasPhone: { type: Boolean, default: undefined },
            hasEmail: { type: Boolean, default: undefined },
            hasGuardian: { type: Boolean, default: undefined },
            paymentDue: { type: Boolean, default: undefined },
            renewalThresholdDays: { type: Number, default: undefined },
            profileScoreRange: {
                min: { type: Number },
                max: { type: Number },
            },
        },
        meta: { type: Schema.Types.Mixed, default: {} },

        // Exam system extensions (Requirement 13.6)
        parent_group_id: { type: Schema.Types.ObjectId, ref: 'StudentGroup', default: undefined },
        join_method: {
            type: String,
            enum: ['open', 'approval_required', 'invite_only', 'code_based'],
            default: 'open',
        },
        join_code: { type: String, trim: true, sparse: true },
        max_members: { type: Number, default: undefined },
        visibility: {
            type: String,
            enum: ['public', 'private', 'invite_only'],
            default: 'public',
        },
    },
    { timestamps: true }
);

StudentGroupSchema.index({ isActive: 1, batchTag: 1, name: 1 });
StudentGroupSchema.index({ type: 1 });
StudentGroupSchema.index({ sortOrder: 1, name: 1 });
StudentGroupSchema.index({ isFeatured: 1, isActive: 1 });
StudentGroupSchema.index({ join_code: 1 }, { unique: true, sparse: true });
StudentGroupSchema.index({ parent_group_id: 1 });
StudentGroupSchema.index({ visibility: 1, isActive: 1 });

export default mongoose.model<IStudentGroup>('StudentGroup', StudentGroupSchema);
