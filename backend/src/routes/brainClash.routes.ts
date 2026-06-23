/**
 * Brain Clash (Live 1v1 Battle) Routes
 * Requirement: 29
 *
 * Mounted at /api/v1/brain-clash
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    joinQueue,
    leaveQueue,
    sseStream,
    submitAnswer,
    getHistory,
    getBattleDetails,
} from '../controllers/brainClashController';

const router = Router();

// All routes require authentication
router.use(authenticate);

/** POST /queue — Join matchmaking queue */
router.post('/queue', joinQueue);

/** DELETE /queue — Leave/Cancel matchmaking queue */
router.delete('/queue', leaveQueue);

/** GET /history — Paginated history of completed battles */
router.get('/history', getHistory);

/** GET /:battleId — Get battle details */
router.get('/:battleId', getBattleDetails);

/** POST /:battleId/answer — Submit answer for active battle */
router.post('/:battleId/answer', submitAnswer);

/** GET /:battleId/stream — Server-Sent Events stream for battle */
router.get('/:battleId/stream', sseStream);

export default router;
