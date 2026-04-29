/**
 * Battle Engine Service
 *
 * Manages live 1v1 MCQ battle sessions (Brain Clash):
 *   - createChallenge: select 10 random MCQs from a topic, create pending battle
 *   - acceptChallenge: validate opponent, activate battle
 *   - submitBattleAnswer: record answer, update score in real-time
 *   - completeBattle: determine winner, award XP/Coins
 *   - getBattleHistory: paginated battle history for a student
 *
 * Also exports a pure function `determineBattleWinner` for easy testing.
 *
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7
 */
import mongoose from 'mongoose';
import BattleSession, { IBattleSession } from '../models/BattleSession';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import { awardXP, awardCoins } from './GamificationService';

// ─── Constants ──────────────────────────────────────────────

/** Number of MCQ questions per battle */
const BATTLE_QUESTION_COUNT = 10;

/** Default battle duration in seconds */
const DEFAULT_BATTLE_DURATION = 300;

/** Items per page for battle history */
const BATTLE_HISTORY_PAGE_SIZE = 10;

/** XP/Coin rewards for battle outcomes */
const BATTLE_REWARDS = {
    winner: { xp: 50, coins: 20 },
    loser: { xp: 10, coins: 5 },
    draw: { xp: 25, coins: 10 },
};

// ─── Types ──────────────────────────────────────────────────

export interface BattleProgress {
    battleId: string;
    challengerScore: number;
    opponentScore: number;
    challengerAnswered: number;
    opponentAnswered: number;
    totalQuestions: number;
    isCorrect: boolean;
}

export interface BattleResult {
    battleId: string;
    result: 'challenger_win' | 'opponent_win' | 'draw';
    challengerScore: number;
    opponentScore: number;
    winner: string | null;
    xpAwarded: { challenger: number; opponent: number };
    coinsAwarded: { challenger: number; opponent: number };
    completedAt: Date;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/** Lean version of IBattleSession (plain object, no Mongoose Document methods) */
export type BattleSessionLean = Omit<IBattleSession, keyof mongoose.Document> & { _id: mongoose.Types.ObjectId };

// ─── Pure Logic Helpers ─────────────────────────────────────

/**
 * Determine the battle winner based on scores and time.
 *
 * Rules (Requirement 21.4):
 *   - Higher score wins
 *   - Equal scores: lower total time wins
 *   - Equal scores AND equal time: draw
 *
 * Pure function — no DB access, fully testable.
 */
export function determineBattleWinner(
    challengerScore: number,
    opponentScore: number,
    challengerTime: number,
    opponentTime: number,
): 'challenger_win' | 'opponent_win' | 'draw' {
    if (challengerScore > opponentScore) {
        return 'challenger_win';
    }
    if (opponentScore > challengerScore) {
        return 'opponent_win';
    }
    // Scores are equal — break tie by time (lower is better)
    if (challengerTime < opponentTime) {
        return 'challenger_win';
    }
    if (opponentTime < challengerTime) {
        return 'opponent_win';
    }
    // Equal scores and equal time
    return 'draw';
}

// ─── Helper ─────────────────────────────────────────────────

function toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
}

/**
 * Compute total answer time in milliseconds for a player's answers
 * relative to the battle start time.
 */
function computeTotalTime(
    answers: { answeredAt: Date }[],
    startedAt: Date,
): number {
    if (answers.length === 0) return 0;
    // Total time = last answer timestamp - battle start
    const lastAnswer = answers.reduce((latest, a) =>
        a.answeredAt > latest.answeredAt ? a : latest,
    );
    return lastAnswer.answeredAt.getTime() - startedAt.getTime();
}

// ─── Service Functions ──────────────────────────────────────

/**
 * Create a battle challenge.
 *
 * Selects 10 random MCQ questions from the given topic using $sample aggregation,
 * creates a BattleSession with status 'pending'.
 *
 * Requirement 21.1, 21.2
 */
