import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceCategory extends Document {
    name_bn: string;
    name_en: string;
    status: 'active' | 'inactive';
    order_index: number;
    createdAt: Date;
    updatedAt: Date;
}

const ServiceCategorySchema = new Schema<IServiceCategory>({
    name_bn: { type: String, required: true, trim: true },
    name_en: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
    order_index: { type: Number, default: 0, index: true }
}, { timestamps: true });

export default mongoose.model<IServiceCategory>('ServiceCategory', ServiceCategorySchema);
