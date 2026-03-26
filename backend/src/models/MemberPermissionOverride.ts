import mongoose, { Document, Schema } from 'mongoose';

export interface IMemberPermissionOverride extends Document {
    memberId: mongoose.Types.ObjectId;
    allow: Record<string, Record<string, boolean>>;
    deny: Record<string, Record<string, boolean>>;
}

const MemberPermissionOverrideSchema = new Schema<IMemberPermissionOverride>(
    {
        memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        allow: { type: Schema.Types.Mixed, default: {} },
        deny: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true, collection: 'team_member_permission_overrides' },
);

export default mongoose.model<IMemberPermissionOverride>('MemberPermissionOverride', MemberPermissionOverrideSchema);
