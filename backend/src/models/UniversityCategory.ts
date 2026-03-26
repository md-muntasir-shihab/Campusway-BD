import mongoose, { Document, Schema } from 'mongoose';
import type { IExamCenter } from './University';

export interface IUniversityCategorySharedConfig {
    applicationStartDate?: Date | null;
    applicationEndDate?: Date | null;
    scienceExamDate?: string;
    artsExamDate?: string;
    businessExamDate?: string;
    examCenters: IExamCenter[];
}

export interface IUniversityCategorySyncMeta {
    lastSyncedAt?: Date | null;
    lastSyncedBy?: mongoose.Types.ObjectId | null;
    lastSyncedCount?: number;
    skippedCount?: number;
}

export interface IUniversityCategory extends Document {
    name: string;
    slug: string;
    labelBn?: string;
    labelEn?: string;
    colorToken?: string;
    icon?: string;
    isActive: boolean;
    homeHighlight: boolean;
    homeOrder: number;
    sharedConfig: IUniversityCategorySharedConfig;
    syncMeta: IUniversityCategorySyncMeta;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const ExamCenterSchema = new Schema<IExamCenter>({
    city: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
}, { _id: false });

const SharedConfigSchema = new Schema<IUniversityCategorySharedConfig>({
    applicationStartDate: { type: Date, default: null },
    applicationEndDate: { type: Date, default: null },
    scienceExamDate: { type: String, default: '' },
    artsExamDate: { type: String, default: '' },
    businessExamDate: { type: String, default: '' },
    examCenters: { type: [ExamCenterSchema], default: [] },
}, { _id: false });

const SyncMetaSchema = new Schema<IUniversityCategorySyncMeta>({
    lastSyncedAt: { type: Date, default: null },
    lastSyncedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lastSyncedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
}, { _id: false });

const UniversityCategorySchema = new Schema<IUniversityCategory>({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    labelBn: { type: String, default: '' },
    labelEn: { type: String, default: '' },
    colorToken: { type: String, default: '' },
    icon: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    homeHighlight: { type: Boolean, default: false },
    homeOrder: { type: Number, default: 0 },
    sharedConfig: { type: SharedConfigSchema, default: () => ({}) },
    syncMeta: { type: SyncMetaSchema, default: () => ({}) },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

UniversityCategorySchema.index({ isActive: 1, homeHighlight: 1, homeOrder: 1 });
UniversityCategorySchema.index({ name: 1 }, { unique: true });

export default mongoose.model<IUniversityCategory>('UniversityCategory', UniversityCategorySchema);
