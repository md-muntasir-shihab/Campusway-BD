import mongoose, { Document, Schema } from 'mongoose';

/**
 * IntegrationConfig — registry document for one external integration (search,
 * image proxy, email, marketing automation, notifications, analytics, backup,
 * etc).
 *
 * Design rules:
 * - All integrations are DISABLED by default (`enabled: false`).
 * - Secrets MUST be encrypted via `services/cryptoService.encrypt` before being
 *   written to `credentialsEncrypted`. The plaintext NEVER touches MongoDB.
 * - Public, non-sensitive config (base URLs, region, allowlists, index names)
 *   lives in `config` and may be returned to admin clients.
 * - `lastTestStatus` records the result of the most recent admin-triggered
 *   connection test so the UI can surface health without re-testing.
 *
 * @collection integration_configs
 */
export type IntegrationKey =
    | 'meilisearch'
    | 'imgproxy'
    | 'listmonk'
    | 'mautic'
    | 'novu'
    | 'umami'
    | 'plausible'
    | 'b2_backup'
    | 'smtp'
    | 'cloudinary';

export type IntegrationCategory =
    | 'search'
    | 'image'
    | 'email'
    | 'marketing'
    | 'notifications'
    | 'analytics'
    | 'backup'
    | 'storage';

export type IntegrationTestStatus = 'unknown' | 'success' | 'failed' | 'skipped';

export interface IIntegrationConfig extends Document {
    key: IntegrationKey;
    displayName: string;
    category: IntegrationCategory;
    description: string;
    enabled: boolean;
    config: Record<string, unknown>;
    credentialsEncrypted: string | null;
    lastTestedAt: Date | null;
    lastTestStatus: IntegrationTestStatus;
    lastTestMessage: string;
    updatedBy: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const IntegrationConfigSchema = new Schema<IIntegrationConfig>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
            enum: [
                'meilisearch',
                'imgproxy',
                'listmonk',
                'mautic',
                'novu',
                'umami',
                'plausible',
                'b2_backup',
                'smtp',
                'cloudinary',
            ],
        },
        displayName: { type: String, required: true, trim: true },
        category: {
            type: String,
            required: true,
            enum: ['search', 'image', 'email', 'marketing', 'notifications', 'analytics', 'backup', 'storage'],
        },
        description: { type: String, default: '', trim: true },
        enabled: { type: Boolean, default: false, index: true },
        config: { type: Schema.Types.Mixed, default: {} },
        credentialsEncrypted: { type: String, default: null },
        lastTestedAt: { type: Date, default: null },
        lastTestStatus: {
            type: String,
            enum: ['unknown', 'success', 'failed', 'skipped'],
            default: 'unknown',
        },
        lastTestMessage: { type: String, default: '', trim: true },
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true, collection: 'integration_configs' },
);

export default mongoose.model<IIntegrationConfig>('IntegrationConfig', IntegrationConfigSchema);
