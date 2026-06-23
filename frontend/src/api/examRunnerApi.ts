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

export interface ExamStartResponse {
    session: {
        _id?: string;
        sessionId?: string;
        startedAt?: string;
        expiresAt?: string;
    };
    questions: Array<Record<string, unknown>>;
    timer: {
        durationMinutes: number;
        startedAt: string;
        expiresAt: string;
        remainingSeconds: number;
    };
}

function toBackendDeviceInfo(deviceInfo: DeviceInfo) {
    return {
        userAgent: deviceInfo.userAgent,
        browserInfo: `${deviceInfo.screenResolution || 'unknown-screen'} ${deviceInfo.timezone || 'unknown-timezone'}`,
        ipAddress: 'browser',
        deviceFingerprint: deviceInfo.fingerprint,
    };
}

/** POST /:id/start — Start an exam session. */
export const startExam = (examId: string, deviceInfo: DeviceInfo) =>
    api.post<ApiResponse<ExamStartResponse>>(
        `${BASE}/${examId}/start`,
        { examId, deviceInfo: toBackendDeviceInfo(deviceInfo) },
    ).then((r) => r.data);

/** PATCH /sessions/:id/answers — Auto-save answers. */
export const saveAnswers = (sessionId: string, answers: AnswerUpdate[]) =>
    api.patch<ApiResponse<{ savedCount: number }>>(
        `${BASE}/sessions/${sessionId}/answers`,
        { sessionId, answers },
    ).then((r) => r.data);

/** POST /:id/submit — Submit an exam session. */
export const submitExam = (examId: string, payload?: { sessionId?: string }) =>
    api.post<ApiResponse<{ submittedAt: string }>>(
        `${BASE}/${examId}/submit`,
        { ...payload, submissionType: 'manual' },
    ).then((r) => r.data);

/** GET /:id/result — Get exam result for authenticated student. */
export const getResult = (examId: string) =>
    api.get<ApiResponse<ScoreBreakdown>>(`${BASE}/${examId}/result`).then((r) => r.data);

/** GET /:id/leaderboard — Get exam leaderboard. */
export const getLeaderboard = (examId: string, params?: PaginationParams) =>
    api.get<ApiResponse<LeaderboardPage>>(`${BASE}/${examId}/leaderboard`, { params }).then((r) => r.data);

// ─── Anti-cheat signal ─────────────────────────────────────────────────────
// Mounted at /api (not /api/v1) — see backend studentExamRoutes.

/** Anti-cheat signal types emitted by the in-exam Signal Collector. */
export type AntiCheatSignalType =
    | 'tab_switch'
    | 'fullscreen_exit'
    | 'copy_attempt'
    | 'resume'
    | 'client_error'
    | 'blur'
    | 'context_menu_blocked';

export interface AntiCheatSignalPayload {
    eventType: AntiCheatSignalType;
    attemptRevision: number;
    metadata?: Record<string, unknown>;
    timestamp: number;
}

/** Decision returned by the AntiCheat Engine. Severity: logged < warn < lock <= force_submit. */
export interface AntiCheatDecision {
    action: 'logged' | 'warn' | 'lock' | 'force_submit';
    warningMessage?: string;
    remainingViolations?: number;
    sessionState?: 'active' | 'locked' | 'submitted';
}

/**
 * POST /exams/:examId/sessions/:sessionId/anti-cheat/signal — report an anti-cheat signal.
 * Normalises the ResponseBuilder envelope so callers always receive the decision directly.
 */
export const sendAntiCheatSignal = (
    examId: string,
    sessionId: string,
    payload: AntiCheatSignalPayload,
) =>
    api
        .post<ApiResponse<AntiCheatDecision> | AntiCheatDecision>(
            `/exams/${examId}/sessions/${sessionId}/anti-cheat/signal`,
            payload,
        )
        .then((r) => {
            const body = r.data as ApiResponse<AntiCheatDecision> | AntiCheatDecision;
            return ((body as ApiResponse<AntiCheatDecision>)?.data ?? body) as AntiCheatDecision;
        });