export async function createChallenge(
    challengerId: string,
    opponentId: string,
    topicId: string,
): Promise<IBattleSession> {
    if (challengerId === opponentId) {
        throw new Error('Cannot challenge yourself');
    }

    const topicOid = toObjectId(topicId);

    // Select 10 random MCQ questions from the topic using $sample
    const questions = await QuestionBankQuestion.aggregate([
        {
            $match: {
                topic_id: topicOid,
                question_type: 'mcq',
                isArchived: false,
                isActive: true,
                status: { $in: ['published', 'draft'] },
            },
        },
        { $sample: { size: BATTLE_QUESTION_COUNT } },
        { $project: { _id: 1 } },
    ]);

    if (questions.length === 0) {
        throw new Error('No MCQ questions available for the selected topic');
    }

    const questionIds = questions.map(
        (q: { _id: mongoose.Types.ObjectId }) => q._id,
    );

    const battle = await BattleSession.create({
        challenger: toObjectId(challengerId),
        opponent: toObjectId(opponentId),
        topic: topicOid,
        questions: questionIds,
        status: 'pending',
        duration: DEFAULT_BATTLE_DURATION,
        challengerAnswers: [],
        opponentAnswers: [],
        challengerScore: 0,
        opponentScore: 0,
        result: 'pending',
        xpAwarded: { challenger: 0, opponent: 0 },
        coinsAwarded: { challenger: 0, opponent: 0 },
    });

    return battle;
}

/**
 * Accept a battle challenge.
 *
 * Validates the opponent matches, changes status to 'active', sets startedAt.
 *
 * Requirement 21.2
 */
export async function acceptChallenge(
    battleId: string,
    opponentId: string,
): Promise<IBattleSession> {
    const battle = await BattleSession.findById(battleId);

    if (!battle) {
        throw new Error('Battle not found');
    }

    if (battle.status !== 'pending') {
        throw new Error(`Cannot accept battle with status '${battle.status}'`);
    }

    if (battle.opponent.toString() !== opponentId) {
        throw new Error('Only the challenged opponent can accept this battle');
    }

    battle.status = 'active';
    battle.startedAt = new Date();
    await battle.save();

    return battle;
}

/**
 * Submit a battle answer.
 *
 * Records the answer for the player, checks correctness against the
 * question's correctKey, updates the player's score.
 * Returns BattleProgress with current scores.
 *
 * Requirement 21.3
 */
export async function submitBattleAnswer(
    battleId: string,
    playerId: string,
    questionId: string,
    answer: string,
): Promise<BattleProgress> {
    const battle = await BattleSession.findById(battleId);

    if (!battle) {
        throw new Error('Battle not found');
    }

    if (battle.status !== 'active') {
        throw new Error(`Cannot submit answer for battle with status '${battle.status}'`);
    }

    // Determine which player is answering
    const isChallenger = battle.challenger.toString() === playerId;
    const isOpponent = battle.opponent.toString() === playerId;

    if (!isChallenger && !isOpponent) {
        throw new Error('Player is not a participant in this battle');
    }

    const questionOid = toObjectId(questionId);

    // Verify the question is part of this battle
    const isValidQuestion = battle.questions.some(
        (qId) => qId.toString() === questionId,
    );
    if (!isValidQuestion) {
        throw new Error('Question is not part of this battle');
    }

    // Check if player already answered this question
    const playerAnswers = isChallenger
        ? battle.challengerAnswers
        : battle.opponentAnswers;

    const alreadyAnswered = playerAnswers.some(
        (a) => a.questionId.toString() === questionId,
    );
    if (alreadyAnswered) {
        throw new Error('Question already answered');
    }

    // Look up the question to check correctness
    const question = await QuestionBankQuestion.findById(questionId)
        .select('correctKey')
        .lean();

    if (!question) {
        throw new Error('Question not found');
    }

    const isCorrect = question.correctKey === answer;

    // Record the answer
    const answerEntry = {
        questionId: questionOid,
        answer,
        isCorrect,
        answeredAt: new Date(),
    };

    if (isChallenger) {
        battle.challengerAnswers.push(answerEntry);
        if (isCorrect) {
            battle.challengerScore += 1;
        }
    } else {
        battle.opponentAnswers.push(answerEntry);
        if (isCorrect) {
            battle.opponentScore += 1;
        }
    }

    await battle.save();

    return {
        battleId: battle._id.toString(),
        challengerScore: battle.challengerScore,
        opponentScore: battle.opponentScore,
        challengerAnswered: battle.challengerAnswers.length,
        opponentAnswered: battle.opponentAnswers.length,
        totalQuestions: battle.questions.length,
        isCorrect,
    };
}

/**
 * Complete a battle.
 *
 * Determines the winner (higher score wins, equal scores broken by time,
 * equal both = draw), awards XP/Coins to both players, sets status to 'completed'.
 *
 * Requirement 21.4, 21.5, 21.7
 */
