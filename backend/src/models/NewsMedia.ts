import mongoose, { Document, Schema } from 'mongoose';

export interface INewsMedia extends Document {
    url: string;
    storageKey?: string;
    mimeType?: string;
    size?: number;
    width?: number;
    height?: number;
    altText?: string;
    sourceType: 'upload' | 'url' | 'rss';
    isDefaultBanner: boolean;
    uploadedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const NewsMediaSchema = new Schema<INewsMedia>(
    {
        url: { type: String, required: true, trim: true },
        storageKey: { type: String, default: '' },
        mimeType: { type: String, default: '' },
        size: { type: Number, default: 0 },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        altText: { type: String, default: '' },
        sourceType: { type: String, enum: ['upload', 'url', 'rss'], required: true, default: 'upload' },
        isDefaultBanner: { type: Boolean, default: false },
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    {
        timestamps: true,
        collection: 'news_media',
    }
);

NewsMediaSchema.index({ createdAt: -1 });
NewsMediaSchema.index({ isDefaultBanner: 1 });

export default mongoose.model<INewsMedia>('NewsMedia', NewsMediaSchema);

