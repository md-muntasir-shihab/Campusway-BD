import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
    startPractice,
    submitPracticeSessionAnswer,
} from '../controllers/practiceController';

// ── Practice Routes ─────────────────────────────────────────
// Mount at: /api/v1/practice
// All routes are student-facing and require authentication only.
// Requirements: 12.1, 17.4

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /topics/:topicId — Start a practice session for a topic (Requirement 12.1)
router.get('/topics/:topicId', startPractice);

// POST /sessions/:id/answer — Submit an answer during practice (Requirement 12.1)
router.post('/sessions/:id/answer', submitPracticeSessionAnswer);

export default router;
