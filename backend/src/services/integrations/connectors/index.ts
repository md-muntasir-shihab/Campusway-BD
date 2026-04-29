import type { IntegrationKey, IntegrationTestStatus } from '../../../models/IntegrationConfig';

/**
 * Per-integration connection-test functions. Each connector:
 *  - Receives the public `config` and decrypted `secrets` map.
 *  - Returns `{ status: 'success' | 'failed' | 'skipped', message }`.
 *  - MUST time-box network calls (8s default) and never throw out of the test.
 *  - MUST NOT perform any side-effecting writes against the remote service.
 *
 * No third-party SDKs are used here — `fetch`-style HTTP calls only — to avoid
 * adding heavy dependencies before an integration is actually wired into the
 * product. Real wiring happens in the per-integration phase that comes later.
 */

export interface ConnectorTestResult {
    status: IntegrationTestStatus;
    message: string;
}

const DEFAULT_TIMEOUT_MS = 8000;

async function fetchWithTimeout(
    url: string,
    init: { method?: string; headers?: Record<string, string>; body?: string; timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; statusText: string; bodyText: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
        // Use globalThis.fetch (Node 18+) so we don't pull in node-fetch typings.
        const res = await (globalThis as unknown as { fetch: typeof fetch }).fetch(url, {
            method: init.method ?? 'GET',
            headers: init.headers,
            body: init.body,
            signal: controller.signal,
        });
        const bodyText = await res.text().catch(() => '');
        return { ok: res.ok, status: res.status, statusText: res.statusText, bodyText: bodyText.slice(0, 200) };
    } finally {
        clearTimeout(timeout);
    }
}

function requireStrings(
    config: Record<string, unknown>,
    keys: string[],
): { ok: true; values: Record<string, string> } | { ok: false; missing: string[] } {
    const values: Record<string, string> = {};
    const missing: string[] = [];
    for (const k of keys) {
        const v = config[k];
        if (typeof v === 'string' && v.trim().length > 0) {
            values[k] = v.trim();
        } else {
            missing.push(k);
        }
    }
    if (missing.length > 0) return { ok: false, missing };
    return { ok: true, values };
}

async function testMeilisearch(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
): Promise<ConnectorTestResult> {
    const cfg = requireStrings(config, ['baseUrl']);
    if (!cfg.ok) return { status: 'failed', message: `Missing config: ${cfg.missing.join(', ')}` };
    const headers: Record<string, string> = {};
    const apiKey = secrets.masterKey || secrets.searchKey;
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    try {
        const res = await fetchWithTimeout(`${cfg.values.baseUrl.replace(/\/$/, '')}/health`, { headers });
        if (res.ok) return { status: 'success', message: `Reached Meilisearch (${res.status}).` };
        return { status: 'failed', message: `Meilisearch returned ${res.status} ${res.statusText}` };
    } catch (err) {
        return { status: 'failed', message: err instanceof Error ? err.message : 'Network error' };
    }
}

async function testImgproxy(config: Record<string, unknown>): Promise<ConnectorTestResult> {
    const cfg = requireStrings(config, ['baseUrl']);
    if (!cfg.ok) return { status: 'failed', message: `Missing config: ${cfg.missing.join(', ')}` };
    try {
        const res = await fetchWithTimeout(`${cfg.values.baseUrl.replace(/\/$/, '')}/health`);
        if (res.ok) return { status: 'success', message: `Reached imgproxy (${res.status}).` };
        return { status: 'failed', message: `imgproxy returned ${res.status} ${res.statusText}` };
    } catch (err) {
        return { status: 'failed', message: err instanceof Error ? err.message : 'Network error' };
    }
}

async function testListmonk(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
): Promise<ConnectorTestResult> {
    const cfg = requireStrings(config, ['baseUrl']);
    if (!cfg.ok) return { status: 'failed', message: `Missing config: ${cfg.missing.join(', ')}` };
    const headers: Record<string, string> = {};
    if (secrets.username && secrets.password) {
        const token = Buffer.from(`${secrets.username}:${secrets.password}`).toString('base64');
        headers.Authorization = `Basic ${token}`;
    }
    try {
        const res = await fetchWithTimeout(`${cfg.values.baseUrl.replace(/\/$/, '')}/api/health`, { headers });
        if (res.ok) return { status: 'success', message: `Reached Listmonk (${res.status}).` };
        return { status: 'failed', message: `Listmonk returned ${res.status} ${res.statusText}` };
    } catch (err) {
        return { status: 'failed', message: err instanceof Error ? err.message : 'Network error' };
    }
}

async function testMautic(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
): Promise<ConnectorTestResult> {
    const cfg = requireStrings(config, ['baseUrl']);
    if (!cfg.ok) return { status: 'failed', message: `Missing config: ${cfg.missing.join(', ')}` };
    const headers: Record<string, string> = {};
    if (secrets.username && secrets.password) {
        const token = Buffer.from(`${secrets.username}:${secrets.password}`).toString('base64');
        headers.Authorization = `Basic ${token}`;
    }
    try {
        const res = await fetchWithTimeout(`${cfg.values.baseUrl.replace(/\/$/, '')}/api/users/self`, { headers });
        if (res.ok) return { status: 'success', message: `Reached Mautic (${res.status}).` };
        return { status: 'failed', message: `Mautic returned ${res.status} ${res.statusText}` };
    } catch (err) {
        return { status: 'failed', message: err instanceof Error ? err.message : 'Network error' };
    }
}

