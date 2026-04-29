import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth';
import { validateBody } from '../validators/validateBody';
import { examinerApplicationSchema } from '../validators/gamification.validator';
import {
    applyForExaminer,
    getDashboard,
    getEarnings,
} from '../controllers/examinerController';

// ── Examiner Routes ─────────────────────────────────────────
// Mount at: /api/v1/examiner
// POST /apply is student-facing (any authenticated user can apply).
// GET /dashboard and GET /earnings require examiner-level permissions.
// Requirements: 22.1, 22.3, 17.4, 17.5, 17.6

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /apply — Submit an examiner application (any authenticated user) (Requirement 22.1)
router.post('/apply', validateBody(examinerApplicationSchema), applyForExaminer);

// GET /dashboard — Examiner dashboard data (Requirement 22.3)
router.get('/dashboard', requirePermission('exams', 'view'), getDashboard);

// GET /earnings — Examiner revenue report (Requirement 22.3)
router.get('/earnings', requirePermission('exams', 'view'), getEarnings);

export default router;
