import mongoose, { Document, Schema } from 'mongoose';

export interface IExamMappingProfile extends Document {
    name: string;
    description?: string;
    matchPriority: string[];
    fieldMapping: Record<string, string>;
    requiredColumns: string[];
    isActive: boolean;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const ExamMappingProfileSchema = new Schema<IExamMappingProfile>({
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '', trim: true },
    matchPriority: { type: [String], default: [] },
    fieldMapping: { type: Schema.Types.Mixed, default: {} },
    requiredColumns: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, collection: 'exam_mapping_profiles' });

ExamMappingProfileSchema.index({ isActive: 1, name: 1 });

export default mongoose.model<IExamMappingProfile>('ExamMappingProfile', ExamMappingProfileSchema);
