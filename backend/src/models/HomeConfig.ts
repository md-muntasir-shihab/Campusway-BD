import mongoose, { Schema, Document } from 'mongoose';

export interface IHomeSection extends Document {
    id: string; // e.g., 'hero', 'stats', 'featured', 'grid'
    title: string;
    isActive: boolean;
    order: number;
    config?: Record<string, any>;
}

export interface IHomeConfig extends Document {
    sections: IHomeSection[];
    activeTheme: 'light' | 'dark' | 'system';
    selectedUniversityCategories: string[];
    highlightCategoryIds: string[];
    updatedBy: mongoose.Types.ObjectId;
}

const HomeSectionSchema = new Schema({
    id: { type: String, required: true },
    title: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    config: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const HomeConfigSchema = new Schema({
    sections: [HomeSectionSchema],
    activeTheme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
    selectedUniversityCategories: { type: [String], default: [] },
    highlightCategoryIds: { type: [String], default: [] },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<IHomeConfig>('HomeConfig', HomeConfigSchema);
