import { Router } from 'express';
import { getPublicNewsBySlug, getPublicNewsList, getPublicNewsSettings, getPublicNewsSources, trackPublicNewsShare } from '../controllers/newsPublicController.js';
const router = Router();
router.get('/news', getPublicNewsList);
router.get('/news/settings', getPublicNewsSettings);
router.get('/news/sources', getPublicNewsSources);
router.post('/news/share/track', trackPublicNewsShare);
router.get('/news/:slug', getPublicNewsBySlug);
export default router;
