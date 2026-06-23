import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getCurrentLeagueStatus,
    getWeeklyLeagueLeaderboard,
} from '../controllers/gamificationController';

// ── Leagues Routes ───────────────────────────────────────────
// Mount at: /api/v1/leagues
// Requirements: 19.4, 19.5

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /current — Student's current league tier, rank, and XP (Requirement 19.4)
router.get('/current', getCurrentLeagueStatus);

// GET /leaderboard — Weekly leaderboard for the student's current tier (Requirement 19.5)
router.get('/leaderboard', getWeeklyLeagueLeaderboard);

export default router;
