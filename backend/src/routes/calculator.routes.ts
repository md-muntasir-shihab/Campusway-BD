import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
    getSettings,
    updateSettings,
    trackUsage,
    getAnalytics
} from '../controllers/calculatorController';
import { getGrading, updateGrading } from '../controllers/calculatorGradingController';

const router = Router();

// Public routes (or student accessible)
router.get('/settings', getSettings);
router.get('/grading', getGrading);
router.post('/track', trackUsage);

// Admin routes
router.use(authenticate);
// Using 'site_settings' permission as this is related to site-wide configuration
router.put('/settings', requirePermission('site_settings', 'edit'), updateSettings);
router.put('/grading', requirePermission('site_settings', 'edit'), updateGrading);
router.get('/analytics', requirePermission('site_settings', 'view'), getAnalytics);

export default router;
