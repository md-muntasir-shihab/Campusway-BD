/**
 * Brain Clash Service
 *
 * Handles matchmaking queue, battle session creation, question delivery,
 * answer processing, and result computation for live 1v1 MCQ battles.
 *
 * Requirement: 29
 */
import mongoose from 'mongoose';
import BattleSession from '../models/BattleSession';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import { awardXP, awardCoins } from './GamificationService';

// ─── Types ──────────────────────────────────────────────────

interface QueueEntry {
    studentId: string;
    subjectId?: string;
    joinedAt: Date;
    resolve: (battleId: string) => void;
    timeout: ReturnType<typeof setTimeout>;
}

/** In-memory matchmaking queue */
const matchmakingQueue: QueueEntry[] = [];

/** Active SSE connections per battle */
const battleConnections = new Map<string, Set<{ studentId: string; res: any }>>();

// ─── Constants ──────────────────────────────────────────────

const QUEUE_TIMEOUT_MS = 30_000; // 30 seconds
const QUESTIONS_PER_BATTLE = 10;
const TIME_PER_QUESTION_SEC = 15;
const XP_WINNER = 100;
const XP_LOSER = 25;
const COINS_WINNER = 20;

// ─── Matchmaking ────────────────────────────────────────────

/**
 * Join the matchmaking queue. Returns a promise that resolves with battleId
 * when matched, or rejects on timeout.
 */
export function joinQueue(studentId: string, subjectId?: string): Promise<string> {
    // Check if student is already in queue
    const existing = matchmakingQueue.findIndex((e) => e.studentId === studentId);
    if (existing >= 0) {
        matchmakingQueue.splice(existing, 1);
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            const idx = matchmakingQueue.findIndex((e) => e.studentId === studentId);
            if (idx >= 0) matchmakingQueue.splice(idx, 1);
            reject(new Error('QUEUE_TIMEOUT'));
        }, QUEUE_TIMEOUT_MS);

        const entry: QueueEntry = { studentId, subjectId, joinedAt: new Date(), resolve, timeout };
        matchmakingQueue.push(entry);

        // Try to match immediately
        tryMatch();
    });
}

/**
 * Leave the matchmaking queue.
 */
export function leaveQueue(studentId: string): void {
    const idx = matchmakingQueue.findIndex((e) => e.studentId === studentId);
    if (idx >= 0) {
        clearTimeout(matchmakingQueue[idx].timeout);
        matchmakingQueue.splice(idx, 1);
    }
}

/**
 * Attempt to match two players from the queue.
 */
async function tryMatch(): Promise<void> {
    if (matchmakingQueue.length < 2) return;

    const player1 = matchmakingQueue.shift()!;
    const player2 = matchmakingQueue.shift()!;

    clearTimeout(player1.timeout);
    clearTimeout(player2.timeout);

    try {
        const battleId = await createBattle(player1.studentId, player2.studentId, player1.subjectId);
        player1.resolve(battleId);
        player2.resolve(battleId);
    } catch (err) {
        console.error('Failed to create battle:', err);
    }
}

// ─── Battle Creation ────────────────────────────────────────

async function createBattle(player1Id: string, player2Id: string, subjectId?: string): Promise<string> {
    // Pick random questions
    const filter: any = { status: 'approved', question_type: 'mcq' };
    if (subjectId) filter.subject = new mongoose.Types.ObjectId(subjectId);

    const questions = await QuestionBankQuestion.aggregate([
        { $match: filter },
        { $sample: { size: QUESTIONS_PER_BATTLE } },
        { $project: { _id: 1, question_text_en: 1, question_text_bn: 1, options: 1, correctKey: 1, difficulty_level: 1 } },
    ]);

    if (questions.length < 3) {
        throw new Error('Not enough questions available for battle');
    }

    const battle = await BattleSession.create({
        challenger: new mongoose.Types.ObjectId(player1Id),
        opponent: new mongoose.Types.ObjectId(player2Id),
        status: 'active',
        mode: 'ranked',
        questions: questions.map((q) => q._id),
        questionSnapshots: questions.map((q) => ({
            questionId: q._id,
            questionText: q.question_text_en || '',
            options: q.options || [],
            correctKey: q.correctKey || '',
            difficulty: q.difficulty_level || 2,
        })),
        challengerAnswers: [],
        opponentAnswers: [],
        challengerScore: 0,
        opponentScore: 0,
        currentQuestionIndex: 0,
        timePerQuestion: TIME_PER_QUESTION_SEC,
        totalQuestions: questions.length,
        startedAt: new Date(),
    });

    return battle._id.toString();
}

// ─── Answer Processing ──────────────────────────────────────

export interface BattleAnswerPayload {
    questionIndex: number;
    selectedAnswer: string;
    timeTakenMs: number;
}

/**
 * Process a player's answer during an active battle.
 */
