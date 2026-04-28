import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { buildKey, parseKey, get, set, del, delByPattern } from '../services/cacheService';

/**
 * Feature: render-deployment-infra, Property 1: Cache key round-trip
 *
 * Validates: Requirements 2.11
 *
 * For any valid HTTP method (GET, POST, PUT, DELETE, PATCH), any valid URL path,
 * and any record of query parameters (with non-empty string values),
 * parseKey(buildKey(method, path, query)) should return an object with the same
 * method (uppercased), path, and query as the original inputs.
 */

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Valid HTTP methods */
const methodArb = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH');

/**
 * Valid URL path segment: non-empty, no "::", no "=", no "&", no "#", no "?"
 */
const pathSegmentArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => !s.includes('::') && !s.includes('=') && !s.includes('&') && !s.includes('#') && !s.includes('?') && !s.includes(':') && s.trim().length > 0);

/**
 * Valid URL path: starts with "/", composed of safe segments.
 */
const pathArb = fc
    .array(pathSegmentArb, { minLength: 1, maxLength: 4 })
    .map((segments) => '/' + segments.join('/'));

/**
 * Query param keys: non-empty strings that don't contain "=", "&", or "::"
 */
const queryKeyArb = fc
    .string({ minLength: 1, maxLength: 15 })
    .filter((s) => !s.includes('=') && !s.includes('&') && !s.includes(':') && !s.includes('#') && s.trim().length > 0);

/**
 * Query param values: non-empty strings that don't contain "=", "&", or "::"
 */
const queryValueArb = fc
    .string({ minLength: 1, maxLength: 15 })
    .filter((s) => !s.includes('=') && !s.includes('&') && !s.includes(':') && !s.includes('#') && s.trim().length > 0);

/**
 * Query params: a record of 0-5 key-value pairs with valid keys and values.
 */
const queryArb = fc
    .array(fc.tuple(queryKeyArb, queryValueArb), { minLength: 0, maxLength: 5 })
    .map((pairs) => Object.fromEntries(pairs));

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: render-deployment-infra, Property 1: Cache key round-trip', () => {
    it('parseKey(buildKey(method, path, query)) returns equivalent components', () => {
        fc.assert(
            fc.property(
                methodArb,
                pathArb,
                queryArb,
                (method, path, query) => {
                    const key = buildKey(method, path, query);
                    const parsed = parseKey(key);

                    // Method should be uppercased
                    expect(parsed.method).toBe(method.toUpperCase());

                    // Path should be preserved exactly
                    expect(parsed.path).toBe(path);

                    // Query params should match — buildKey filters out empty values
                    // and sorts keys, so we compare the filtered/sorted version
                    const expectedQuery: Record<string, string> = {};
                    for (const k of Object.keys(query).sort()) {
                        if (query[k] !== undefined && query[k] !== '') {
                            expectedQuery[k] = query[k];
                        }
                    }

                    expect(parsed.query).toEqual(expectedQuery);
                },
            ),
            { numRuns: 100 },
        );
    });
});

// ─── Property 2: TTL Expiration Correctness ──────────────────────────────────

/**
 * Feature: render-deployment-infra, Property 2: Cache TTL expiration
 *
 * Validates: Requirements 2.3
 *
 * For any cache key, any JSON-serializable value, and any positive TTL (in seconds),
 * calling set(key, value, ttl) and then get(key) before the TTL expires should return
 * the original value, and calling get(key) after the TTL has expired should return null.
 */

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Simple cache key: alphanumeric with prefix to avoid collisions with Property 1 */
const cacheKeyArb = fc
    .string({ minLength: 1, maxLength: 30 })
    .filter((s) => s.trim().length > 0)
    .map((s) => `prop2:${s}`);

/** JSON-serializable values: strings, numbers, booleans, arrays, objects */
const jsonValueArb = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.double({ noNaN: true, noDefaultInfinity: true, min: 0 }),
    fc.boolean(),
    fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()), { maxLength: 5 }),
    fc.dictionary(
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        { minKeys: 0, maxKeys: 5 },
    ),
);

/** TTL in seconds: positive integer between 1 and 3600 */
const ttlArb = fc.integer({ min: 1, max: 3600 });

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: render-deployment-infra, Property 2: Cache TTL expiration', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        process.env.CACHE_ENABLED = 'true';
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('get(key) returns value before TTL expires and null after expiration', async () => {
        await fc.assert(
            fc.asyncProperty(
                cacheKeyArb,
                jsonValueArb,
                ttlArb,
                async (key, value, ttlSeconds) => {
                    // Store the value with the given TTL
                    await set(key, value, ttlSeconds);

                    // Before TTL expires: advance time to just before expiration
                    const almostExpired = ttlSeconds * 1000 - 1;
                    if (almostExpired > 0) {
                        vi.advanceTimersByTime(almostExpired);
                    }

                    const beforeExpiry = await get(key);
                    expect(beforeExpiry).toEqual(value);

                    // After TTL expires: advance time past expiration
                    vi.advanceTimersByTime(2); // 1ms before + 2ms = 1ms past expiration
                    const afterExpiry = await get(key);
                    expect(afterExpiry).toBeNull();
                },
            ),
            { numRuns: 100 },
        );
    });
});


// ─── Property 3: delByPattern removes only matching keys ─────────────────────

