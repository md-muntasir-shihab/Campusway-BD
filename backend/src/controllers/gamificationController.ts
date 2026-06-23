import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { ResponseBuilder } from '../utils/responseBuilder';
import * as GamificationService from '../services/GamificationService';
import * as LeaderboardService from '../services/LeaderboardService';
import UserPoints from '../models/UserPoints';
import WeeklyLeagueRanking from '../models/WeeklyLeagueRanking';
import Badge from '../models/Badge';
import StudentBadge from '../models/StudentBadge';
import LeagueProgress from '../models/LeagueProgress';

// Helper for ISO week
function getWeekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ── Gamification Controller ─────────────────────────────────
// Thin handlers delegating to GamificationService and LeaderboardService.
// Requirements: 19.10, 17.4

/**
 * GET /profile — Return the authenticated student's gamification profile.
 */
export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        // Run streak-break check first
        await GamificationService.detectAndResetBrokenStreak(studentId);

        const profile = await GamificationService.getStudentGamificationProfile(studentId);
        ResponseBuilder.send(res, 200, ResponseBuilder.success(profile));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /leaderboard/weekly — Return the weekly leaderboard (paginated).
 */
export async function getWeeklyLeaderboard(req: AuthRequest, res: Response): Promise<void> {
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const result = await LeaderboardService.getWeeklyLeaderboard(page);
        ResponseBuilder.send(
            res,
            200,
            ResponseBuilder.paginated(result.entries, result.page, 20, result.total),
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /leaderboard/global — Return the global leaderboard (paginated).
 */
export async function getGlobalLeaderboard(req: AuthRequest, res: Response): Promise<void> {
    try {
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const result = await LeaderboardService.getGlobalLeaderboard(page);
        ResponseBuilder.send(
            res,
            200,
            ResponseBuilder.paginated(result.entries, result.page, 20, result.total),
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * POST /gamification/login-bonus — Claim daily login bonus.
 */
export async function claimDailyLoginBonus(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        // Run streak-break check first
        await GamificationService.detectAndResetBrokenStreak(studentId);

        const result = await GamificationService.dailyLoginBonus(studentId);
        if (!result.awarded) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('BAD_REQUEST', 'Daily bonus already claimed today'));
            return;
        }

        ResponseBuilder.send(res, 200, ResponseBuilder.success(result));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /users/me/points — Get student points and coins.
 */
export async function getStudentPoints(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const studentOid = new mongoose.Types.ObjectId(studentId);
        let points = await UserPoints.findOne({ student: studentOid }).lean();
        const safePoints = points ?? { xp: 0, coins: 0, lastLoginDate: null };

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            xp: safePoints.xp,
            coins: safePoints.coins,
            lastLoginDate: safePoints.lastLoginDate,
        }));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /badges — Get all active badges.
 */
export async function getBadges(req: AuthRequest, res: Response): Promise<void> {
    try {
        const badges = await Badge.find({ isActive: true }).sort({ category: 1, title: 1 }).lean();
        ResponseBuilder.send(res, 200, ResponseBuilder.success(badges));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /users/me/badges — Get student's awarded badges.
 */
export async function getStudentBadges(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const studentOid = new mongoose.Types.ObjectId(studentId);
        const studentBadges = await StudentBadge.find({ student: studentOid })
            .populate('badge')
            .sort({ awardedAt: -1 })
            .lean();

        const formatted = studentBadges
            .filter((sb) => sb.badge)
            .map((sb: any) => ({
                _id: sb._id,
                badgeId: sb.badge._id,
                code: sb.badge.code,
                title: sb.badge.title,
                title_bn: sb.badge.title_bn,
                description: sb.badge.description,
                iconUrl: sb.badge.iconUrl,
                category: sb.badge.category,
                awardedAt: sb.awardedAt,
            }));

        ResponseBuilder.send(res, 200, ResponseBuilder.success(formatted));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /leagues/current — Get student's current weekly league rank and XP.
 */
export async function getCurrentLeagueStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const studentOid = new mongoose.Types.ObjectId(studentId);
        const weekKey = getWeekKey(new Date());

        // Get current tier
        let leagueProgress = await LeagueProgress.findOne({ student: studentOid });
        if (!leagueProgress) {
            leagueProgress = await LeagueProgress.create({
                student: studentOid,
                currentTier: 'iron',
                mockTestsCompleted: 0,
                xpMultiplier: 1,
                history: [{ tier: 'iron', achievedAt: new Date() }],
            });
        }
        const currentTier = leagueProgress.currentTier;

        // Get weekly ranking record
        let ranking = await WeeklyLeagueRanking.findOne({ student: studentOid, weekKey });
        if (!ranking) {
            ranking = await WeeklyLeagueRanking.create({
                student: studentOid,
                weekKey,
                xpEarned: 0,
                tier: currentTier,
            });
        }

        // Calculate rank in current tier
        const betterCount = await WeeklyLeagueRanking.countDocuments({
            weekKey,
            tier: currentTier,
            xpEarned: { $gt: ranking.xpEarned },
        });
        const currentRank = betterCount + 1;

        // Total participants in this tier
        const totalParticipants = await WeeklyLeagueRanking.countDocuments({
            weekKey,
            tier: currentTier,
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success({
            tier: currentTier,
            xpEarned: ranking.xpEarned,
            rank: currentRank,
            totalParticipants,
            xpMultiplier: leagueProgress.xpMultiplier,
            weekKey,
        }));
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}

/**
 * GET /leagues/leaderboard — Get weekly league leaderboard for student's current tier.
 */
export async function getWeeklyLeagueLeaderboard(req: AuthRequest, res: Response): Promise<void> {
    try {
        const studentId = req.user?._id?.toString();
        if (!studentId) {
            ResponseBuilder.send(res, 401, ResponseBuilder.error('UNAUTHORIZED', 'Authentication required'));
            return;
        }

        const studentOid = new mongoose.Types.ObjectId(studentId);
        const weekKey = getWeekKey(new Date());

        // Get current tier
        const leagueProgress = await LeagueProgress.findOne({ student: studentOid });
        const currentTier = leagueProgress?.currentTier ?? 'iron';

        // Fetch rankings for this week and tier, sorted by xpEarned desc
        const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
        const limit = 20;
        const skip = (page - 1) * limit;

        const rankings = await WeeklyLeagueRanking.find({ weekKey, tier: currentTier })
            .sort({ xpEarned: -1 })
            .skip(skip)
            .limit(limit)
            .populate('student', 'displayName name avatarUrl username')
            .lean();

        const total = await WeeklyLeagueRanking.countDocuments({ weekKey, tier: currentTier });

        const entries = rankings.map((r: any, idx: number) => {
            const studentInfo = r.student || {};
            return {
                rank: skip + idx + 1,
                displayName: studentInfo.displayName || studentInfo.name || 'Anonymous Student',
                avatarUrl: studentInfo.avatarUrl || '',
                xpEarned: r.xpEarned,
                isCurrentUser: studentInfo._id?.toString() === studentId,
            };
        });

        ResponseBuilder.send(
            res,
            200,
            ResponseBuilder.paginated(entries, page, limit, total)
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Server error';
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', message));
    }
}
