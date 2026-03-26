import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamApprovalRule extends Document {
    module: string;
    action: string;
    requiresApproval: boolean;
    requiredApprovals: number;
    description: string;
    approverRoleIds: mongoose.Types.ObjectId[];
}

const TeamApprovalRuleSchema = new Schema<ITeamApprovalRule>(
    {
        module: { type: String, required: true, trim: true, lowercase: true, index: true },
        action: { type: String, required: true, trim: true, lowercase: true, index: true },
        requiresApproval: { type: Boolean, default: true },
        requiredApprovals: { type: Number, default: 1, min: 1 },
        description: { type: String, trim: true, default: '' },
        approverRoleIds: [{ type: Schema.Types.ObjectId, ref: 'TeamRole' }],
    },
    { timestamps: true, collection: 'team_approval_rules' },
);

TeamApprovalRuleSchema.index({ module: 1, action: 1 }, { unique: true });

export default mongoose.model<ITeamApprovalRule>('TeamApprovalRule', TeamApprovalRuleSchema);
