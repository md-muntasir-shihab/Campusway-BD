/**
 * Doubt Solver Service
 *
 * Manages doubt threads linked to questions, AI-generated explanations,
 * community replies with voting, pinning best answers, and thread resolution.
 *
 * Key functions:
 *   - createDoubt: Creates a doubt thread linked to a question, generates AI explanation
 *   - getDoubtsForQuestion: Returns paginated doubt threads for a question
 *   - addReply: Adds a community reply to a doubt thread
 *   - voteReply: Upvote/downvote a reply with voter tracking (one vote per user)
 *   - pinReply: Pin/unpin a reply as best answer
 *   - resolveThread: Mark a doubt thread as resolved
 *
 * Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6
 */
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import DoubtThread, { type IDoubtThread } from '../models/DoubtThread';
import QuestionBankQuestion from '../models/QuestionBankQuestion';

// ─── Exported Types ─────────────────────────────────────────

/** Paginated result wrapper for doubt threads. */
export interface PaginatedDoubts {
    threads: IDoubtThread[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

/** Vote direction type. */
export type VoteDirection = 'up' | 'down';

// ─── Constants ──────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 10;

// ─── AI Helper ──────────────────────────────────────────────

const apiKey = process.env.GEMINI_API_KEY || '';

/**
 * Generate an AI explanation for a question using Google Generative AI.
 *
 * Falls back to a placeholder string if the API key is missing or the
 * call fails, so doubt creation is never blocked by AI availability.
 *
 * Requirement 26.2
 */
async function generateAIExplanation(questionText: string, options: string[]): Promise<string> {
    if (!apiKey) {
        return 'AI explanation is currently unavailable. Please check community replies for help.';
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: 'gemini-1.5-flash',
            systemInstruction:
                'You are an expert tutor for Bangladeshi students preparing for university admission, ' +
                'secondary/higher-secondary exams, and job preparation tests. ' +
                'Explain the given question in a simple, clear way. ' +
                'Provide the explanation in both Bengali and English. ' +
                'Use step-by-step reasoning. Keep it concise but thorough.',
            generationConfig: {
                temperature: 0.3,
            },
        });

        const optionsText = options.length > 0
            ? `\nOptions:\n${options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}`
            : '';

        const prompt = `Please explain this question clearly for a student:\n\nQuestion: ${questionText}${optionsText}\n\nProvide a step-by-step explanation in both Bengali and English.`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return responseText || 'AI explanation could not be generated.';
    } catch (error) {
        console.error('[DoubtSolver] AI explanation generation failed:', (error as Error).message);
        return 'AI explanation is currently unavailable. Please check community replies for help.';
    }
}

// ─── Helpers ────────────────────────────────────────────────

function toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
}

// ─── createDoubt ────────────────────────────────────────────

/**
 * Create a new doubt thread linked to a question.
 *
 * Looks up the question to extract text and options for AI explanation
 * generation. The AI call is wrapped in try/catch so thread creation
 * succeeds even if AI is unavailable.
 *
 * Requirements: 26.1, 26.2
 *
 * @param questionId - The QuestionBankQuestion ObjectId
 * @param userId - The student creating the doubt
 * @returns The created DoubtThread document
 */
export async function createDoubt(
    questionId: string,
    userId: string,
): Promise<IDoubtThread> {
    const questionObjectId = toObjectId(questionId);
    const userObjectId = toObjectId(userId);

    // Look up the question to build the AI prompt
    const question = await QuestionBankQuestion.findById(questionObjectId);

    let aiExplanation: string | undefined;

    if (question) {
        const questionText = question.question_bn || question.question_en || '';
        const optionTexts = (question.options || []).map(
            (opt) => opt.text_bn || opt.text_en || '',
        );

        aiExplanation = await generateAIExplanation(questionText, optionTexts);
    }

    const thread = await DoubtThread.create({
        question: questionObjectId,
        createdBy: userObjectId,
        aiExplanation,
        status: 'open',
        replies: [],
        replyCount: 0,
    });

    return thread;
}

// ─── getDoubtsForQuestion ───────────────────────────────────

/**
 * Retrieve paginated doubt threads for a specific question.
 *
 * Threads are sorted newest-first (createdAt descending) to match the
 * index on { question: 1, createdAt: -1 }.
 *
 * Requirement 26.6
 *
 * @param questionId - The QuestionBankQuestion ObjectId
 * @param page - Page number (1-based, defaults to 1)
 * @returns Paginated doubt threads
 */
