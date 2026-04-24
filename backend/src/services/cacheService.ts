/**
 * Redis-backed cache service using Upstash REST client.
 *
 * Connects via REDIS_URL + REDIS_TOKEN env vars.
 * All keys prefixed with CACHE_PREFIX (default: "cw:").
 * Gracefully degrades when CACHE_ENABLED=false or Redis is unreachable.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 22.3
 */

import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CACHE_PREFIX = process.env.CACHE_PREFIX ?? 'cw:';

function isCacheEnabled(): boolean {
    return process.env.CACHE_ENABLED?.toLowerCase() !== 'false';
}

let redis: Redis | null = null;

function getRedis(): Redis | null {
    if (redis) return redis;
    // Support both naming conventions: UPSTASH_REDIS_REST_URL or REDIS_URL
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN;
    if (!url || !token) {
        console.warn('[CacheService] Redis credentials not set — cache disabled');
        return null;
    }
    try {
        redis = new Redis({ url, token });
        console.log('[CacheService] Connected to Upstash Redis');
        return redis;
    } catch (err) {
        console.error('[CacheService] Failed to create Redis client:', err);
        return null;
    }
}

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
 * Retrieve a cached value. Returns null on miss or error.
 */
export async function get<T>(key: string): Promise<T | null> {
    if (!isCacheEnabled()) return null;
    try {
        const client = getRedis();
        if (!client) return null;
        const raw = await client.get<string>(key);
        if (raw === null || raw === undefined) return null;
        // Upstash auto-deserialises JSON, but we stored via JSON.stringify
        // so the value may already be parsed or still be a string.
        if (typeof raw === 'string') {
            try {
                return JSON.parse(raw) as T;
            } catch {
                return raw as unknown as T;
            }
        }
        return raw as unknown as T;
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
        const client = getRedis();
        if (!client) return;
        const serialised = JSON.stringify(value);
        await client.set(key, serialised, { ex: ttlSeconds });
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
        const client = getRedis();
        if (!client) return;
        await client.del(key);
    } catch (err) {
        console.error('[CacheService] del failed:', err);
    }
}

/**
 * Delete all keys matching a glob pattern (e.g. "cw:GET::/api/news*").
 * Uses SCAN to avoid blocking Redis. Returns the number of keys deleted.
 */
export async function delByPattern(pattern: string): Promise<number> {
    if (!isCacheEnabled()) return 0;
    try {
        const client = getRedis();
        if (!client) return 0;

        let deleted = 0;
        let cursor = 0;

        do {
            const [nextCursor, keys] = await client.scan(cursor, { match: pattern, count: 100 });
            cursor = Number(nextCursor);
            if (keys.length > 0) {
                await client.del(...(keys as [string, ...string[]]));
                deleted += keys.length;
            }
        } while (cursor !== 0);

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
