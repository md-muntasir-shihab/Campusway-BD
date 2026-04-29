import api from '../services/api';
import type { ApiResponse } from '../types/exam-system';

const BASE = '/v1/practice';

/** GET /topics/:topicId — Start a practice session for a topic. */
export const startPractice = (topicId: string) =>
    api.get<ApiResponse<{ sessionId: string; questions: Record<string, unknown>[] }>>(
        `${BASE}/topics/${topicId}`,
    ).then((r) => r.data);

/** POST /sessions/:id/answer — Submit an answer during practice. */
export const submitAnswer = (sessionId: string, payload: { questionId: string; answer: string }) =>
    api.post<ApiResponse<{ isCorrect: boolean; correctAnswer: string; explanation?: string }>>(
        `${BASE}/sessions/${sessionId}/answer`,
        payload,
    ).then((r) => r.data);
