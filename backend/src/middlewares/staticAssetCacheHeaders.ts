import type { RequestHandler } from 'express';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Middleware that sets Cache-Control headers for static asset API responses.
 * Applied to routes that serve images, fonts, CSS, or other cacheable content.
 *
 * - Images, fonts, CSS: 7-day max-age (604800s), immutable
 * - Other static assets: 1-day max-age (86400s)
 * - Development: no-cache
 */
export const staticAssetCacheHeaders: RequestHandler = (_req, res, next) => {
    if (!IS_PRODUCTION) {
        res.setHeader('Cache-Control', 'no-cache');
        return next();
    }

    // Intercept the end of the response to set headers based on content-type
    const originalEnd = res.end;
    res.end = function (...args: Parameters<typeof originalEnd>) {
        const contentType = res.getHeader('content-type');
        if (typeof contentType === 'string') {
            if (/image\/|font\/|application\/font|text\/css/i.test(contentType)) {
                if (!res.getHeader('cache-control')) {
                    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
                }
            }
        }
        return originalEnd.apply(res, args);
    } as typeof originalEnd;

    next();
};

export default staticAssetCacheHeaders;
