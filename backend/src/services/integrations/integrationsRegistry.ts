import type { IntegrationCategory, IntegrationKey } from '../../models/IntegrationConfig';

/**
 * Static registry describing every supported external integration. The
 * IntegrationConfig collection is seeded from this list on first boot, but the
 * **runtime source of truth** for `enabled` and credentials is the database.
 *
 * `configFields` describes the public, non-sensitive shape of `config`.
 * `secretFields` lists the names of fields that, when written, must be
 * AES-encrypted into `credentialsEncrypted` (as a JSON blob) — they are NEVER
 * returned to the client.
 *
 * Default `enabled: false` for every integration is a hard rule from the
 * implementation prompt. Do not change this without updating the spec.
 */
export interface IntegrationDescriptor {
    key: IntegrationKey;
    displayName: string;
    category: IntegrationCategory;
    description: string;
    docsUrl?: string;
    configFields: Array<{
        name: string;
        label: string;
        type: 'text' | 'url' | 'number' | 'boolean' | 'multitext';
        required?: boolean;
        placeholder?: string;
        helpText?: string;
    }>;
    secretFields: Array<{
        name: string;
        label: string;
        helpText?: string;
    }>;
}

export const INTEGRATIONS_REGISTRY: IntegrationDescriptor[] = [
    {
        key: 'meilisearch',
        displayName: 'Meilisearch',
        category: 'search',
        description: 'Self-hosted typo-tolerant search. Optional. Falls back to MongoDB regex search when disabled.',
        docsUrl: 'https://www.meilisearch.com/docs',
        configFields: [
            { name: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://search.example.com' },
            { name: 'indexPrefix', label: 'Index prefix', type: 'text', placeholder: 'campusway_' },
        ],
        secretFields: [
            { name: 'masterKey', label: 'Master key', helpText: 'Used only by admin reindex jobs.' },
            { name: 'searchKey', label: 'Search key', helpText: 'Used by user-facing search.' },
        ],
    },
    {
        key: 'imgproxy',
        displayName: 'imgproxy',
        category: 'image',
        description: 'On-the-fly image resizing/cropping proxy. Remote-URL fetching is OFF by default.',
        docsUrl: 'https://docs.imgproxy.net',
        configFields: [
            { name: 'baseUrl', label: 'Base URL', type: 'url' },
            { name: 'allowRemote', label: 'Allow remote URL fetching', type: 'boolean', helpText: 'Disabled by default. When enabled, only allowlisted HTTPS domains are permitted.' },
            { name: 'allowedDomains', label: 'Allowlisted HTTPS domains (newline-separated)', type: 'multitext' },
        ],
        secretFields: [
            { name: 'signingKey', label: 'Signing key (hex)' },
            { name: 'signingSalt', label: 'Signing salt (hex)' },
        ],
    },
    {
        key: 'listmonk',
        displayName: 'Listmonk',
        category: 'email',
        description: 'Self-hosted newsletter platform. Subscriber sync respects user consent/unsubscribe.',
        docsUrl: 'https://listmonk.app',
        configFields: [
            { name: 'baseUrl', label: 'Base URL', type: 'url' },
            { name: 'defaultListId', label: 'Default list ID', type: 'number' },
        ],
        secretFields: [
            { name: 'username', label: 'API username' },
            { name: 'password', label: 'API password' },
        ],
    },
    {
        key: 'mautic',
        displayName: 'Mautic',
        category: 'marketing',
        description: 'Marketing automation. Subscriber sync respects user consent/unsubscribe.',
        docsUrl: 'https://www.mautic.org',
        configFields: [
            { name: 'baseUrl', label: 'Base URL', type: 'url' },
        ],
        secretFields: [
            { name: 'username', label: 'API username' },
            { name: 'password', label: 'API password' },
        ],
    },
    {
        key: 'novu',
        displayName: 'Novu',
        category: 'notifications',
        description: 'Multi-channel notification orchestration. Coexists with the existing notification provider system.',
        docsUrl: 'https://docs.novu.co',
        configFields: [
            { name: 'baseUrl', label: 'API base URL', type: 'url', placeholder: 'https://api.novu.co' },
            { name: 'environmentId', label: 'Environment ID', type: 'text' },
        ],
        secretFields: [
            { name: 'apiKey', label: 'API key' },
        ],
    },
    {
        key: 'umami',
        displayName: 'Umami',
        category: 'analytics',
        description: 'Privacy-friendly web analytics. PII MUST NEVER be sent in event payloads.',
        docsUrl: 'https://umami.is/docs',
        configFields: [
            { name: 'baseUrl', label: 'Base URL', type: 'url' },
            { name: 'websiteId', label: 'Website ID', type: 'text' },
        ],
        secretFields: [],
    },
    {
        key: 'plausible',
        displayName: 'Plausible',
        category: 'analytics',
        description: 'Alternative privacy-friendly analytics. Mutually exclusive in practice with Umami.',
        docsUrl: 'https://plausible.io/docs',
        configFields: [
            { name: 'baseUrl', label: 'Base URL', type: 'url', placeholder: 'https://plausible.io' },
            { name: 'domain', label: 'Tracked domain', type: 'text' },
        ],
        secretFields: [
            { name: 'apiKey', label: 'API key' },
        ],
    },
    {
        key: 'b2_backup',
        displayName: 'Backblaze B2 (backup mirror)',
        category: 'backup',
        description: 'Off-site backup destination. Used by mongodump cron job. SFTP destination is a future add.',
        docsUrl: 'https://www.backblaze.com/docs/cloud-storage',
        configFields: [
            { name: 'endpoint', label: 'S3-compatible endpoint URL', type: 'url' },
            { name: 'bucket', label: 'Bucket name', type: 'text' },
            { name: 'region', label: 'Region', type: 'text', placeholder: 'us-west-001' },
        ],
        secretFields: [
            { name: 'keyId', label: 'Application key ID' },
            { name: 'applicationKey', label: 'Application key' },
        ],
    },
    {
        key: 'smtp',
        displayName: 'Generic SMTP',
        category: 'email',
        description: 'Outbound email via Brevo, Mailgun, SendGrid, Gmail, or any SMTP provider. Uses existing Nodemailer.',
        configFields: [
            { name: 'host', label: 'SMTP host', type: 'text' },
            { name: 'port', label: 'SMTP port', type: 'number', placeholder: '587' },
            { name: 'secure', label: 'Use TLS (port 465)', type: 'boolean' },
            { name: 'fromAddress', label: 'From address', type: 'text', placeholder: 'no-reply@example.com' },
            { name: 'fromName', label: 'From name', type: 'text' },
        ],
        secretFields: [
            { name: 'username', label: 'SMTP username' },
            { name: 'password', label: 'SMTP password' },
        ],
    },
    {
        key: 'cloudinary',
        displayName: 'Cloudinary',
        category: 'storage',
        description: 'Hosted image storage and transformation. Used as an alternative to local /uploads or imgproxy.',
        docsUrl: 'https://cloudinary.com/documentation',
        configFields: [
            { name: 'cloudName', label: 'Cloud name', type: 'text' },
        ],
        secretFields: [
            { name: 'apiKey', label: 'API key' },
            { name: 'apiSecret', label: 'API secret' },
        ],
    },
];

export function getDescriptor(key: IntegrationKey): IntegrationDescriptor | undefined {
    return INTEGRATIONS_REGISTRY.find((d) => d.key === key);
}

export const INTEGRATION_KEYS: IntegrationKey[] = INTEGRATIONS_REGISTRY.map((d) => d.key);
