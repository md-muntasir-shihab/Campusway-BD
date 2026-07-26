import { Request, Response, NextFunction } from 'express';

const BOT_USER_AGENTS = [
    'googlebot',
    'bingbot',
    'yandexbot',
    'duckduckbot',
    'baiduspider',
    'facebookexternalhit',
    'twitterbot',
    'rogerbot',
    'linkedinbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'pinterest/ios',
    'slackbot',
    'vkShare',
    'w3c_validator',
    'whatsapp',
];

/**
 * Express middleware that checks if an incoming GET request is from a search engine bot or social media crawler.
 * If PRERENDER_SERVICE_URL is set, it proxies the request to the prerender service to deliver pre-rendered HTML.
 */
export function prerenderMiddleware(req: Request, res: Response, next: NextFunction): void {
    const prerenderUrl = process.env.PRERENDER_SERVICE_URL;
    if (!prerenderUrl || req.method !== 'GET') {
        return next();
    }

    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const isBot = BOT_USER_AGENTS.some((bot) => userAgent.includes(bot));

    // Exclude static assets or admin API requests
    const isStaticOrApi = /\.(js|css|xml|json|png|jpg|jpeg|gif|svg|ico|ttf|woff|woff2)$/i.test(req.path) ||
        req.path.startsWith('/api/') ||
        req.path.startsWith('/__cw_admin__/');

    if (!isBot || isStaticOrApi) {
        return next();
    }

    const protocol = req.protocol || 'https';
    const host = req.get('host') || 'campusway.net';
    const fullUrl = `${protocol}://${host}${req.originalUrl}`;

    const targetUrl = prerenderUrl.endsWith('/')
        ? `${prerenderUrl}${fullUrl}`
        : `${prerenderUrl}/${fullUrl}`;

    fetch(targetUrl, {
        headers: {
            'X-Prerender-Token': process.env.PRERENDER_TOKEN || '',
            'User-Agent': (req.headers['user-agent'] as string) || '',
        },
    })
        .then(async (response) => {
            const html = await response.text();
            res.status(response.status).send(html);
        })
        .catch((err: any) => {
            console.error('[PrerenderMiddleware] Error rendering URL via prerender service:', err?.message);
            next(); // Fallback to normal SPA delivery on error
        });
}

export default prerenderMiddleware;
