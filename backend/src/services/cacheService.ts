/**
 * In-memory Map-based cache service.
 *
 * Replaces the previous Upstash Redis implementation with a simple
 * Map<string, CacheEntry> store. TTL-based expiration with lazy eviction
 * on read and periodic cleanup every 60 seconds.
 *
 * All keys prefixed with CACHE_PREFIX (default: "cw:").
 * Gracefully degrades when CACHE_ENABLED=false.
 * All operations wrapped in try/catch — never throws.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.9, 2.10, 6.5
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CACHE_PREFIX = process.env.CACHE_PREFIX ?? 'cw:';

function isCacheEnabled(): boolean {
    return process.env.CACHE_ENABLED?.toLowerCase() !== 'false';
}

// ---------------------------------------------------------------------------
// Internal store
// ---------------------------------------------------------------------------

interface CacheEntry {
    value: string;
    expiresAt: number;
}

const store = new Map<string, CacheEntry>();

// Periodic cleanup: evict expired entries every 60 seconds
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now >= entry.expiresAt) {
            store.delete(key);
        }
    }
}, 60_000);

// Allow the process to exit cleanly without waiting for this timer
cleanupTimer.unref();

// ---------------------------------------------------------------------------
// Key helpers
// ---------------------------------------------------------------------------

const KEY_SEP = '::';

/**
 * Build a deterministic cache key from HTTP method, path, and query params.
 * Query params are sorted alphabetically for determinism.
 * Format: `{prefix}{method}::{path}[::k=v&k2=v2]`
 */
export function buildKey(
    method: string,
    path: string,
    query: Record<string, string> = {},
): string {
    const sortedEntries = Object.keys(query)
        .sort()
        .filter((k) => query[k] !== undefined && query[k] !== '')
        .map((k) => `${k}=${query[k]}`);

    const queryPart = sortedEntries.length > 0 ? `${KEY_SEP}${sortedEntries.join('&')}` : '';
    return `${CACHE_PREFIX}${method.toUpperCase()}${KEY_SEP}${path}${queryPart}`;
}

/**
 * Parse a cache key back into its constituent parts.
 * Inverse of buildKey — supports the round-trip property.
 */
export function parseKey(key: string): {
    method: string;
    path: string;
    query: Record<string, string>;
} {
    // Strip prefix
    const body = key.startsWith(CACHE_PREFIX) ? key.slice(CACHE_PREFIX.length) : key;

    // Split on KEY_SEP — at most 3 segments: method, path, queryString
    const parts = body.split(KEY_SEP);
    const method = parts[0] ?? '';
    const path = parts[1] ?? '';
    const queryStr = parts.slice(2).join(KEY_SEP); // rejoin in case path contained separator (shouldn't, but safe)

    const query: Record<string, string> = {};
    if (queryStr) {
        for (const pair of queryStr.split('&')) {
            const eqIdx = pair.indexOf('=');
            if (eqIdx !== -1) {
                query[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1);
            }
        }
    }

    return { method, path, query };
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Retrieve a cached value. Returns null on miss, expiration, or error.
 * Performs lazy eviction: deletes the entry if expired.
 */
export async function get<T>(key: string): Promise<T | null> {
    if (!isCacheEnabled()) return null;
    try {
        const entry = store.get(key);
        if (!entry) return null;

        // Lazy eviction: check if expired
        if (Date.now() >= entry.expiresAt) {
            store.delete(key);
            return null;
        }

        return JSON.parse(entry.value) as T;
    } catch (err) {
        console.error('[CacheService] get failed:', err);
        return null;
    }
}

/**
 * Store a value with a TTL (seconds). Silently fails on error.
 */
export async function set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    if (!isCacheEnabled()) return;
    try {
        store.set(key, {
            value: JSON.stringify(value),
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    } catch (err) {
        console.error('[CacheService] set failed:', err);
    }
}

/**
 * Delete a single key. Silently fails on error.
 */
export async function del(key: string): Promise<void> {
    if (!isCacheEnabled()) return;
    try {
        store.delete(key);
    } catch (err) {
        console.error('[CacheService] del failed:', err);
    }
}

/**
 * Delete all keys matching a glob pattern (e.g. "cw:GET::/api/news*").
 * Converts glob to RegExp and iterates all keys. Returns the number of keys deleted.
 */
export async function delByPattern(pattern: string): Promise<number> {
    if (!isCacheEnabled()) return 0;
    try {
        // Convert glob pattern to RegExp:
        // 1. Escape regex special characters (except * and ?)
        // 2. Replace * with .* and ? with .
        const escaped = pattern.replace(/([.+^${}()|[\]\\])/g, '\\$1');
        const regexStr = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
        const regex = new RegExp(`^${regexStr}$`);

        let deleted = 0;
        for (const key of store.keys()) {
            if (regex.test(key)) {
                store.delete(key);
                deleted++;
            }
        }
        return deleted;
    } catch (err) {
        console.error('[CacheService] delByPattern failed:', err);
        return 0;
    }
}

// ---------------------------------------------------------------------------
// Public API (named exports + default object for convenience)
// ---------------------------------------------------------------------------

export const cacheService = {
    get,
    set,
    del,
    delByPattern,
    buildKey,
    parseKey,
};

export default cacheService;
