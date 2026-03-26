import mongoose, { Document, Schema } from 'mongoose';

export type SecureUploadVisibility = 'public' | 'protected';
export type SecureUploadCategory =
    | 'profile_photo'
    | 'student_document'
    | 'payment_proof'
    | 'support_attachment'
    | 'exam_upload'
    | 'admin_upload';

export interface ISecureUpload extends Document {
    ownerUserId?: mongoose.Types.ObjectId | null;
    ownerRole?: string | null;
    category: SecureUploadCategory;
    visibility: SecureUploadVisibility;
    originalName: string;
    storedName: string;
    storagePath: string;
    mimeType: string;
    extension: string;
    sizeBytes: number;
    fileHash: string;
    uploadedBy?: mongoose.Types.ObjectId | null;
    accessRoles: string[];
    downloadCount: number;
    lastDownloadedAt?: Date | null;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

const SecureUploadSchema = new Schema<ISecureUpload>(
    {
        ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
        ownerRole: { type: String, trim: true, default: null },
        category: {
            type: String,
            required: true,
            enum: ['profile_photo', 'student_document', 'payment_proof', 'support_attachment', 'exam_upload', 'admin_upload'],
            index: true,
        },
        visibility: { type: String, required: true, enum: ['public', 'protected'], default: 'protected', index: true },
        originalName: { type: String, required: true, trim: true },
        storedName: { type: String, required: true, trim: true, unique: true },
        storagePath: { type: String, required: true, trim: true },
        mimeType: { type: String, required: true, trim: true },
        extension: { type: String, required: true, trim: true },
        sizeBytes: { type: Number, required: true, min: 0 },
        fileHash: { type: String, required: true, trim: true, index: true },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        accessRoles: { type: [String], default: [] },
        downloadCount: { type: Number, default: 0, min: 0 },
        lastDownloadedAt: { type: Date, default: null },
        deletedAt: { type: Date, default: null },
    },
    {
        timestamps: true,
        collection: 'secure_uploads',
    },
);

SecureUploadSchema.index({ ownerUserId: 1, category: 1, visibility: 1, createdAt: -1 });

export default mongoose.model<ISecureUpload>('SecureUpload', SecureUploadSchema);
