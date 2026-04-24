/**
 * Cache middleware for Express.
 *
 * Intercepts GET requests on public routes and serves cached responses
 * from Redis (via CacheService). Non-GET methods pass through untouched.
 *
 * Headers:
 *   x-cache: HIT | MISS  — set on every cacheable GET response
 *   x-cache-bypass        — request header; when present, skips cache lookup
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CacheMiddlewareOptions {
    /** TTL in seconds for cached responses */
    ttl: number;
    /** Route patterns to cache (supports trailing `*` wildcard) */
    routes: string[];
    /** Auth-sensitive route patterns to skip caching */
    skipRoutes?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether `path` matches any of the given patterns.
 * Patterns ending with `*` match any path that starts with the prefix.
 * Exact patterns require an exact match.
 */
function matchesAny(path: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
        if (pattern.endsWith('*')) {
            const prefix = pattern.slice(0, -1);
            if (path.startsWith(prefix)) return true;
        } else if (path === pattern) {
            return true;
        }
    }
    return false;
}

// ---------------------------------------------------------------------------
// Middleware factory
// ---------------------------------------------------------------------------

/**
 * Returns Express middleware that caches GET responses for matched routes.
 */
export function cacheMiddleware(options: CacheMiddlewareOptions): RequestHandler {
    const { ttl, routes, skipRoutes = [] } = options;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // 1. Only cache GET requests (Req 2.1)
        if (req.method !== 'GET') {
            next();
            return;
        }

        // 2. Check route matches
        const routePath = req.path; // path relative to the router mount point
        if (!matchesAny(routePath, routes)) {
            next();
            return;
        }

        // 3. Skip auth-sensitive routes (Req 2.5)
        if (skipRoutes.length > 0 && matchesAny(routePath, skipRoutes)) {
            next();
            return;
        }

        // 4. Respect x-cache-bypass header (Req 2.4)
        if (req.headers['x-cache-bypass']) {
            next();
            return;
        }

        // 5. Attempt cache lookup
        const query = (req.query ?? {}) as Record<string, string>;
        const cacheKey = cacheService.buildKey(req.method, req.originalUrl.split('?')[0], query);

        try {
            const cached = await cacheService.get<{ statusCode: number; body: unknown }>(cacheKey);

            if (cached) {
                // Cache HIT (Req 2.2)
                res.setHeader('x-cache', 'HIT');
                res.status(cached.statusCode ?? 200).json(cached.body);
                logger.debug('[CacheMiddleware] HIT', req, { key: cacheKey });
                return;
            }
        } catch {
            // Redis failure — fall through to origin (graceful degradation)
            logger.warn('[CacheMiddleware] cache lookup failed, falling through', req);
        }

        // 6. Cache MISS — intercept the response to cache it (Req 2.3)
        res.setHeader('x-cache', 'MISS');

        const originalJson = res.json.bind(res);
        res.json = (body: unknown): Response => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cacheService
                    .set(cacheKey, { statusCode: res.statusCode, body }, ttl)
                    .catch((err) => logger.warn('[CacheMiddleware] cache write failed', req, { error: String(err) }));
            }
            return originalJson(body);
        };

        next();
    };
}

// ---------------------------------------------------------------------------
// Cache invalidation middleware
// ---------------------------------------------------------------------------

/**
 * Middleware that invalidates cache entries for a given resource type
 * after a write operation completes. Attach to POST/PUT/PATCH/DELETE routes.
 */
export function invalidateCache(resourceType: string): RequestHandler {
    return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Run after the response is sent
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const pattern = `${process.env.CACHE_PREFIX ?? 'cw:'}*${resourceType}*`;
                cacheService
                    .delByPattern(pattern)
                    .then((count) => {
                        logger.info(`[CacheMiddleware] invalidated ${count} keys for ${resourceType}`, _req, {
                            resourceType,
                            deletedKeys: count,
                        });
                    })
                    .catch((err) => logger.warn('[CacheMiddleware] invalidation failed', _req, { error: String(err) }));
            }
        });
        next();
    };
}

// ---------------------------------------------------------------------------
// Pre-configured middleware instances for public routes
// ---------------------------------------------------------------------------

/** Routes that are auth-sensitive and should never be cached */
const AUTH_SENSITIVE_ROUTES = [
    '/auth/*',
    '/users/me',
    '/profile/*',
    '/subscriptions/me',
    '/students/me/*',
    '/student/*',
    '/exams',
    '/exams/*',
    '/support/*',
    '/alerts/active',
];

/** Home, news, resources — moderate TTL (Req 2.7) */
export const publicContentCache = cacheMiddleware({
    ttl: 120, // 120s — within the 60-180s range
    routes: [
        '/home',
        '/home/*',
        '/news',
        '/news/*',
        '/resources',
        '/resources/*',
        '/universities',
        '/universities/*',
        '/university-categories',
        '/university-categories/*',
        '/public/*',
        '/search',
        '/banners',
        '/banners/*',
        '/home-config',
        '/stats',
        '/services',
        '/services/*',
        '/service-categories',
        '/help-center',
        '/help-center/*',
        '/content-blocks',
        '/founder',
        '/legal-pages/*',
        '/system/status',
        '/exams/public-list',
    ],
    skipRoutes: AUTH_SENSITIVE_ROUTES,
});

/** Settings / static-like routes — longer TTL (Req 2.7) */
export const publicSettingsCache = cacheMiddleware({
    ttl: 300, // 300s for settings/static
    routes: [
        '/settings',
        '/settings/*',
        '/security/public-config',
        '/subscription-plans',
        '/subscription-plans/*',
        '/home-settings/public',
        '/social-links/public',
        '/news/settings',
        '/news/sources',
        '/news/appearance',
        '/resources/settings/public',
        '/universities/settings/public',
    ],
    skipRoutes: AUTH_SENSITIVE_ROUTES,
});
