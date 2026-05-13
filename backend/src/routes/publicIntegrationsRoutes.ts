/**
 * Public, unauthenticated integrations endpoints.
 * Currently exposes only the analytics client config (already designed to be
 * public per Umami / Plausible semantics). No secrets are ever returned here.
 */
import { Router, type Request, type Response } from 'express';
import { getPublicAnalyticsConfig } from '../services/integrations/analyticsHelper';

const router = Router();

router.get('/analytics-config', async (_req: Request, res: Response) => {
    try {
        const config = await getPublicAnalyticsConfig();
        res.set('Cache-Control', 'public, max-age=60');
        res.json(config);
    } catch (error) {
        console.error('analytics-config error:', error);
        res.status(500).json({ provider: null, scriptUrl: null, siteId: null, domain: null });
    }
});

export default router;
