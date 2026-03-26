import mongoose, { Document, Schema } from 'mongoose';

export interface INewsSystemSettings extends Document {
    key: string;
    config: Record<string, unknown>;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const NewsSystemSettingsSchema = new Schema<INewsSystemSettings>(
    {
        key: { type: String, required: true, unique: true, default: 'default' },
        config: { type: Schema.Types.Mixed, default: {} },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    {
        timestamps: true,
        collection: 'news_system_settings',
    }
);

export default mongoose.model<INewsSystemSettings>('NewsSystemSettings', NewsSystemSettingsSchema);

