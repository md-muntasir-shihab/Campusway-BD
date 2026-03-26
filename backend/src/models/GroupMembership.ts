import mongoose, { Document, Schema } from 'mongoose';

export type MembershipStatus = 'active' | 'removed' | 'archived';

export interface IGroupMembership extends Document {
    groupId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    addedByAdminId?: mongoose.Types.ObjectId;
    membershipStatus: MembershipStatus;
    joinedAtUTC: Date;
    removedAtUTC?: Date;
    note?: string;
    createdAt: Date;
    updatedAt: Date;
}

const GroupMembershipSchema = new Schema<IGroupMembership>(
    {
        groupId: { type: Schema.Types.ObjectId, ref: 'StudentGroup', required: true },
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        addedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
        membershipStatus: {
            type: String,
            enum: ['active', 'removed', 'archived'],
            default: 'active',
            required: true,
        },
        joinedAtUTC: { type: Date, default: Date.now },
        removedAtUTC: { type: Date },
        note: { type: String, trim: true, default: '' },
    },
    {
        timestamps: true,
        collection: 'group_memberships',
    }
);

// Unique active membership per student-group pair
GroupMembershipSchema.index(
    { groupId: 1, studentId: 1, membershipStatus: 1 },
    { unique: true, partialFilterExpression: { membershipStatus: 'active' } }
);
GroupMembershipSchema.index({ studentId: 1, membershipStatus: 1 });
GroupMembershipSchema.index({ groupId: 1, membershipStatus: 1 });
GroupMembershipSchema.index({ groupId: 1, joinedAtUTC: -1 });

export default mongoose.model<IGroupMembership>('GroupMembership', GroupMembershipSchema);