async function testNovu(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
): Promise<ConnectorTestResult> {
    const baseUrl = (typeof config.baseUrl === 'string' && config.baseUrl) || 'https://api.novu.co';
    if (!secrets.apiKey) return { status: 'failed', message: 'Missing API key' };
    try {
        const res = await fetchWithTimeout(`${baseUrl.replace(/\/$/, '')}/v1/environments`, {
            headers: { Authorization: `ApiKey ${secrets.apiKey}` },
        });
        if (res.ok) return { status: 'success', message: `Reached Novu (${res.status}).` };
        return { status: 'failed', message: `Novu returned ${res.status} ${res.statusText}` };
    } catch (err) {
        return { status: 'failed', message: err instanceof Error ? err.message : 'Network error' };
    }
}

async function testUmami(config: Record<string, unknown>): Promise<ConnectorTestResult> {
    const cfg = requireStrings(config, ['baseUrl']);
    if (!cfg.ok) return { status: 'failed', message: `Missing config: ${cfg.missing.join(', ')}` };
    try {
        const res = await fetchWithTimeout(`${cfg.values.baseUrl.replace(/\/$/, '')}/api/heartbeat`);
        if (res.ok) return { status: 'success', message: `Reached Umami (${res.status}).` };
        return { status: 'failed', message: `Umami returned ${res.status} ${res.statusText}` };
    } catch (err) {
        return { status: 'failed', message: err instanceof Error ? err.message : 'Network error' };
    }
}

async function testPlausible(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
): Promise<ConnectorTestResult> {
    const baseUrl = (typeof config.baseUrl === 'string' && config.baseUrl) || 'https://plausible.io';
    if (!secrets.apiKey) return { status: 'failed', message: 'Missing API key' };
    try {
        const res = await fetchWithTimeout(`${baseUrl.replace(/\/$/, '')}/api/v1/sites`, {
            headers: { Authorization: `Bearer ${secrets.apiKey}` },
        });
        if (res.ok || res.status === 404) {
            return { status: 'success', message: `Reached Plausible (${res.status}).` };
        }
        return { status: 'failed', message: `Plausible returned ${res.status} ${res.statusText}` };
    } catch (err) {
        return { status: 'failed', message: err instanceof Error ? err.message : 'Network error' };
    }
}

async function testB2Backup(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
): Promise<ConnectorTestResult> {
    const cfg = requireStrings(config, ['endpoint', 'bucket']);
    if (!cfg.ok) return { status: 'failed', message: `Missing config: ${cfg.missing.join(', ')}` };
    if (!secrets.keyId || !secrets.applicationKey) {
        return { status: 'failed', message: 'Missing application key credentials' };
    }
    // Verify the endpoint is at least DNS-resolvable / reachable. A real signed
    // S3 HEAD is added when full backup wiring lands.
    try {
        const res = await fetchWithTimeout(cfg.values.endpoint, { method: 'HEAD' });
        if (res.status > 0) return { status: 'success', message: `Reached endpoint (${res.status}).` };
        return { status: 'failed', message: `Endpoint returned ${res.status}` };
    } catch (err) {
        return { status: 'failed', message: err instanceof Error ? err.message : 'Network error' };
    }
}

async function testSmtp(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
): Promise<ConnectorTestResult> {
    const cfg = requireStrings(config, ['host']);
    if (!cfg.ok) return { status: 'failed', message: `Missing config: ${cfg.missing.join(', ')}` };
    if (!secrets.username || !secrets.password) {
        return { status: 'skipped', message: 'No SMTP credentials configured.' };
    }
    // Real verify happens via nodemailer.transporter.verify() during send phase.
    // Connection-test here is config-shape-only to avoid opening SMTP sockets
    // from the admin request path.
    return { status: 'success', message: 'SMTP host and credentials look valid (no live verify).' };
}

async function testCloudinary(
    config: Record<string, unknown>,
    secrets: Record<string, string>,
): Promise<ConnectorTestResult> {
    const cfg = requireStrings(config, ['cloudName']);
    if (!cfg.ok) return { status: 'failed', message: `Missing config: ${cfg.missing.join(', ')}` };
    if (!secrets.apiKey || !secrets.apiSecret) {
        return { status: 'failed', message: 'Missing API key / secret' };
    }
    const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.values.cloudName)}/ping`;
    const token = Buffer.from(`${secrets.apiKey}:${secrets.apiSecret}`).toString('base64');
    try {
        const res = await fetchWithTimeout(url, { headers: { Authorization: `Basic ${token}` } });
        if (res.ok) return { status: 'success', message: `Reached Cloudinary (${res.status}).` };
        return { status: 'failed', message: `Cloudinary returned ${res.status} ${res.statusText}` };
    } catch (err) {
        return { status: 'failed', message: err instanceof Error ? err.message : 'Network error' };
    }
}

const TEST_DISPATCH: Record<
    IntegrationKey,
    (config: Record<string, unknown>, secrets: Record<string, string>) => Promise<ConnectorTestResult>
> = {
    meilisearch: testMeilisearch,
    imgproxy: (cfg) => testImgproxy(cfg),
    listmonk: testListmonk,
    mautic: testMautic,
    novu: testNovu,
    umami: (cfg) => testUmami(cfg),
    plausible: testPlausible,
    b2_backup: testB2Backup,
    smtp: testSmtp,
    cloudinary: testCloudinary,
};

export async function runConnectionTest(
    key: IntegrationKey,
    config: Record<string, unknown>,
    secrets: Record<string, string>,
): Promise<ConnectorTestResult> {
    const fn = TEST_DISPATCH[key];
    if (!fn) {
        return { status: 'failed', message: `No connector registered for "${key}".` };
    }
    return fn(config, secrets);
}
