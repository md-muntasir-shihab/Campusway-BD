const INVALID_LINK_VALUES = new Set([
    '',
    '#',
    'n/a',
    'na',
    '-',
    'null',
    'undefined',
    'none',
]);

export function normalizeExternalUrl(raw?: string | null): string | null {
    const value = String(raw || '').trim();
    if (!value) return null;
    if (INVALID_LINK_VALUES.has(value.toLowerCase())) return null;

    if (value.startsWith('mailto:') || value.startsWith('tel:')) {
        if (/undefined|null/i.test(value)) return null;
        return value;
    }

    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('//')) return `https:${value}`;

    // Accept plain domains/hostnames and upgrade to https.
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) {
        return `https://${value}`;
    }

    return null;
}

export function normalizeInternalOrExternalUrl(raw?: string | null): string | null {
    const value = String(raw || '').trim();
    if (!value) return null;
    if (INVALID_LINK_VALUES.has(value.toLowerCase())) return null;

    if (value.startsWith('/')) return value;
    if (value.startsWith('#')) return value.length > 1 ? value : null;

    return normalizeExternalUrl(value);
}

export function isExternalUrl(url?: string | null): boolean {
    return /^https?:\/\//i.test(String(url || '').trim());
}
