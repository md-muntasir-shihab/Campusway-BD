/**
 * Simple in-memory TTL cache for public settings and /api/home response.
 * Safe invalidation after admin saves.
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class SettingsCache {
    private store = new Map<string, CacheEntry<unknown>>();
    private defaultTtlMs: number;

    constructor(defaultTtlMs = 30_000) {
        this.defaultTtlMs = defaultTtlMs;
    }

    get<T>(key: string): T | null {
        const entry = this.store.get(key) as CacheEntry<T> | undefined;
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return null;
        }
        return entry.value;
    }

    set<T>(key: string, value: T, ttlMs?: number): void {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
        });
    }

    invalidate(key: string): void {
        this.store.delete(key);
    }

    invalidatePrefix(prefix: string): void {
        for (const k of this.store.keys()) {
            if (k.startsWith(prefix)) {
                this.store.delete(k);
            }
        }
    }

    clear(): void {
        this.store.clear();
    }

    get size(): number {
        return this.store.size;
    }
}

/** Shared instance — import this in controllers */
export const settingsCache = new SettingsCache(30_000); // 30s default TTL
