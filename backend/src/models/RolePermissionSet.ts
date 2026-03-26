import mongoose, { Document, Schema } from 'mongoose';

export interface IRolePermissionSet extends Document {
    roleId: mongoose.Types.ObjectId;
    modulePermissions: Record<string, Record<string, boolean>>;
}

const RolePermissionSetSchema = new Schema<IRolePermissionSet>(
    {
        roleId: { type: Schema.Types.ObjectId, ref: 'TeamRole', required: true, unique: true, index: true },
        modulePermissions: { type: Schema.Types.Mixed, required: true, default: {} },
    },
    { timestamps: true, collection: 'team_role_permission_sets' },
);

export default mongoose.model<IRolePermissionSet>('RolePermissionSet', RolePermissionSetSchema);
