import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
    getProfile,
    getWeeklyLeaderboard,
    getGlobalLeaderboard,
} from '../controllers/gamificationController';

// ── Gamification Routes ─────────────────────────────────────
// Mount at: /api/v1/gamification
// All routes are student-facing and require authentication only.
// Requirements: 19.10, 17.4

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /profile — Student gamification profile (Requirement 19.10)
router.get('/profile', getProfile);

// GET /leaderboard/weekly — Weekly leaderboard (Requirement 17.4)
router.get('/leaderboard/weekly', getWeeklyLeaderboard);

// GET /leaderboard/global — Global leaderboard (Requirement 17.4)
router.get('/leaderboard/global', getGlobalLeaderboard);

export default router;
