import mongoose, { Document, Schema } from 'mongoose';

export type ImportExportDirection = 'import' | 'export';
export type ImportExportCategory =
    | 'students'
    | 'guardians'
    | 'phone_list'
    | 'email_list'
    | 'audience_segment'
    | 'result_recipients'
    | 'failed_deliveries'
    | 'manual_send_list'
    | 'notification_logs'
    | 'other';

export type ImportExportFormat = 'xlsx' | 'csv' | 'txt' | 'json' | 'vcf' | 'clipboard';

export interface IImportExportLog extends Document {
    direction: ImportExportDirection;
    category: ImportExportCategory;
    format: ImportExportFormat;
    performedBy: mongoose.Types.ObjectId;
    totalRows: number;
    successRows: number;
    failedRows: number;
    filters?: Record<string, unknown>;
    selectedFields?: string[];
    fileName?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ImportExportLogSchema = new Schema<IImportExportLog>(
    {
        direction: { type: String, enum: ['import', 'export'], required: true },
        category: {
            type: String,
            enum: [
                'students', 'guardians', 'phone_list', 'email_list',
                'audience_segment', 'result_recipients', 'failed_deliveries',
                'manual_send_list', 'notification_logs', 'other',
            ],
            required: true,
        },
        format: {
            type: String,
            enum: ['xlsx', 'csv', 'txt', 'json', 'vcf', 'clipboard'],
            required: true,
        },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        totalRows: { type: Number, default: 0 },
        successRows: { type: Number, default: 0 },
        failedRows: { type: Number, default: 0 },
        filters: { type: Schema.Types.Mixed },
        selectedFields: [{ type: String }],
        fileName: { type: String, trim: true },
        notes: { type: String, trim: true },
    },
    { timestamps: true },
);

ImportExportLogSchema.index({ direction: 1, category: 1, createdAt: -1 });
ImportExportLogSchema.index({ performedBy: 1, createdAt: -1 });

export default mongoose.model<IImportExportLog>('ImportExportLog', ImportExportLogSchema);
