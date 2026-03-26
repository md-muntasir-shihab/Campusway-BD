import mongoose, { Schema, Document } from 'mongoose';

export interface INewsCategory extends Document {
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const NewsCategorySchema = new Schema<INewsCategory>({
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model<INewsCategory>('NewsCategory', NewsCategorySchema);
