import api from '../services/api';
import type { ApiResponse, PaginationParams } from '../types/exam-system';

export interface BattleQuestionSnapshot {
    questionId: string;
    questionText: string;
    options: string[];
    correctKey: string;
    difficulty: number;
}

export interface BattleSession {
    _id: string;
    challenger: {
        _id: string;
        fullName: string;
        profile_photo?: string;
    };
    opponent: {
        _id: string;
        fullName: string;
        profile_photo?: string;
    };
    status: 'pending' | 'active' | 'completed' | 'expired';
    challengerScore: number;
    opponentScore: number;
    winner?: {
        _id: string;
        fullName: string;
    } | null;
    totalQuestions: number;
    timePerQuestion: number;
    questionSnapshots: BattleQuestionSnapshot[];
    startedAt: string;
    completedAt?: string;
}

export interface BattleAnswerResult {
    isCorrect: boolean;
    playerScore: number;
    opponentScore: number;
    battleComplete: boolean;
}

export interface BattleHistoryPage {
    items: BattleSession[];
    page: number;
    limit: number;
    total: number;
    pages: number;
}

const BASE = '/v1/brain-clash';

/** Join matchmaking queue (POST /v1/brain-clash/queue) */
export const joinQueue = (subjectId?: string) =>
    api.post<ApiResponse<{ battleId: string }>>(`${BASE}/queue`, { subjectId }).then((r) => r.data);

/** Leave matchmaking queue (DELETE /v1/brain-clash/queue) */
export const leaveQueue = () =>
    api.delete<ApiResponse<null>>(`${BASE}/queue`).then((r) => r.data);

/** Submit battle answer (POST /v1/brain-clash/:battleId/answer) */
export const submitAnswer = (battleId: string, questionIndex: number, selectedAnswer: string, timeTakenMs: number) =>
    api.post<ApiResponse<BattleAnswerResult>>(`${BASE}/${battleId}/answer`, {
        questionIndex,
        selectedAnswer,
        timeTakenMs,
    }).then((r) => r.data);

/** Get paginated battle history (GET /v1/brain-clash/history) */
export const getBattleHistory = (params?: PaginationParams) =>
    api.get<ApiResponse<BattleHistoryPage>>(`${BASE}/history`, { params }).then((r) => r.data);

/** Get battle details (GET /v1/brain-clash/:battleId) */
export const getBattleDetails = (battleId: string) =>
    api.get<ApiResponse<BattleSession>>(`${BASE}/${battleId}`).then((r) => r.data);