/**
 * Feature: render-deployment-infra, Property 3: delByPattern correctness
 *
 * Validates: Requirements 2.4
 *
 * For any set of cache keys stored in the map and any glob pattern,
 * after calling delByPattern(pattern), no remaining key in the store should
 * match the pattern, and all keys that did not match the pattern before
 * deletion should still be present with their original values.
 */

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Simple alphanumeric string for key suffixes */
const alphaNumArb = fc
    .string({ minLength: 1, maxLength: 10, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')) });

/** Generate a unique iteration prefix to isolate test runs */
const iterPrefixArb = fc
    .string({ minLength: 4, maxLength: 8, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')) });

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: render-deployment-infra, Property 3: delByPattern correctness', () => {
    beforeEach(() => {
        process.env.CACHE_ENABLED = 'true';
    });

    it('delByPattern removes all matching keys and preserves non-matching keys', async () => {
        await fc.assert(
            fc.asyncProperty(
                iterPrefixArb,
                fc.array(alphaNumArb, { minLength: 1, maxLength: 5 }),
                fc.array(alphaNumArb, { minLength: 1, maxLength: 5 }),
                async (iterPrefix, matchSuffixes, nonMatchSuffixes) => {
                    const TTL = 3600; // Long TTL to avoid expiration

                    // Build unique keys for this iteration
                    const matchPrefix = `prop3:${iterPrefix}:match`;
                    const nonMatchPrefix = `prop3:${iterPrefix}:other`;

                    // Create matching keys (will be deleted by pattern)
                    const matchingKeys = [...new Set(matchSuffixes)].map(
                        (s) => `${matchPrefix}:${s}`,
                    );

                    // Create non-matching keys (should survive deletion)
                    const nonMatchingKeys = [...new Set(nonMatchSuffixes)].map(
                        (s) => `${nonMatchPrefix}:${s}`,
                    );

                    // Store values for all keys
                    const expectedValues: Record<string, string> = {};

                    for (const key of matchingKeys) {
                        const value = `val-${key}`;
                        expectedValues[key] = value;
                        await set(key, value, TTL);
                    }

                    for (const key of nonMatchingKeys) {
                        const value = `val-${key}`;
                        expectedValues[key] = value;
                        await set(key, value, TTL);
                    }

                    // Use glob pattern that matches only the "match" prefix keys
                    const pattern = `${matchPrefix}:*`;

                    // Execute delByPattern
                    const deletedCount = await delByPattern(pattern);

                    // Verify: deleted count matches the number of matching keys
                    expect(deletedCount).toBe(matchingKeys.length);

                    // Verify: all matching keys are gone
                    for (const key of matchingKeys) {
                        const result = await get(key);
                        expect(result).toBeNull();
                    }

                    // Verify: all non-matching keys still have their original values
                    for (const key of nonMatchingKeys) {
                        const result = await get(key);
                        expect(result).toBe(expectedValues[key]);
                    }

                    // Cleanup: delete non-matching keys to avoid store pollution
                    for (const key of nonMatchingKeys) {
                        await del(key);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});


// ─── Property 4: Disabled cache returns null ─────────────────────────────────

/**
 * Feature: render-deployment-infra, Property 4: Disabled cache returns null
 *
 * Validates: Requirements 6.5
 *
 * For any cache key and any JSON-serializable value, when CACHE_ENABLED is set
 * to 'false', get(key) should always return null, and set(key, value, ttl) should
 * not store anything (subsequent get after re-enabling should still return null
 * for that key, proving set didn't persist).
 */

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Unique key prefix per iteration to avoid collisions with other property tests */
const prop4PrefixArb = fc
    .string({ minLength: 4, maxLength: 8, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')) });

/** Cache key suffix: alphanumeric */
const prop4KeySuffixArb = fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.replace(/[^a-zA-Z0-9]/g, 'x'));

/** JSON-serializable values */
const prop4ValueArb = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.double({ noNaN: true, noDefaultInfinity: true, min: 0 }),
    fc.boolean(),
    fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()), { maxLength: 5 }),
    fc.dictionary(
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0),
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        { minKeys: 0, maxKeys: 5 },
    ),
);

/** TTL in seconds: positive integer between 1 and 3600 */
const prop4TtlArb = fc.integer({ min: 1, max: 3600 });

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: render-deployment-infra, Property 4: Disabled cache returns null', () => {
    let originalCacheEnabled: string | undefined;

    beforeEach(() => {
        originalCacheEnabled = process.env.CACHE_ENABLED;
    });

    afterEach(() => {
        // Restore original value
        if (originalCacheEnabled === undefined) {
            delete process.env.CACHE_ENABLED;
        } else {
            process.env.CACHE_ENABLED = originalCacheEnabled;
        }
    });

    it('get always returns null when CACHE_ENABLED=false, and set does not store anything', async () => {
        await fc.assert(
            fc.asyncProperty(
                prop4PrefixArb,
                prop4KeySuffixArb,
                prop4ValueArb,
                prop4TtlArb,
                async (prefix, keySuffix, value, ttlSeconds) => {
                    const key = `prop4:${prefix}:${keySuffix}`;

                    // Disable cache
                    process.env.CACHE_ENABLED = 'false';

                    // set should silently no-op
                    await set(key, value, ttlSeconds);

                    // get should return null when cache is disabled
                    const resultWhileDisabled = await get(key);
                    expect(resultWhileDisabled).toBeNull();

                    // Re-enable cache and verify set didn't actually store anything
                    process.env.CACHE_ENABLED = 'true';

                    const resultAfterReEnable = await get(key);
                    expect(resultAfterReEnable).toBeNull();

                    // Cleanup: delete key in case it somehow got stored
                    await del(key);
                },
            ),
            { numRuns: 100 },
        );
    });
});
