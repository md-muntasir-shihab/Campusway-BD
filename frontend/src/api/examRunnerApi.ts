import api from '../services/api';
import type {
    ApiResponse,
    DeviceInfo,
    AnswerUpdate,
    ScoreBreakdown,
    LeaderboardPage,
    PaginationParams,
} from '../types/exam-system';

const BASE = '/v1/exams';

/** POST /:id/start — Start an exam session. */
export const startExam = (examId: string, deviceInfo: DeviceInfo) =>
    api.post<ApiResponse<{ sessionId: string; startedAt: string; expiresAt: string }>>(
        `${BASE}/${examId}/start`,
        { deviceInfo },
    ).then((r) => r.data);

/** PATCH /sessions/:id/answers — Auto-save answers. */
export const saveAnswers = (sessionId: string, answers: AnswerUpdate[]) =>
    api.patch<ApiResponse<{ savedCount: number }>>(
        `${BASE}/sessions/${sessionId}/answers`,
        { answers },
    ).then((r) => r.data);

/** POST /:id/submit — Submit an exam session. */
export const submitExam = (examId: string, payload?: { sessionId?: string }) =>
    api.post<ApiResponse<{ submittedAt: string }>>(
        `${BASE}/${examId}/submit`,
        payload,
    ).then((r) => r.data);

/** GET /:id/result — Get exam result for authenticated student. */
export const getResult = (examId: string) =>
    api.get<ApiResponse<ScoreBreakdown>>(`${BASE}/${examId}/result`).then((r) => r.data);

/** GET /:id/leaderboard — Get exam leaderboard. */
export const getLeaderboard = (examId: string, params?: PaginationParams) =>
    api.get<ApiResponse<LeaderboardPage>>(`${BASE}/${examId}/leaderboard`, { params }).then((r) => r.data);
