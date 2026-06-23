/**
 * Adaptive Difficulty Routes
 * Requirement: 28
 *
 * Mounted at /api/v1/adaptive-difficulty
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMyTopicDifficulty, getAllMyDifficulties } from '../controllers/adaptiveDifficultyController';

const router = Router();

// All routes require authentication
router.use(authenticate);

/** GET /topics/:id/my-difficulty — Get difficulty for a single topic */
router.get('/topics/:id/my-difficulty', getMyTopicDifficulty);

/** GET /my-difficulties — Get all topic difficulties for the student */
router.get('/my-difficulties', getAllMyDifficulties);

export default router;