export async function completeBattle(battleId: string): Promise<BattleResult> {
    const battle = await BattleSession.findById(battleId);

    if (!battle) {
        throw new Error('Battle not found');
    }

    if (battle.status === 'completed') {
        throw new Error('Battle is already completed');
    }

    if (battle.status !== 'active') {
        throw new Error(`Cannot complete battle with status '${battle.status}'`);
    }

    const startedAt = battle.startedAt ?? battle.createdAt;

    // Compute total time for each player
    const challengerTime = computeTotalTime(battle.challengerAnswers, startedAt);
    const opponentTime = computeTotalTime(battle.opponentAnswers, startedAt);

    // Determine winner
    const result = determineBattleWinner(
        battle.challengerScore,
        battle.opponentScore,
        challengerTime,
        opponentTime,
    );

    const now = new Date();
    const challengerId = battle.challenger.toString();
    const opponentId = battle.opponent.toString();

    // Determine XP/Coin awards based on result
    let challengerXP: number;
    let opponentXP: number;
    let challengerCoins: number;
    let opponentCoins: number;

    if (result === 'challenger_win') {
        challengerXP = BATTLE_REWARDS.winner.xp;
        opponentXP = BATTLE_REWARDS.loser.xp;
        challengerCoins = BATTLE_REWARDS.winner.coins;
        opponentCoins = BATTLE_REWARDS.loser.coins;
        battle.winner = battle.challenger;
    } else if (result === 'opponent_win') {
        challengerXP = BATTLE_REWARDS.loser.xp;
        opponentXP = BATTLE_REWARDS.winner.xp;
        challengerCoins = BATTLE_REWARDS.loser.coins;
        opponentCoins = BATTLE_REWARDS.winner.coins;
        battle.winner = battle.opponent;
    } else {
        // Draw
        challengerXP = BATTLE_REWARDS.draw.xp;
        opponentXP = BATTLE_REWARDS.draw.xp;
        challengerCoins = BATTLE_REWARDS.draw.coins;
        opponentCoins = BATTLE_REWARDS.draw.coins;
        battle.winner = undefined;
    }

    // Update battle record
    battle.result = result;
    battle.status = 'completed';
    battle.completedAt = now;
    battle.xpAwarded = { challenger: challengerXP, opponent: opponentXP };
    battle.coinsAwarded = { challenger: challengerCoins, opponent: opponentCoins };

    await battle.save();

    // Award XP and Coins to both players (Requirement 21.7)
    const battleIdStr = battle._id.toString();

    await Promise.all([
        awardXP(challengerId, {
            baseXP: challengerXP,
            difficultyFactor: 1,
            event: 'battle_complete',
            sourceId: battleIdStr,
        }),
        awardXP(opponentId, {
            baseXP: opponentXP,
            difficultyFactor: 1,
            event: 'battle_complete',
            sourceId: battleIdStr,
        }),
        awardCoins(challengerId, {
            amount: challengerCoins,
            event: 'battle_complete',
            sourceId: battleIdStr,
        }),
        awardCoins(opponentId, {
            amount: opponentCoins,
            event: 'battle_complete',
            sourceId: battleIdStr,
        }),
    ]);

    return {
        battleId: battleIdStr,
        result,
        challengerScore: battle.challengerScore,
        opponentScore: battle.opponentScore,
        winner: battle.winner ? battle.winner.toString() : null,
        xpAwarded: { challenger: challengerXP, opponent: opponentXP },
        coinsAwarded: { challenger: challengerCoins, opponent: opponentCoins },
        completedAt: now,
    };
}

/**
 * Get paginated battle history for a student.
 *
 * Returns battles where the student was either challenger or opponent,
 * sorted by most recent first. 10 items per page.
 *
 * Requirement 21.5, 21.6
 */
export async function getBattleHistory(
    studentId: string,
    page: number = 1,
): Promise<PaginatedResult<BattleSessionLean>> {
    const studentOid = toObjectId(studentId);
    const safePage = Math.max(1, Math.floor(page));
    const skip = (safePage - 1) * BATTLE_HISTORY_PAGE_SIZE;

    const filter = {
        $or: [{ challenger: studentOid }, { opponent: studentOid }],
    };

    const [data, total] = await Promise.all([
        BattleSession.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(BATTLE_HISTORY_PAGE_SIZE)
            .lean() as unknown as Promise<BattleSessionLean[]>,
        BattleSession.countDocuments(filter),
    ]);

    return {
        data,
        total,
        page: safePage,
        limit: BATTLE_HISTORY_PAGE_SIZE,
        totalPages: Math.ceil(total / BATTLE_HISTORY_PAGE_SIZE),
    };
}
