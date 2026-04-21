import mongoose, { Document, Schema } from 'mongoose';

export interface ILegalPage extends Document {
    slug: string;
    title: string;
    htmlContent: string;
    metaTitle: string;
    metaDescription: string;
    lastUpdatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const LegalPageSchema = new Schema<ILegalPage>(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        },
        title: { type: String, required: true, trim: true },
        htmlContent: { type: String, default: '' },
        metaTitle: { type: String, default: '' },
        metaDescription: { type: String, default: '' },
        lastUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true, collection: 'legal_pages' },
);

LegalPageSchema.index({ slug: 1 });

export default mongoose.model<ILegalPage>('LegalPage', LegalPageSchema);
