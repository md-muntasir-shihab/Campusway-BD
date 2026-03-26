import mongoose, { Document, Schema } from 'mongoose';

export interface IHelpCategory extends Document {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    isActive: boolean;
    displayOrder: number;
    articleCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const HelpCategorySchema = new Schema<IHelpCategory>(
    {
        name: { type: String, required: true, maxlength: 120 },
        slug: { type: String, required: true, unique: true, maxlength: 150 },
        description: { type: String, maxlength: 500 },
        icon: { type: String, maxlength: 60 },
        isActive: { type: Boolean, default: true },
        displayOrder: { type: Number, default: 0 },
        articleCount: { type: Number, default: 0 },
    },
    { timestamps: true, collection: 'help_categories' },
);

HelpCategorySchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model<IHelpCategory>('HelpCategory', HelpCategorySchema);
