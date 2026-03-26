import { Router } from 'express';
import { getHome, getPublicSettings } from '../controllers/publicController.js';
import newsPublicRoutes from './newsPublicRoutes.js';

const router = Router();
router.get('/settings/public', getPublicSettings);
router.get('/home', getHome);
router.use(newsPublicRoutes);

export default router;

