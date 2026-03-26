import mongoose, { Document, Schema } from 'mongoose';

export type TeamInviteStatus = 'draft' | 'pending' | 'sent' | 'accepted' | 'expired' | 'cancelled';

export interface ITeamInvite extends Document {
    memberId?: mongoose.Types.ObjectId;
    fullName: string;
    email: string;
    phone?: string;
    roleId: mongoose.Types.ObjectId;
    status: TeamInviteStatus;
    invitedBy: mongoose.Types.ObjectId;
    expiresAt?: Date;
    notes?: string;
}

const TeamInviteSchema = new Schema<ITeamInvite>(
    {
        memberId: { type: Schema.Types.ObjectId, ref: 'User' },
        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true, index: true },
        phone: { type: String, trim: true },
        roleId: { type: Schema.Types.ObjectId, ref: 'TeamRole', required: true },
        status: { type: String, enum: ['draft', 'pending', 'sent', 'accepted', 'expired', 'cancelled'], default: 'pending' },
        invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        expiresAt: { type: Date },
        notes: { type: String, trim: true },
    },
    { timestamps: true, collection: 'team_invites' },
);

TeamInviteSchema.index({ email: 1, status: 1 });

export default mongoose.model<ITeamInvite>('TeamInvite', TeamInviteSchema);
