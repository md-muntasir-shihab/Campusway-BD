import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as cacheService from '../services/cacheService';

/**
 * Unit tests for CacheService API surface
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 6.5
 */

describe('CacheService', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Ensure cache is enabled by default
        vi.stubEnv('CACHE_ENABLED', 'true');
    });

    afterEach(async () => {
        // Clean up all keys between tests
        await cacheService.delByPattern('*');
        vi.useRealTimers();
        vi.unstubAllEnvs();
    });

    // ─── 1. get returns null for non-existent key (cache MISS) ──────────

    it('get returns null for a non-existent key', async () => {
        const result = await cacheService.get('nonexistent-key');
        expect(result).toBeNull();
    });

    // ─── 2. set + get returns stored value (cache HIT) ──────────────────

    it('set + get returns the stored value', async () => {
        const data = { name: 'CampusWay', version: 2 };
        await cacheService.set('test-key', data, 60);

        const result = await cacheService.get('test-key');
        expect(result).toEqual(data);
    });

    it('set + get works with primitive values', async () => {
        await cacheService.set('str-key', 'hello', 60);
        await cacheService.set('num-key', 42, 60);
        await cacheService.set('bool-key', true, 60);

        expect(await cacheService.get('str-key')).toBe('hello');
        expect(await cacheService.get('num-key')).toBe(42);
        expect(await cacheService.get('bool-key')).toBe(true);
    });

    // ─── 3. get returns null after TTL expires ──────────────────────────

    it('get returns null after TTL expires', async () => {
        await cacheService.set('ttl-key', { data: 'value' }, 10);

        // Still valid before TTL
        vi.advanceTimersByTime(9_999);
        expect(await cacheService.get('ttl-key')).toEqual({ data: 'value' });

        // Expired after TTL
        vi.advanceTimersByTime(2);
        expect(await cacheService.get('ttl-key')).toBeNull();
    });

    // ─── 4. del removes a key ───────────────────────────────────────────

    it('del removes a stored key', async () => {
        await cacheService.set('del-key', 'to-delete', 60);
        expect(await cacheService.get('del-key')).toBe('to-delete');

        await cacheService.del('del-key');
        expect(await cacheService.get('del-key')).toBeNull();
    });

    it('del on non-existent key does not throw', async () => {
        await expect(cacheService.del('no-such-key')).resolves.toBeUndefined();
    });

    // ─── 5. delByPattern removes matching keys and returns count ────────

    it('delByPattern removes matching keys and returns count', async () => {
        await cacheService.set('cw:GET::/api/news', 'news1', 60);
        await cacheService.set('cw:GET::/api/news/1', 'news2', 60);
        await cacheService.set('cw:GET::/api/users', 'users', 60);

        const deleted = await cacheService.delByPattern('cw:GET::/api/news*');
        expect(deleted).toBe(2);
    });

    // ─── 6. delByPattern preserves non-matching keys ────────────────────

    it('delByPattern preserves non-matching keys', async () => {
        await cacheService.set('cw:GET::/api/news', 'news', 60);
        await cacheService.set('cw:GET::/api/users', 'users', 60);
        await cacheService.set('cw:POST::/api/exams', 'exams', 60);

        await cacheService.delByPattern('cw:GET::/api/news*');

        expect(await cacheService.get('cw:GET::/api/users')).toBe('users');
        expect(await cacheService.get('cw:POST::/api/exams')).toBe('exams');
    });

    // ─── 7. buildKey produces expected format ───────────────────────────

    it('buildKey produces correct format without query params', () => {
        const key = cacheService.buildKey('GET', '/api/news');
        expect(key).toBe('cw:GET::/api/news');
    });

    it('buildKey produces correct format with sorted query params', () => {
        const key = cacheService.buildKey('GET', '/api/universities', {
            page: '1',
            category: 'public',
        });
        expect(key).toBe('cw:GET::/api/universities::category=public&page=1');
    });

    it('buildKey uppercases the method', () => {
        const key = cacheService.buildKey('get', '/api/test');
        expect(key).toBe('cw:GET::/api/test');
    });

    it('buildKey ignores empty query values', () => {
        const key = cacheService.buildKey('GET', '/api/test', { a: 'val', b: '' });
        expect(key).toBe('cw:GET::/api/test::a=val');
    });

    // ─── 8. parseKey correctly parses a key back to components ──────────

    it('parseKey parses a key without query params', () => {
        const parsed = cacheService.parseKey('cw:GET::/api/news');
        expect(parsed).toEqual({
            method: 'GET',
            path: '/api/news',
            query: {},
        });
    });

    it('parseKey parses a key with query params', () => {
        const parsed = cacheService.parseKey('cw:GET::/api/universities::category=public&page=1');
        expect(parsed).toEqual({
            method: 'GET',
            path: '/api/universities',
            query: { category: 'public', page: '1' },
        });
    });

    // ─── 9. CACHE_ENABLED=false: get returns null, set doesn't store ────

    describe('CACHE_ENABLED=false', () => {
        beforeEach(() => {
            vi.stubEnv('CACHE_ENABLED', 'false');
        });

        it('get always returns null when cache is disabled', async () => {
            // First store something with cache enabled, then disable
            vi.stubEnv('CACHE_ENABLED', 'true');
            await cacheService.set('disabled-key', 'value', 60);
            vi.stubEnv('CACHE_ENABLED', 'false');

            expect(await cacheService.get('disabled-key')).toBeNull();
        });

        it('set does not store when cache is disabled', async () => {
            await cacheService.set('no-store-key', 'value', 60);

            // Re-enable and check nothing was stored
            vi.stubEnv('CACHE_ENABLED', 'true');
            expect(await cacheService.get('no-store-key')).toBeNull();
        });

        // ─── 10. CACHE_ENABLED=false: del and delByPattern are no-ops ───

        it('del is a no-op when cache is disabled', async () => {
            // Store with cache enabled
            vi.stubEnv('CACHE_ENABLED', 'true');
            await cacheService.set('keep-key', 'value', 60);
            vi.stubEnv('CACHE_ENABLED', 'false');

            // del should be a no-op
            await cacheService.del('keep-key');

            // Re-enable and verify key still exists
            vi.stubEnv('CACHE_ENABLED', 'true');
            expect(await cacheService.get('keep-key')).toBe('value');
        });

        it('delByPattern returns 0 and is a no-op when cache is disabled', async () => {
            // Store with cache enabled
            vi.stubEnv('CACHE_ENABLED', 'true');
            await cacheService.set('cw:GET::/api/test', 'value', 60);
            vi.stubEnv('CACHE_ENABLED', 'false');

            const deleted = await cacheService.delByPattern('cw:GET::*');
            expect(deleted).toBe(0);

            // Re-enable and verify key still exists
            vi.stubEnv('CACHE_ENABLED', 'true');
            expect(await cacheService.get('cw:GET::/api/test')).toBe('value');
        });
    });
});
