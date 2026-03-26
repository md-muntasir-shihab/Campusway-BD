import mongoose, { Document, Schema } from 'mongoose';

export type UserRole =
    | 'superadmin'
    | 'admin'
    | 'moderator'
    | 'editor'
    | 'viewer'
    | 'support_agent'
    | 'finance_agent'
    | 'student'
    | 'chairman';
export type UserStatus = 'active' | 'suspended' | 'blocked' | 'pending';
export type IUserPermissionsV2 = Partial<Record<string, Partial<Record<string, boolean>>>>;

export interface IUserPermissions {
    canEditExams: boolean;
    canManageStudents: boolean;
    canViewReports: boolean;
    canDeleteData: boolean;
    canManageFinance: boolean;
    canManagePlans: boolean;
    canManageTickets: boolean;
    canManageBackups: boolean;
    canRevealPasswords: boolean;
}

export interface IUser extends Document {
    full_name: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
    status: UserStatus;
    permissions: IUserPermissions;
    permissionsV2?: IUserPermissionsV2;
    phone_number?: string;
    phoneVerifiedAt?: Date | null;
    phoneVerificationPendingAt?: Date | null;
    profile_photo?: string;
    emailVerifiedAt?: Date | null;
    emailVerificationPendingAt?: Date | null;
    mustChangePassword: boolean;
    passwordResetRequired: boolean;
    passwordSetByAdminId?: mongoose.Types.ObjectId;
    passwordLastChangedAtUTC?: Date;
    passwordChangedByType?: 'admin' | 'user';
    forcePasswordResetRequired: boolean;
    teamRoleId?: mongoose.Types.ObjectId;
    notes?: string;
    accountInfoLastSentAtUTC?: Date;
    accountInfoLastSentChannels?: string[];
    credentialsLastResentAtUTC?: Date;
    loginAttempts: number;
    lockUntil?: Date;
    lockReason?: string | null;
    lockedByUserId?: mongoose.Types.ObjectId | null;
    lastLockAt?: Date | null;
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    two_factor_method?: 'email' | 'sms' | 'authenticator' | null;
    twoFactorBackupCodes?: Array<{
        codeHash: string;
        usedAt?: Date | null;
    }>;
    twoFactorRecoveryLastIssuedAt?: Date | null;
    twoFactorLastVerifiedAt?: Date | null;
    lastSecurityNoticeAt?: Date | null;
    passwordHistory?: Array<{
        hash: string;
        createdAt: Date;
        source?: 'admin' | 'user' | 'reset';
    }>;
    passwordExpiresAt?: Date | null;
    lastLogin?: Date;
    lastLoginAtUTC?: Date;
    ip_address?: string;
    device_info?: string;
    password_updated_at?: Date;
    subscription?: {
        plan?: string;
        planCode?: string;
        planId?: mongoose.Types.ObjectId;
        planSlug?: string;
        planName?: string;
        isActive?: boolean;
        startDate?: Date;
        expiryDate?: Date;
        ctaLabel?: string;
        ctaUrl?: string;
        ctaMode?: 'contact' | 'request_payment' | 'internal' | 'external';
        assignedBy?: mongoose.Types.ObjectId;
        assignedAt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

const UserPermissionsSchema = new Schema<IUserPermissions>(
    {
        canEditExams: { type: Boolean, default: false },
        canManageStudents: { type: Boolean, default: false },
        canViewReports: { type: Boolean, default: false },
        canDeleteData: { type: Boolean, default: false },
        canManageFinance: { type: Boolean, default: false },
        canManagePlans: { type: Boolean, default: false },
        canManageTickets: { type: Boolean, default: false },
        canManageBackups: { type: Boolean, default: false },
        canRevealPasswords: { type: Boolean, default: false },
    },
    { _id: false }
);

const UserSchema = new Schema<IUser>(
    {
        full_name: { type: String, required: true, trim: true },
        username: { type: String, required: true, unique: true, trim: true, lowercase: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true, select: false },
        role: {
            type: String,
            enum: ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent', 'student', 'chairman'],
            default: 'student',
        },
        status: {
            type: String,
            enum: ['active', 'suspended', 'blocked', 'pending'],
            default: 'active',
        },
        permissions: {
            type: UserPermissionsSchema,
            default: () => ({
                canEditExams: false,
                canManageStudents: false,
                canViewReports: false,
                canDeleteData: false,
                canManageFinance: false,
                canManagePlans: false,
                canManageTickets: false,
                canManageBackups: false,
                canRevealPasswords: false,
            }),
        },
        permissionsV2: {
            type: Schema.Types.Mixed,
            default: () => ({}),
        },
        phone_number: { type: String, unique: true, sparse: true, index: true },
        phoneVerifiedAt: { type: Date, default: null },
        phoneVerificationPendingAt: { type: Date, default: null },
        profile_photo: { type: String, trim: true },
        emailVerifiedAt: { type: Date, default: null },
        emailVerificationPendingAt: { type: Date, default: null },
        mustChangePassword: { type: Boolean, default: false },
        passwordResetRequired: { type: Boolean, default: false },
        passwordSetByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        passwordLastChangedAtUTC: { type: Date, default: null },
        passwordChangedByType: { type: String, enum: ['admin', 'user', null], default: null },
        forcePasswordResetRequired: { type: Boolean, default: false },
        teamRoleId: { type: Schema.Types.ObjectId, ref: 'TeamRole', default: null, index: true },
        notes: { type: String, trim: true, default: '' },
        accountInfoLastSentAtUTC: { type: Date, default: null },
        accountInfoLastSentChannels: { type: [String], default: [] },
        credentialsLastResentAtUTC: { type: Date, default: null },
        loginAttempts: { type: Number, default: 0 },
        lockUntil: { type: Date },
        lockReason: { type: String, trim: true, default: null },
        lockedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        lastLockAt: { type: Date, default: null },
        twoFactorEnabled: { type: Boolean, default: false },
        twoFactorSecret: { type: String, select: false },
        two_factor_method: { type: String, enum: ['email', 'sms', 'authenticator', null], default: null },
        twoFactorBackupCodes: {
            type: [{
                codeHash: { type: String, required: true },
                usedAt: { type: Date, default: null },
            }],
            default: [],
            select: false,
        },
        twoFactorRecoveryLastIssuedAt: { type: Date, default: null },
        twoFactorLastVerifiedAt: { type: Date, default: null },
        lastSecurityNoticeAt: { type: Date, default: null },
        passwordHistory: {
            type: [{
                hash: { type: String, required: true },
                createdAt: { type: Date, default: Date.now },
                source: { type: String, enum: ['admin', 'user', 'reset'], default: 'user' },
            }],
            default: [],
            select: false,
        },
        passwordExpiresAt: { type: Date, default: null },
        lastLogin: { type: Date },
        lastLoginAtUTC: { type: Date },
        ip_address: { type: String, trim: true },
        device_info: { type: String, trim: true },
        password_updated_at: { type: Date },
        subscription: {
            plan: { type: String, trim: true },
            planCode: { type: String, trim: true },
            planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
            planSlug: { type: String, trim: true },
            planName: { type: String, trim: true },
            isActive: { type: Boolean, default: false },
            startDate: { type: Date },
            expiryDate: { type: Date },
            ctaLabel: { type: String, trim: true },
            ctaUrl: { type: String, trim: true },
            ctaMode: {
                type: String,
                enum: ['contact', 'request_payment', 'internal', 'external', null],
                default: null,
            },
            assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            assignedAt: { type: Date },
        },
    },
    { timestamps: true }
);

UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ username: 1, email: 1, phone_number: 1 });

export default mongoose.model<IUser>('User', UserSchema);
