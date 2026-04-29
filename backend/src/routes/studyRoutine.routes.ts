import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validateBody } from '../validators/validateBody';
import { studyRoutineSchema } from '../validators/gamification.validator';
import {
    getRoutine,
    updateRoutine,
} from '../controllers/studyRoutineController';

// ── Study Routine Routes ────────────────────────────────────
// Mount at: /api/v1/study-routine
// All routes are student-facing and require authentication only.
// Requirements: 25.1, 17.4

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET / — Get the student's study routine (Requirement 25.1)
router.get('/', getRoutine);

// PUT / — Update the student's study routine (Requirement 25.1)
router.put('/', validateBody(studyRoutineSchema), updateRoutine);

export default router;
