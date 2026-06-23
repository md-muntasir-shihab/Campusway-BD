import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
    getProfile,
    getWeeklyLeaderboard,
    getGlobalLeaderboard,
    claimDailyLoginBonus,
    getBadges,
    getStudentBadges,
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

// POST /login-bonus — Claim daily login bonus
router.post('/login-bonus', claimDailyLoginBonus);

// POST /daily-bonus — Alias for login bonus (used by frontend)
router.post('/daily-bonus', claimDailyLoginBonus);

// GET /badges — Get all active badges
router.get('/badges', getBadges);

// GET /badges/me — Get user's earned badges
router.get('/badges/me', getStudentBadges);

export default router;
