import mongoose, { Schema, Document } from 'mongoose';

export interface IService extends Document {
    title_bn: string;
    title_en: string;
    description_bn?: string;
    description_en?: string;
    icon_url?: string;
    banner_image?: string;
    category?: mongoose.Types.ObjectId;
    is_active: boolean;
    is_featured: boolean;
    display_order: number;
    button_text?: string;
    button_link?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ServiceSchema = new Schema<IService>({
    title_bn: { type: String, required: true, trim: true },
    title_en: { type: String, required: true, trim: true },
    description_bn: { type: String, default: '' },
    description_en: { type: String, default: '' },
    icon_url: { type: String, default: '' },
    banner_image: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', index: true },
    is_active: { type: Boolean, default: true, index: true },
    is_featured: { type: Boolean, default: false, index: true },
    display_order: { type: Number, default: 0, index: true },
    button_text: { type: String, default: '' },
    button_link: { type: String, default: '' }
}, {
    timestamps: true
});

export default mongoose.model<IService>('Service', ServiceSchema);
