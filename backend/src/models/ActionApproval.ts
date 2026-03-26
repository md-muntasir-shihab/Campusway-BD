import mongoose, { Document, Schema } from 'mongoose';
import { RiskyActionKey } from './SecuritySettings';

export type ActionApprovalStatus =
    | 'pending_second_approval'
    | 'approved'
    | 'rejected'
    | 'executed'
    | 'expired';

export interface IActionApproval extends Document {
    actionKey: RiskyActionKey;
    module: string;
    action: string;
    status: ActionApprovalStatus;
    initiatedBy: mongoose.Types.ObjectId;
    initiatedByRole: string;
    secondApprover?: mongoose.Types.ObjectId | null;
    secondApproverRole?: string;
    routePath: string;
    method: string;
    paramsSnapshot: Record<string, unknown>;
    querySnapshot: Record<string, unknown>;
    payloadSnapshot: Record<string, unknown>;
    decisionReason?: string;
    initiatedAt: Date;
    decidedAt?: Date | null;
    executedAt?: Date | null;
    expiresAt: Date;
    executionMeta?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const ActionApprovalSchema = new Schema<IActionApproval>(
    {
        actionKey: {
            type: String,
            enum: [
                'students.bulk_delete',
                'universities.bulk_delete',
                'news.bulk_delete',
                'exams.publish_result',
                'news.publish_breaking',
                'payments.mark_refunded',
            ],
            required: true,
            index: true,
        },
        module: { type: String, required: true, trim: true, index: true },
        action: { type: String, required: true, trim: true, index: true },
        status: {
            type: String,
            enum: ['pending_second_approval', 'approved', 'rejected', 'executed', 'expired'],
            default: 'pending_second_approval',
            index: true,
        },
        initiatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        initiatedByRole: { type: String, required: true, trim: true },
        secondApprover: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        secondApproverRole: { type: String, default: '' },
        routePath: { type: String, required: true, trim: true },
        method: { type: String, required: true, trim: true },
        paramsSnapshot: { type: Schema.Types.Mixed, default: {} },
        querySnapshot: { type: Schema.Types.Mixed, default: {} },
        payloadSnapshot: { type: Schema.Types.Mixed, default: {} },
        decisionReason: { type: String, default: '' },
        initiatedAt: { type: Date, default: Date.now },
        decidedAt: { type: Date, default: null },
        executedAt: { type: Date, default: null },
        expiresAt: { type: Date, required: true, index: true },
        executionMeta: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true, collection: 'action_approvals' },
);

ActionApprovalSchema.index({ status: 1, expiresAt: 1 });
ActionApprovalSchema.index({ actionKey: 1, status: 1, createdAt: -1 });

export default mongoose.model<IActionApproval>('ActionApproval', ActionApprovalSchema);
