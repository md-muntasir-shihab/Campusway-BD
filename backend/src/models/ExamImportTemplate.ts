import mongoose, { Document, Schema } from 'mongoose';

export interface IExamImportTemplate extends Document {
    name: string;
    description?: string;
    expectedColumns: string[];
    requiredColumns: string[];
    columnMapping: Record<string, string>;
    matchPriority: string[];
    profileUpdateFields: string[];
    recordOnlyFields: string[];
    isActive: boolean;
    createdBy?: mongoose.Types.ObjectId | null;
    updatedBy?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const ExamImportTemplateSchema = new Schema<IExamImportTemplate>({
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: '', trim: true },
    expectedColumns: { type: [String], default: [] },
    requiredColumns: { type: [String], default: [] },
    columnMapping: { type: Schema.Types.Mixed, default: {} },
    matchPriority: { type: [String], default: [] },
    profileUpdateFields: { type: [String], default: [] },
    recordOnlyFields: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, collection: 'exam_import_templates' });

ExamImportTemplateSchema.index({ isActive: 1, name: 1 });

export default mongoose.model<IExamImportTemplate>('ExamImportTemplate', ExamImportTemplateSchema);