export async function getDoubtsForQuestion(
    questionId: string,
    page: number = 1,
): Promise<PaginatedDoubts> {
    const questionObjectId = toObjectId(questionId);
    const limit = DEFAULT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const [threads, total] = await Promise.all([
        DoubtThread.find({ question: questionObjectId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean<IDoubtThread[]>(),
        DoubtThread.countDocuments({ question: questionObjectId }),
    ]);

    return {
        threads,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
    };
}

// ─── addReply ───────────────────────────────────────────────

/**
 * Add a community reply to a doubt thread and increment replyCount.
 *
 * Requirement 26.3
 *
 * @param threadId - The DoubtThread ObjectId
 * @param userId - The user posting the reply
 * @param content - Reply text content
 * @returns The updated DoubtThread document
 */
export async function addReply(
    threadId: string,
    userId: string,
    content: string,
): Promise<IDoubtThread> {
    const thread = await DoubtThread.findById(toObjectId(threadId));
    if (!thread) {
        throw new Error('Doubt thread not found');
    }

    thread.replies.push({
        author: toObjectId(userId),
        content,
        upvotes: 0,
        downvotes: 0,
        voters: [],
        isPinned: false,
        createdAt: new Date(),
    });

    thread.replyCount = thread.replies.length;

    await thread.save();
    return thread;
}

// ─── voteReply ──────────────────────────────────────────────

/**
 * Upvote or downvote a reply with voter tracking.
 *
 * Each user can cast one vote per reply. If the user has already voted:
 *   - Same direction: removes the vote (toggle off)
 *   - Different direction: switches the vote
 *
 * Requirement 26.4
 *
 * @param threadId - The DoubtThread ObjectId
 * @param replyIndex - Zero-based index of the reply in the replies array
 * @param userId - The user casting the vote
 * @param vote - 'up' or 'down'
 * @returns The updated DoubtThread document
 */
export async function voteReply(
    threadId: string,
    replyIndex: number,
    userId: string,
    vote: VoteDirection,
): Promise<IDoubtThread> {
    const thread = await DoubtThread.findById(toObjectId(threadId));
    if (!thread) {
        throw new Error('Doubt thread not found');
    }

    if (replyIndex < 0 || replyIndex >= thread.replies.length) {
        throw new Error(
            `Reply index ${replyIndex} out of range (thread has ${thread.replies.length} replies)`,
        );
    }

    const reply = thread.replies[replyIndex];
    const userObjectId = toObjectId(userId);

    // Find existing vote by this user
    const existingVoterIndex = reply.voters.findIndex(
        (v) => v.userId.toString() === userObjectId.toString(),
    );

    if (existingVoterIndex !== -1) {
        const existingVote = reply.voters[existingVoterIndex].vote;

        if (existingVote === vote) {
            // Same direction — toggle off (remove vote)
            if (vote === 'up') {
                reply.upvotes = Math.max(0, reply.upvotes - 1);
            } else {
                reply.downvotes = Math.max(0, reply.downvotes - 1);
            }
            reply.voters.splice(existingVoterIndex, 1);
        } else {
            // Different direction — switch vote
            if (existingVote === 'up') {
                reply.upvotes = Math.max(0, reply.upvotes - 1);
                reply.downvotes += 1;
            } else {
                reply.downvotes = Math.max(0, reply.downvotes - 1);
                reply.upvotes += 1;
            }
            reply.voters[existingVoterIndex].vote = vote;
        }
    } else {
        // New vote
        if (vote === 'up') {
            reply.upvotes += 1;
        } else {
            reply.downvotes += 1;
        }
        reply.voters.push({ userId: userObjectId, vote });
    }

    // Mark the nested array as modified so Mongoose persists the change
    thread.markModified('replies');
    await thread.save();

    return thread;
}

// ─── pinReply ───────────────────────────────────────────────

/**
 * Pin or unpin a reply as the best answer (toggle).
 *
 * Requirement 26.5
 *
 * @param threadId - The DoubtThread ObjectId
 * @param replyIndex - Zero-based index of the reply
 * @returns The updated DoubtThread document
 */
export async function pinReply(
    threadId: string,
    replyIndex: number,
): Promise<IDoubtThread> {
    const thread = await DoubtThread.findById(toObjectId(threadId));
    if (!thread) {
        throw new Error('Doubt thread not found');
    }

    if (replyIndex < 0 || replyIndex >= thread.replies.length) {
        throw new Error(
            `Reply index ${replyIndex} out of range (thread has ${thread.replies.length} replies)`,
        );
    }

    // Toggle the pin status
    thread.replies[replyIndex].isPinned = !thread.replies[replyIndex].isPinned;

    thread.markModified('replies');
    await thread.save();

    return thread;
}

// ─── resolveThread ──────────────────────────────────────────

/**
 * Mark a doubt thread as resolved.
 *
 * Requirement 26.5
 *
 * @param threadId - The DoubtThread ObjectId
 * @returns The updated DoubtThread document
 */
export async function resolveThread(threadId: string): Promise<IDoubtThread> {
    const thread = await DoubtThread.findById(toObjectId(threadId));
    if (!thread) {
        throw new Error('Doubt thread not found');
    }

    thread.status = 'resolved';
    await thread.save();

    return thread;
}
