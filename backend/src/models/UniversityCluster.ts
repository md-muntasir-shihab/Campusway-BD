import mongoose, { Document, Schema } from 'mongoose';
import type { IExamCenter } from './University';

export interface IUniversityClusterDateConfig {
    applicationStartDate?: Date | null;
    applicationEndDate?: Date | null;
    scienceExamDate?: string;
    commerceExamDate?: string;
    artsExamDate?: string;
    admissionWebsite?: string;
    examCenters: IExamCenter[];
}

export interface IUniversityCluster extends Document {
    name: string;
    slug: string;
    description?: string;
    isActive: boolean;
    memberUniversityIds: mongoose.Types.ObjectId[];
    categoryRules: string[];
    categoryRuleIds: mongoose.Types.ObjectId[];
    dates: IUniversityClusterDateConfig;
    syncPolicy: 'inherit_with_override';
    homeVisible: boolean;
    homeOrder: number;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const ExamCenterSchema = new Schema<IExamCenter>({
    city: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
}, { _id: false });

const UniversityClusterDateConfigSchema = new Schema<IUniversityClusterDateConfig>({
    applicationStartDate: { type: Date, default: null },
    applicationEndDate: { type: Date, default: null },
    scienceExamDate: { type: String, default: '' },
    commerceExamDate: { type: String, default: '' },
    artsExamDate: { type: String, default: '' },
    admissionWebsite: { type: String, default: '' },
    examCenters: { type: [ExamCenterSchema], default: [] },
}, { _id: false });

const UniversityClusterSchema = new Schema<IUniversityCluster>({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    memberUniversityIds: { type: [{ type: Schema.Types.ObjectId, ref: 'University' }], default: [] },
    categoryRules: { type: [String], default: [] },
    categoryRuleIds: { type: [{ type: Schema.Types.ObjectId, ref: 'UniversityCategory' }], default: [] },
    dates: { type: UniversityClusterDateConfigSchema, default: () => ({}) },
    syncPolicy: { type: String, enum: ['inherit_with_override'], default: 'inherit_with_override' },
    homeVisible: { type: Boolean, default: false },
    homeOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

UniversityClusterSchema.index({ isActive: 1, homeVisible: 1, homeOrder: 1 });
UniversityClusterSchema.index({ categoryRuleIds: 1 });

export default mongoose.model<IUniversityCluster>('UniversityCluster', UniversityClusterSchema);
