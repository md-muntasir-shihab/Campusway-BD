/**
 * Gamification Service
 *
 * Manages XP, Coins, Streaks, League progression, Badges, daily login bonus,
 * and the student gamification profile.
 *
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8, 19.10
 */
import mongoose from 'mongoose';
import XPLog from '../models/XPLog';
import CoinLog from '../models/CoinLog';
import StreakRecord from '../models/StreakRecord';
import LeagueProgress from '../models/LeagueProgress';
import Badge from '../models/Badge';
import StudentBadge from '../models/StudentBadge';
import StudentAnalyticsAggregate from '../models/StudentAnalyticsAggregate';
import UserPoints from '../models/UserPoints';
import WeeklyLeagueRanking from '../models/WeeklyLeagueRanking';

// ─── Types ──────────────────────────────────────────────────

export interface XPEvent {
    /** Base XP amount before multipliers */
    baseXP: number;
    /** Difficulty factor (e.g. 1.0 for easy, 1.5 for medium, 2.0 for hard) */
    difficultyFactor: number;
    /** Event name (e.g. 'exam_complete', 'correct_answer', 'streak_bonus') */
    event: string;
    /** Optional source reference (exam, battle, etc.) */
    sourceId?: string;
}

export interface CoinEvent {
    /** Number of coins to award */
    amount: number;
    /** Event name (e.g. 'first_exam', '7_day_streak', 'top_10_weekly') */
    event: string;
    /** Optional source reference */
    sourceId?: string;
}

export interface StreakInfo {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date | null;
    incrementedToday: boolean;
}

export type LeagueTier = 'iron' | 'bronze' | 'silver' | 'gold' | 'diamond' | 'platinum';

export interface LeagueStatus {
    currentTier: LeagueTier;
    mockTestsCompleted: number;
    xpMultiplier: number;
    promoted: boolean;
    previousTier?: LeagueTier;
}

export interface GamificationProfile {
    xpTotal: number;
    coinsBalance: number;
    streak: StreakInfo;
    league: LeagueStatus;
    currentStreak: number;
    longestStreak: number;
    leagueTier: LeagueTier;
    xpMultiplier: number;
    streakCalendar: any[];
    dailyBonusAvailable?: boolean;
    badges: {
        code: string;
        title: string;
        title_bn?: string;
        description: string;
        iconUrl?: string;
        category?: string;
        awardedAt: Date;
    }[];
}

// ─── League Tier Thresholds ─────────────────────────────────

/**
 * League tier thresholds based on mockTestsCompleted.
 *
 * Iron:     0–9
 * Bronze:  10–24
 * Silver:  25–49
 * Gold:    50–99
 * Diamond: 100–199
 * Platinum: 200+
 */
export const LEAGUE_THRESHOLDS: { tier: LeagueTier; minTests: number }[] = [
    { tier: 'platinum', minTests: 200 },
    { tier: 'diamond', minTests: 100 },
    { tier: 'gold', minTests: 50 },
    { tier: 'silver', minTests: 25 },
    { tier: 'bronze', minTests: 10 },
    { tier: 'iron', minTests: 0 },
];

/** XP multipliers per league tier (Requirement 19.5) */
export const TIER_XP_MULTIPLIERS: Record<LeagueTier, number> = {
    iron: 1.0,
    bronze: 1.1,
    silver: 1.25,
    gold: 1.5,
    diamond: 1.75,
    platinum: 2.0,
};

/** Daily login bonus defaults (Requirement 19.7) */
export const DAILY_LOGIN_BONUS = {
    xp: 10,
    coins: 5,
};

// ─── Pure Logic Helpers ─────────────────────────────────────

/**
 * Determine the league tier for a given number of mock tests completed.
 * Pure function — no DB access.
 */
export function determineTier(mockTestsCompleted: number): LeagueTier {
    for (const { tier, minTests } of LEAGUE_THRESHOLDS) {
        if (mockTestsCompleted >= minTests) {
            return tier;
        }
    }
    return 'iron';
}

