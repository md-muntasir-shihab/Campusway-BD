import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { validateBody } from '../validators/validateBody';
import {
    doubtCreateSchema,
    doubtReplySchema,
    doubtVoteSchema,
} from '../validators/gamification.validator';
import {
    createDoubt,
    getThreadsByQuestion,
    addReply,
    vote,
} from '../controllers/doubtController';

// ── Doubt Solver Routes ─────────────────────────────────────
// Mount at: /api/v1/doubts
// All routes are student-facing and require authentication only.
// Requirements: 26.1, 17.4

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST / — Create a new doubt thread (Requirement 26.1)
router.post('/', validateBody(doubtCreateSchema), createDoubt);

// GET /question/:questionId — Get doubt threads for a question (Requirement 26.1)
router.get('/question/:questionId', getThreadsByQuestion);

// POST /:id/reply — Post a reply to a doubt thread (Requirement 26.1)
router.post('/:id/reply', validateBody(doubtReplySchema), addReply);

// POST /:id/vote — Vote on a reply (Requirement 26.1)
router.post('/:id/vote', validateBody(doubtVoteSchema), vote);

export default router;
