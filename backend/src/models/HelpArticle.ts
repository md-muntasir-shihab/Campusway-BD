import mongoose, { Document, Schema } from 'mongoose';

export interface IHelpArticle extends Document {
    title: string;
    slug: string;
    categoryId: mongoose.Types.ObjectId;
    shortDescription: string;
    fullContent: string;
    tags: string[];
    isPublished: boolean;
    isFeatured: boolean;
    relatedArticleIds: mongoose.Types.ObjectId[];
    viewsCount: number;
    helpfulCount: number;
    notHelpfulCount: number;
    createdByAdminId: mongoose.Types.ObjectId;
    lastEditedByAdminId?: mongoose.Types.ObjectId;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const HelpArticleSchema = new Schema<IHelpArticle>(
    {
        title: { type: String, required: true, maxlength: 200 },
        slug: { type: String, required: true, unique: true, maxlength: 250 },
        categoryId: { type: Schema.Types.ObjectId, ref: 'HelpCategory', required: true },
        shortDescription: { type: String, required: true, maxlength: 500 },
        fullContent: { type: String, required: true, maxlength: 50000 },
        tags: [{ type: String, maxlength: 50 }],
        isPublished: { type: Boolean, default: false },
        isFeatured: { type: Boolean, default: false },
        relatedArticleIds: [{ type: Schema.Types.ObjectId, ref: 'HelpArticle' }],
        viewsCount: { type: Number, default: 0 },
        helpfulCount: { type: Number, default: 0 },
        notHelpfulCount: { type: Number, default: 0 },
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        lastEditedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
        publishedAt: { type: Date },
    },
    { timestamps: true, collection: 'help_articles' },
);

HelpArticleSchema.index({ categoryId: 1, isPublished: 1 });
HelpArticleSchema.index({ isPublished: 1, isFeatured: -1, createdAt: -1 });
HelpArticleSchema.index({ tags: 1 });

export default mongoose.model<IHelpArticle>('HelpArticle', HelpArticleSchema);
