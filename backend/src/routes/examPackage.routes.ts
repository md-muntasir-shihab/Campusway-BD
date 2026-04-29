import { Router } from 'express';
import { authenticate, requirePermission } from '../middlewares/auth';
import { validateBody } from '../validators/validateBody';
import { examPackageSchema } from '../validators/gamification.validator';
import {
    createPackage,
    listPackages,
    purchasePackage,
} from '../controllers/examPackageController';

// ── Exam Package Routes ─────────────────────────────────────
// Mount at: /api/v1/exam-packages
// POST / (create) requires admin/examiner permissions.
// GET / (list) and POST /:id/purchase are student-facing.
// Requirements: 23.1, 23.3, 17.4, 17.5, 17.6

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST / — Create a new exam package (admin/examiner only) (Requirement 23.1)
router.post('/', requirePermission('exams', 'create'), validateBody(examPackageSchema), createPackage);

// GET / — List active exam packages (any authenticated user) (Requirement 23.3)
router.get('/', listPackages);

// POST /:id/purchase — Purchase an exam package (Requirement 23.3)
router.post('/:id/purchase', purchasePackage);

export default router;
