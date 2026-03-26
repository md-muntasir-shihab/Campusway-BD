import mongoose, { Document, Schema } from 'mongoose';

export interface ICredentialVault extends Document {
    user_id: mongoose.Types.ObjectId;
    password_ciphertext: string;
    last_rotated_at?: Date | null;
    updated_by?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const CredentialVaultSchema = new Schema<ICredentialVault>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        password_ciphertext: { type: String, required: true, trim: true },
        last_rotated_at: { type: Date, default: null },
        updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true, collection: 'credential_vault' },
);

export default mongoose.model<ICredentialVault>('CredentialVault', CredentialVaultSchema);