/**
 * Compute streak update result given current date and last activity date.
 * Pure function — no DB access, fully testable.
 *
 * Rules:
 *   - If lastActivityDate is null: streak starts at 1
 *   - If same calendar day (UTC): no change
 *   - If consecutive day (1 day gap): increment streak
 *   - If gap > 1 day: reset streak to 1
 *   - longestStreak is updated if currentStreak exceeds it
 */
export function computeStreakUpdate(
    currentStreak: number,
    longestStreak: number,
    lastActivityDate: Date | null,
    now: Date,
): { currentStreak: number; longestStreak: number; incrementedToday: boolean } {
    if (!lastActivityDate) {
        return {
            currentStreak: 1,
            longestStreak: Math.max(longestStreak, 1),
            incrementedToday: true,
        };
    }

    const daysDiff = diffInCalendarDays(lastActivityDate, now);

    if (daysDiff <= 0) {
        // Same day — no change
        return { currentStreak, longestStreak, incrementedToday: false };
    }

    if (daysDiff === 1) {
        // Consecutive day — increment
        const newStreak = currentStreak + 1;
        return {
            currentStreak: newStreak,
            longestStreak: Math.max(longestStreak, newStreak),
            incrementedToday: true,
        };
    }

    // Gap > 1 day — reset
    return {
        currentStreak: 1,
        longestStreak: Math.max(longestStreak, 1),
        incrementedToday: true,
    };
}

/**
 * Compute the number of calendar days between two dates (UTC).
 * Returns the difference in days (b - a) using UTC date boundaries.
 */
export function diffInCalendarDays(a: Date, b: Date): number {
    const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
    const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
    return Math.round((utcB - utcA) / (1000 * 60 * 60 * 24));
}

/**
 * Compute XP amount: base × difficulty × streak multiplier.
 * Pure function.
 */
export function computeXP(baseXP: number, difficultyFactor: number, streakMultiplier: number): number {
    return Math.round(baseXP * difficultyFactor * streakMultiplier);
}

// ─── Helper ─────────────────────────────────────────────────

function toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
}

