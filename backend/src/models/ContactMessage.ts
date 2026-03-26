import mongoose, { Document, Schema } from 'mongoose';

export type ContactMessageStatus = 'new' | 'opened' | 'replied' | 'resolved' | 'archived';
export type ContactMessageSourceType = 'public' | 'user' | 'student' | 'subscriber';
export type ContactMessageMatchedBy = 'email' | 'phone' | 'userId' | 'none';

export interface IContactMessage extends Document {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    status: ContactMessageStatus;
    unreadByAdmin: boolean;
    adminOpenedAt?: Date | null;
    sourceType: ContactMessageSourceType;
    linkedUserId?: mongoose.Types.ObjectId | null;
    linkedStudentId?: mongoose.Types.ObjectId | null;
    matchedBy: ContactMessageMatchedBy;
    normalizedEmail?: string;
    normalizedPhone?: string;
    metadata?: Record<string, unknown>;
    isRead: boolean;
    isReplied: boolean;
    ip?: string;
    userAgent?: string;
    createdAt: Date;
    updatedAt: Date;
}

function normalizeEmail(value: unknown): string {
    return String(value || '').trim().toLowerCase();
}

function normalizePhone(value: unknown): string {
    return String(value || '').replace(/\D+/g, '');
}

const ContactMessageSchema = new Schema<IContactMessage>({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true, default: '' },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['new', 'opened', 'replied', 'resolved', 'archived'],
        default: 'new',
        index: true,
    },
    unreadByAdmin: { type: Boolean, default: true, index: true },
    adminOpenedAt: { type: Date, default: null },
    sourceType: {
        type: String,
        enum: ['public', 'user', 'student', 'subscriber'],
        default: 'public',
        index: true,
    },
    linkedUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    linkedStudentId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    matchedBy: {
        type: String,
        enum: ['email', 'phone', 'userId', 'none'],
        default: 'none',
    },
    normalizedEmail: { type: String, trim: true, default: '', index: true },
    normalizedPhone: { type: String, trim: true, default: '', index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    isRead: { type: Boolean, default: false, index: true },
    isReplied: { type: Boolean, default: false },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
}, { timestamps: true });

ContactMessageSchema.pre('validate', function syncLegacyState(next) {
    this.email = normalizeEmail(this.email);
    this.normalizedEmail = normalizeEmail(this.normalizedEmail || this.email);
    this.normalizedPhone = normalizePhone(this.normalizedPhone || this.phone);

    const hasCanonicalStatus = Boolean(this.status);
    if (!hasCanonicalStatus) {
        if (this.isReplied) this.status = 'replied';
        else if (this.isRead) this.status = 'opened';
        else this.status = 'new';
    }

    if (this.unreadByAdmin === undefined || this.unreadByAdmin === null) {
        this.unreadByAdmin = !Boolean(this.isRead);
    }

    if (this.adminOpenedAt === undefined) {
        this.adminOpenedAt = null;
    }

    if (!this.unreadByAdmin && !this.adminOpenedAt) {
        this.adminOpenedAt = this.updatedAt || new Date();
    }

    if (this.status === 'resolved' || this.status === 'archived') {
        this.unreadByAdmin = false;
    }

    this.isRead = !this.unreadByAdmin;
    this.isReplied = ['replied', 'resolved', 'archived'].includes(this.status);

    if (!this.unreadByAdmin && this.status === 'new') {
        this.status = 'opened';
    }

    if (this.unreadByAdmin && ['opened', 'resolved', 'archived'].includes(this.status)) {
        this.unreadByAdmin = false;
    }

    next();
});

ContactMessageSchema.index({ createdAt: -1 });
ContactMessageSchema.index({ status: 1, createdAt: -1 });
ContactMessageSchema.index({ unreadByAdmin: 1, createdAt: -1 });
ContactMessageSchema.index({ linkedUserId: 1, createdAt: -1 });
ContactMessageSchema.index({ linkedStudentId: 1, createdAt: -1 });

export default mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);
