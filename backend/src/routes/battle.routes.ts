import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validateBody } from '../validators/validateBody';
import { battleChallengeSchema, battleAnswerSchema } from '../validators/gamification.validator';
import {
    createChallenge,
    acceptChallenge,
    submitAnswer,
    getBattleHistory,
} from '../controllers/battleController';

// ── Battle Routes ───────────────────────────────────────────
// Mount at: /api/v1/battles
// All routes are student-facing and require authentication only.
// Requirements: 21.1, 21.2, 21.3, 21.6

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /challenge — Create a battle challenge (Requirement 21.1)
router.post('/challenge', validateBody(battleChallengeSchema), createChallenge);

// POST /:id/accept — Accept a pending battle challenge (Requirement 21.2)
router.post('/:id/accept', acceptChallenge);

// POST /:id/answer — Submit an answer during an active battle (Requirement 21.3)
router.post('/:id/answer', validateBody(battleAnswerSchema), submitAnswer);

// GET /history — Paginated battle history for the authenticated student (Requirement 21.6)
router.get('/history', getBattleHistory);

export default router;
