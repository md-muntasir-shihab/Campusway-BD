import mongoose, { Document, Schema } from 'mongoose';

export interface ITeamRole extends Document {
    name: string;
    slug: string;
    description: string;
    isSystemRole: boolean;
    isActive: boolean;
    basePlatformRole: 'superadmin' | 'admin' | 'moderator' | 'editor' | 'viewer' | 'support_agent' | 'finance_agent';
}

const TeamRoleSchema = new Schema<ITeamRole>(
    {
        name: { type: String, required: true, trim: true },
        slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
        description: { type: String, default: '', trim: true },
        isSystemRole: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
        basePlatformRole: {
            type: String,
            enum: ['superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent'],
            required: true,
            default: 'viewer',
        },
    },
    { timestamps: true, collection: 'team_roles' },
);

TeamRoleSchema.index({ isActive: 1 });

export default mongoose.model<ITeamRole>('TeamRole', TeamRoleSchema);