export async function processAnswer(
    battleId: string,
    studentId: string,
    payload: BattleAnswerPayload,
): Promise<{ isCorrect: boolean; playerScore: number; opponentScore: number; battleComplete: boolean }> {
    const battle = await BattleSession.findById(battleId);
    if (!battle || battle.status !== 'active') {
        throw new Error('Battle not found or not active');
    }

    const isChallenger = battle.challenger.toString() === studentId;
    const snapshot = (battle as any).questionSnapshots?.[payload.questionIndex];
    if (!snapshot) throw new Error('Invalid question index');

    const isCorrect = payload.selectedAnswer.trim().toUpperCase() === (snapshot.correctKey || '').trim().toUpperCase();
    const points = isCorrect ? 10 : 0;

    const answerEntry = {
        questionId: snapshot.questionId,
        selectedAnswer: payload.selectedAnswer,
        isCorrect,
        timeTakenMs: payload.timeTakenMs,
        points,
    };

    if (isChallenger) {
        battle.challengerAnswers.push(answerEntry as any);
        battle.challengerScore = (battle.challengerScore || 0) + points;
    } else {
        battle.opponentAnswers.push(answerEntry as any);
        battle.opponentScore = (battle.opponentScore || 0) + points;
    }

    // Check if battle is complete
    const totalQ = (battle as any).totalQuestions || QUESTIONS_PER_BATTLE;
    const challengerDone = battle.challengerAnswers.length >= totalQ;
    const opponentDone = battle.opponentAnswers.length >= totalQ;
    const battleComplete = challengerDone && opponentDone;

    if (battleComplete) {
        battle.status = 'completed';
        battle.completedAt = new Date();

        // Determine winner
        if (battle.challengerScore > battle.opponentScore) {
            battle.winner = battle.challenger;
        } else if (battle.opponentScore > battle.challengerScore) {
            battle.winner = battle.opponent;
        }
        // else: draw, no winner

        // Award XP and coins
        try {
            const winnerId = battle.winner?.toString();
            const loserId = winnerId === battle.challenger.toString()
                ? battle.opponent.toString()
                : battle.challenger.toString();

            if (winnerId) {
                await awardXP(winnerId, {
                    baseXP: XP_WINNER,
                    difficultyFactor: 1,
                    event: 'brain_clash_win',
                    sourceId: battleId,
                });
                await awardCoins(winnerId, {
                    amount: COINS_WINNER,
                    event: 'brain_clash_win',
                    sourceId: battleId,
                });
                await awardXP(loserId, {
                    baseXP: XP_LOSER,
                    difficultyFactor: 1,
                    event: 'brain_clash_participation',
                    sourceId: battleId,
                });
            } else {
                // Draw
                await awardXP(battle.challenger.toString(), {
                    baseXP: XP_LOSER + 10,
                    difficultyFactor: 1,
                    event: 'brain_clash_draw',
                    sourceId: battleId,
                });
                await awardXP(battle.opponent.toString(), {
                    baseXP: XP_LOSER + 10,
                    difficultyFactor: 1,
                    event: 'brain_clash_draw',
                    sourceId: battleId,
                });
            }
        } catch (err) {
            console.error('Failed to award battle XP:', err);
        }
    }

    await battle.save();

    // Broadcast to SSE connections
    broadcastBattleUpdate(battleId, {
        type: battleComplete ? 'battle_complete' : 'answer_processed',
        challengerScore: battle.challengerScore,
        opponentScore: battle.opponentScore,
        battleComplete,
        winner: battle.winner?.toString() || null,
    });

    return {
        isCorrect,
        playerScore: isChallenger ? battle.challengerScore : battle.opponentScore,
        opponentScore: isChallenger ? battle.opponentScore : battle.challengerScore,
        battleComplete,
    };
}

// ─── SSE Connection Management ──────────────────────────────

export function registerSSEConnection(battleId: string, studentId: string, res: any): void {
    if (!battleConnections.has(battleId)) {
        battleConnections.set(battleId, new Set());
    }
    battleConnections.get(battleId)!.add({ studentId, res });
}

export function removeSSEConnection(battleId: string, studentId: string): void {
    const conns = battleConnections.get(battleId);
    if (!conns) return;
    for (const conn of conns) {
        if (conn.studentId === studentId) {
            conns.delete(conn);
            break;
        }
    }
    if (conns.size === 0) battleConnections.delete(battleId);
}

function broadcastBattleUpdate(battleId: string, data: any): void {
    const conns = battleConnections.get(battleId);
    if (!conns) return;
    const message = `data: ${JSON.stringify(data)}\n\n`;
    for (const conn of conns) {
        try {
            conn.res.write(message);
        } catch {
            // connection closed
        }
    }
}

// ─── Battle History ─────────────────────────────────────────

export async function getBattleHistory(
    studentId: string,
    page = 1,
    limit = 20,
): Promise<{ items: any[]; total: number; page: number; pages: number }> {
    const studentOid = new mongoose.Types.ObjectId(studentId);
    const filter = {
        $or: [{ challenger: studentOid }, { opponent: studentOid }],
        status: 'completed',
    };

    const total = await BattleSession.countDocuments(filter);
    const items = await BattleSession.find(filter)
        .populate('challenger', 'fullName profile_photo')
        .populate('opponent', 'fullName profile_photo')
        .sort({ completedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    return { items, total, page, pages: Math.ceil(total / limit) };
}

/**
 * Get a single battle by ID.
 */
export async function getBattle(battleId: string): Promise<any> {
    return BattleSession.findById(battleId)
        .populate('challenger', 'fullName profile_photo')
        .populate('opponent', 'fullName profile_photo')
        .lean();
}