function todayDateKey(now: Date = new Date()): string {
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

// ─── Service Functions ──────────────────────────────────────

/**
 * Award XP to a student.
 *
 * Calculates: base_xp × difficulty_factor × streak_multiplier
 * Logs to XPLog and updates StudentAnalyticsAggregate.xpTotal.
 *
 * Requirement 19.1
 */
function getWeekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function awardXP(studentId: string, event: XPEvent): Promise<void> {
    const studentOid = toObjectId(studentId);

    // Get current streak multiplier from league progress
    const league = await LeagueProgress.findOne({ student: studentOid }).lean();
    const streakMultiplier = league?.xpMultiplier ?? 1;

    const amount = computeXP(event.baseXP, event.difficultyFactor, streakMultiplier);

    // Create XP log entry
    await XPLog.create({
        student: studentOid,
        amount,
        event: event.event,
        sourceId: event.sourceId ? toObjectId(event.sourceId) : undefined,
        multiplier: streakMultiplier,
    });

    // Update aggregate xpTotal
    await StudentAnalyticsAggregate.updateOne(
        { student: studentOid },
        { $inc: { xpTotal: amount } },
        { upsert: true },
    );

    // Sync with UserPoints.xp
    await UserPoints.updateOne(
        { student: studentOid },
        { $inc: { xp: amount } },
        { upsert: true }
    );

    // Sync with WeeklyLeagueRanking.xpEarned
    const weekKey = getWeekKey(new Date());
    const currentTier = league?.currentTier ?? 'iron';
    await WeeklyLeagueRanking.updateOne(
        { student: studentOid, weekKey },
        {
            $inc: { xpEarned: amount },
            $setOnInsert: { tier: currentTier }
        },
        { upsert: true }
    );
}

/**
 * Award coins to a student.
 *
 * Logs to CoinLog collection.
 *
 * Requirement 19.2
 */
export async function awardCoins(studentId: string, event: CoinEvent): Promise<void> {
    const studentOid = toObjectId(studentId);

    await CoinLog.create({
        student: studentOid,
        amount: event.amount,
        event: event.event,
        sourceId: event.sourceId ? toObjectId(event.sourceId) : undefined,
    });

    // Sync with UserPoints.coins
    await UserPoints.updateOne(
        { student: studentOid },
        { $inc: { coins: event.amount } },
        { upsert: true }
    );
}

/**
 * Update a student's streak record.
 *
 * Checks lastActivityDate, increments currentStreak if consecutive day,
 * resets if gap > 1 day, updates longestStreak and streakCalendar.
 *
 * Requirement 19.3
 */
export async function updateStreak(studentId: string): Promise<StreakInfo> {
    const studentOid = toObjectId(studentId);
    const now = new Date();

    // Find or create streak record
    let record = await StreakRecord.findOne({ student: studentOid });
    if (!record) {
        record = new StreakRecord({
            student: studentOid,
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: null,
            streakCalendar: [],
        });
    }

    const result = computeStreakUpdate(
        record.currentStreak,
        record.longestStreak,
        record.lastActivityDate,
        now,
    );

    record.currentStreak = result.currentStreak;
    record.longestStreak = result.longestStreak;

    if (result.incrementedToday) {
        record.lastActivityDate = now;

        // Update streak calendar (keep last 365 days)
        const dateKey = todayDateKey(now);
        const existingEntry = record.streakCalendar.find((e) => e.date === dateKey);
        if (!existingEntry) {
            record.streakCalendar.push({ date: dateKey, active: true });
            // Trim to last 365 entries
            if (record.streakCalendar.length > 365) {
                record.streakCalendar = record.streakCalendar.slice(-365);
            }
        }
    }

    await record.save();

    // Also sync streak to StudentAnalyticsAggregate
    await StudentAnalyticsAggregate.updateOne(
        { student: studentOid },
        {
            $set: {
                currentStreak: result.currentStreak,
                longestStreak: result.longestStreak,
                lastActivityDate: now,
            },
        },
        { upsert: true },
    );

    return {
        currentStreak: result.currentStreak,
        longestStreak: result.longestStreak,
        lastActivityDate: record.lastActivityDate,
        incrementedToday: result.incrementedToday,
    };
}

/**
 * Check and apply league promotion for a student.
 *
 * Tier thresholds based on mockTestsCompleted:
 *   Iron:     0–9
 *   Bronze:  10–24
 *   Silver:  25–49
 *   Gold:    50–99
 *   Diamond: 100–199
 *   Platinum: 200+
 *
 * Requirements 19.4, 19.5
 */
export async function checkLeaguePromotion(studentId: string): Promise<LeagueStatus> {
    const studentOid = toObjectId(studentId);

    // Find or create league progress
    let league = await LeagueProgress.findOne({ student: studentOid });
    if (!league) {
        league = await LeagueProgress.create({
            student: studentOid,
            currentTier: 'iron',
            mockTestsCompleted: 0,
            xpMultiplier: TIER_XP_MULTIPLIERS.iron,
            history: [{ tier: 'iron', achievedAt: new Date() }],
        });
    }

    const previousTier = league.currentTier;
    const newTier = determineTier(league.mockTestsCompleted);
    let promoted = false;

    if (newTier !== previousTier) {
        league.currentTier = newTier;
        league.xpMultiplier = TIER_XP_MULTIPLIERS[newTier];
        league.promotedAt = new Date();
        league.history.push({ tier: newTier, achievedAt: new Date() });
        promoted = true;
        await league.save();

        // Sync league tier to analytics aggregate
        await StudentAnalyticsAggregate.updateOne(
            { student: studentOid },
            { $set: { leagueTier: newTier } },
            { upsert: true },
        );

        // Trigger milestones and badges
        await checkAndAwardMilestones(studentId, 'league');
    }

    return {
        currentTier: league.currentTier,
        mockTestsCompleted: league.mockTestsCompleted,
        xpMultiplier: league.xpMultiplier,
        promoted,
        previousTier: promoted ? previousTier : undefined,
    };
}

/**
 * Award a badge to a student by badge code.
 *
 * Finds the badge by code, creates a StudentBadge association.
 * Silently skips if badge already awarded (unique constraint).
 *
 * Requirement 19.6
 */
export async function awardBadge(studentId: string, badgeCode: string): Promise<void> {
    const studentOid = toObjectId(studentId);

    const badge = await Badge.findOne({ code: badgeCode.toLowerCase(), isActive: true }).lean();
    if (!badge) {
        return; // Badge not found or inactive — skip silently
    }

    try {
        await StudentBadge.create({
            student: studentOid,
            badge: badge._id,
            source: 'auto',
            awardedAt: new Date(),
        });
    } catch (err: unknown) {
        // Duplicate key error (11000) means badge already awarded — ignore
        if (err instanceof Error && 'code' in err && (err as { code: number }).code === 11000) {
            return;
        }
        throw err;
    }

    // Award badge XP/Coin rewards if configured
    if (badge.xpReward && badge.xpReward > 0) {
        await awardXP(studentId, {
            baseXP: badge.xpReward,
            difficultyFactor: 1,
            event: 'badge_reward',
            sourceId: (badge._id as mongoose.Types.ObjectId).toString(),
        });
    }

    if (badge.coinReward && badge.coinReward > 0) {
        await awardCoins(studentId, {
            amount: badge.coinReward,
            event: 'badge_reward',
            sourceId: (badge._id as mongoose.Types.ObjectId).toString(),
        });
    }
}

export async function detectAndResetBrokenStreak(studentId: string): Promise<void> {
    const studentOid = toObjectId(studentId);
    const now = new Date();
    const record = await StreakRecord.findOne({ student: studentOid });
    if (record && record.currentStreak > 0 && record.lastActivityDate) {
        const daysDiff = diffInCalendarDays(record.lastActivityDate, now);
        if (daysDiff > 1) {
            record.currentStreak = 0;
            await record.save();

            await StudentAnalyticsAggregate.updateOne(
                { student: studentOid },
                { $set: { currentStreak: 0 } },
                { upsert: true }
            );
        }
    }
}

export async function checkAndAwardMilestones(
    studentId: string,
    triggerType: 'streak' | 'exam' | 'league'
): Promise<void> {
    const studentOid = toObjectId(studentId);

    if (triggerType === 'streak') {
        const streakRecord = await StreakRecord.findOne({ student: studentOid }).lean();
        if (!streakRecord) return;
        const current = streakRecord.currentStreak;

        const streakMilestones = [
            { threshold: 3, amount: 10, event: 'streak_3_milestone' },
            { threshold: 7, amount: 25, event: 'streak_7_milestone' },
            { threshold: 30, amount: 100, event: 'streak_30_milestone' },
        ];

        for (const milestone of streakMilestones) {
            if (current >= milestone.threshold) {
                const alreadyAwarded = await CoinLog.exists({
                    student: studentOid,
                    event: milestone.event,
                });
                if (!alreadyAwarded) {
                    await awardCoins(studentId, {
                        amount: milestone.amount,
                        event: milestone.event,
                    });
                    await evaluateBadges(studentId, 'streak_milestone');
                }
            }
        }
    } else if (triggerType === 'exam') {
        const examCount = await mongoose.model('ExamSession').countDocuments({
            student: studentOid,
            status: 'submitted',
        });

        const examMilestones = [
            { threshold: 1, amount: 15, event: 'exams_1_milestone' },
            { threshold: 5, amount: 50, event: 'exams_5_milestone' },
            { threshold: 10, amount: 100, event: 'exams_10_milestone' },
            { threshold: 25, amount: 250, event: 'exams_25_milestone' },
        ];

        for (const milestone of examMilestones) {
            if (examCount >= milestone.threshold) {
                const alreadyAwarded = await CoinLog.exists({
                    student: studentOid,
                    event: milestone.event,
                });
                if (!alreadyAwarded) {
                    await awardCoins(studentId, {
                        amount: milestone.amount,
                        event: milestone.event,
                    });
                    await evaluateBadges(studentId, 'exam_complete');
                }
            }
        }
    } else if (triggerType === 'league') {
        const league = await LeagueProgress.findOne({ student: studentOid }).lean();
        if (!league) return;
        const tier = league.currentTier;

        const leagueMilestones = [
            { tier: 'bronze', amount: 20, event: 'league_bronze_milestone' },
            { tier: 'silver', amount: 50, event: 'league_silver_milestone' },
            { tier: 'gold', amount: 100, event: 'league_gold_milestone' },
            { tier: 'platinum', amount: 300, event: 'league_platinum_milestone' },
        ];

        for (const milestone of leagueMilestones) {
            const tiers: LeagueTier[] = ['iron', 'bronze', 'silver', 'gold', 'diamond', 'platinum'];
            const currentIdx = tiers.indexOf(tier);
            const milestoneIdx = tiers.indexOf(milestone.tier as LeagueTier);

            if (currentIdx >= milestoneIdx && milestoneIdx > 0) {
                const alreadyAwarded = await CoinLog.exists({
                    student: studentOid,
                    event: milestone.event,
                });
                if (!alreadyAwarded) {
                    await awardCoins(studentId, {
                        amount: milestone.amount,
                        event: milestone.event,
                    });
                    await evaluateBadges(studentId, 'league_promotion');
                }
            }
        }
    }
}

export async function evaluateBadges(
    studentId: string,
    eventType: 'exam_complete' | 'streak_milestone' | 'league_promotion'
): Promise<void> {
    const studentOid = toObjectId(studentId);

    if (eventType === 'exam_complete') {
        const examCount = await mongoose.model('ExamSession').countDocuments({
            student: studentOid,
            status: 'submitted',
        });

        if (examCount >= 5) {
            await awardBadge(studentId, 'speed_demon');
        }

        if (examCount >= 10) {
            await awardBadge(studentId, 'academic_champion');
        }

        const perfectExam = await mongoose.model('ExamSession').findOne({
            student: studentOid,
            status: 'submitted',
            'scoreBreakdown.percentage': 100,
        }).lean();

        if (perfectExam) {
            await awardBadge(studentId, 'perfectionist');
        }
    } else if (eventType === 'streak_milestone') {
        const streakRecord = await StreakRecord.findOne({ student: studentOid }).lean();
        if (streakRecord) {
            const current = streakRecord.currentStreak;
            if (current >= 3) {
                await awardBadge(studentId, 'consistent_3');
            }
            if (current >= 7) {
                await awardBadge(studentId, 'consistent_7');
            }
            if (current >= 30) {
                await awardBadge(studentId, 'super_consistent');
            }
        }
    } else if (eventType === 'league_promotion') {
        const league = await LeagueProgress.findOne({ student: studentOid }).lean();
        if (league) {
            const tier = league.currentTier;
            if (tier === 'bronze') await awardBadge(studentId, 'league_bronze');
            if (tier === 'silver') await awardBadge(studentId, 'league_silver');
            if (tier === 'gold') await awardBadge(studentId, 'league_gold');
            if (tier === 'platinum') await awardBadge(studentId, 'league_platinum');
        }
    }
}

export async function seedBadges(): Promise<void> {
    const defaultBadges = [
        {
            code: 'speed_demon',
            title: 'Speed Demon',
            title_bn: 'গতি দানব',
            description: 'Finish 5 exams in record time',
            criteriaType: 'auto',
            category: 'academic',
            xpReward: 100,
            coinReward: 50,
            isActive: true,
        },
        {
            code: 'academic_champion',
            title: 'Academic Champion',
            title_bn: 'শিক্ষা চ্যাম্পিয়ন',
            description: 'Complete 10 exams successfully',
            criteriaType: 'auto',
            category: 'academic',
            xpReward: 200,
            coinReward: 100,
            isActive: true,
        },
        {
            code: 'perfectionist',
            title: 'Perfectionist',
            title_bn: 'নিখুঁত অর্জনকারী',
            description: 'Score 100% on any exam',
            criteriaType: 'auto',
            category: 'academic',
            xpReward: 150,
            coinReward: 75,
            isActive: true,
        },
        {
            code: 'consistent_3',
            title: '3-Day Builder',
            title_bn: '৩-দিনের ধারাবাহিকতা',
            description: 'Maintain a 3-day study streak',
            criteriaType: 'auto',
            category: 'streak',
            xpReward: 50,
            coinReward: 20,
            isActive: true,
        },
        {
            code: 'consistent_7',
            title: 'Weekly Warrior',
            title_bn: 'সাপ্তাহিক যোদ্ধা',
            description: 'Maintain a 7-day study streak',
            criteriaType: 'auto',
            category: 'streak',
            xpReward: 120,
            coinReward: 50,
            isActive: true,
        },
        {
            code: 'super_consistent',
            title: 'Monthly Legend',
            title_bn: 'মাসিক কিংবদন্তি',
            description: 'Maintain a 30-day study streak',
            criteriaType: 'auto',
            category: 'streak',
            xpReward: 500,
            coinReward: 250,
            isActive: true,
        },
        {
            code: 'league_bronze',
            title: 'Bronze League Competitor',
            title_bn: 'ব্রোঞ্জ লীগ প্রতিযোগী',
            description: 'Reach Bronze League',
            criteriaType: 'auto',
            category: 'league',
            xpReward: 50,
            coinReward: 25,
            isActive: true,
        },
        {
            code: 'league_silver',
            title: 'Silver League Competitor',
            title_bn: 'সিলভার লীগ প্রতিযোগী',
            description: 'Reach Silver League',
            criteriaType: 'auto',
            category: 'league',
            xpReward: 100,
            coinReward: 50,
            isActive: true,
        },
        {
            code: 'league_gold',
            title: 'Gold League Legend',
            title_bn: 'গোল্ড লীগ কিংবদন্তি',
            description: 'Reach Gold League',
            criteriaType: 'auto',
            category: 'league',
            xpReward: 200,
            coinReward: 100,
            isActive: true,
        },
        {
            code: 'league_platinum',
            title: 'Platinum League Master',
            title_bn: 'প্ল্যাটিনাম লীগ মাস্টার',
            description: 'Reach Platinum League',
            criteriaType: 'auto',
            category: 'league',
            xpReward: 500,
            coinReward: 250,
            isActive: true,
        },
    ];

    for (const b of defaultBadges) {
        await Badge.updateOne({ code: b.code }, { $set: b }, { upsert: true });
    }
    console.log('✅ [GamificationService] Seeded default badges.');
}

/**
 * Get a student's full gamification profile.
 *
 * Returns XP total, coins balance, streak info, league status, and badges.
 *
 * Requirement 19.10
 */
export async function getStudentGamificationProfile(studentId: string): Promise<GamificationProfile> {
    const studentOid = toObjectId(studentId);

    // Fetch all data in parallel
    const [analytics, streakRecord, league, studentBadges, coinLogs] = await Promise.all([
        StudentAnalyticsAggregate.findOne({ student: studentOid }).lean(),
        StreakRecord.findOne({ student: studentOid }).lean(),
        LeagueProgress.findOne({ student: studentOid }).lean(),
        StudentBadge.find({ student: studentOid })
            .populate<{ badge: { code: string; title: string; title_bn?: string; description: string; iconUrl?: string; category?: string } }>({
                path: 'badge',
                select: 'code title title_bn description iconUrl category',
            })
            .sort({ awardedAt: -1 })
            .lean(),
        CoinLog.aggregate([
            { $match: { student: studentOid } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
    ]);

    const xpTotal = analytics?.xpTotal ?? 0;
    const coinsBalance = coinLogs.length > 0 ? coinLogs[0].total : 0;

    const streak: StreakInfo = {
        currentStreak: streakRecord?.currentStreak ?? 0,
        longestStreak: streakRecord?.longestStreak ?? 0,
        lastActivityDate: streakRecord?.lastActivityDate ?? null,
        incrementedToday: false, // Read-only snapshot
    };

    const leagueStatus: LeagueStatus = {
        currentTier: league?.currentTier ?? 'iron',
        mockTestsCompleted: league?.mockTestsCompleted ?? 0,
        xpMultiplier: league?.xpMultiplier ?? 1,
        promoted: false, // Read-only snapshot
    };

    const badges = studentBadges
        .filter((sb) => sb.badge) // Filter out any with deleted badge refs
        .map((sb) => {
            const b = sb.badge as unknown as {
                code: string;
                title: string;
                title_bn?: string;
                description: string;
                iconUrl?: string;
                category?: string;
            };
            return {
                code: b.code,
                title: b.title,
                title_bn: b.title_bn,
                description: b.description,
                iconUrl: b.iconUrl,
                category: b.category,
                awardedAt: sb.awardedAt,
            };
        });

    // Check if daily claimed today
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    const dailyClaimed = await XPLog.exists({
        student: studentOid,
        event: 'daily_login',
        createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    return {
        xpTotal,
        coinsBalance,
        streak,
        league: leagueStatus,
        badges,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        leagueTier: leagueStatus.currentTier,
        xpMultiplier: leagueStatus.xpMultiplier,
        streakCalendar: streakRecord?.streakCalendar ?? [],
        dailyBonusAvailable: !dailyClaimed,
    };
}

/**
 * Award daily login bonus XP and coins.
 *
 * Only awards once per UTC calendar day. Uses XPLog/CoinLog with
 * 'daily_login' event to check if already claimed today.
 *
 * Requirement 19.7
 */
export async function dailyLoginBonus(studentId: string): Promise<{ awarded: boolean; xp: number; coins: number }> {
    const studentOid = toObjectId(studentId);
    const now = new Date();

    // Check if already claimed today (UTC day boundaries)
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const endOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

    const existingClaim = await XPLog.findOne({
        student: studentOid,
        event: 'daily_login',
        createdAt: { $gte: startOfDay, $lt: endOfDay },
    }).lean();

    if (existingClaim) {
        return { awarded: false, xp: 0, coins: 0 };
    }

    // Award XP
    await awardXP(studentId, {
        baseXP: DAILY_LOGIN_BONUS.xp,
        difficultyFactor: 1,
        event: 'daily_login',
    });

    // Award Coins
    await awardCoins(studentId, {
        amount: DAILY_LOGIN_BONUS.coins,
        event: 'daily_login',
    });

    // Also update streak on login
    await updateStreak(studentId);

    // Update lastLoginDate in UserPoints
    await UserPoints.updateOne(
        { student: studentOid },
        { $set: { lastLoginDate: now } },
        { upsert: true }
    );

    // Trigger milestone/badge updates for streak
    await checkAndAwardMilestones(studentId, 'streak');

    return {
        awarded: true,
        xp: DAILY_LOGIN_BONUS.xp,
        coins: DAILY_LOGIN_BONUS.coins,
    };
}
