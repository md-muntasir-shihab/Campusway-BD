import api from '../services/api';
import type {
    ApiResponse,
    ExamInfoDto,
    QuestionSelectionDto,
    AutoPickConfig,
    ExamSettingsDto,
    ExamSchedulingDto,
} from '../types/exam-system';

const BASE = '/v1/exams';

function toSettingsPayload(payload: ExamSettingsDto) {
    const antiCheat = payload.antiCheatSettings ?? {};
    return {
        marksPerQuestion: payload.marksPerQuestion ?? 1,
        negativeMarking: payload.negativeMarks ?? 0,
        passPercentage: payload.passPercentage ?? 40,
        shuffleQuestions: payload.shuffleQuestions ?? false,
        shuffleOptions: payload.shuffleOptions ?? false,
        showResultMode: payload.showResultMode ?? 'immediately',
        maxAttempts: payload.maxAttempts ?? 1,
        assignedGroups: payload.assignedGroups ?? [],
        visibility: payload.visibility ?? 'public',
        antiCheat: {
            tab_switch_detect: antiCheat.tabSwitchDetect ?? true,
            fullscreen_mode: antiCheat.fullscreenMode ?? false,
            copy_paste_disabled: antiCheat.copyPasteDisabled ?? true,
        },
    };
}

function toSchedulingPayload(payload: ExamSchedulingDto) {
    return {
        exam_schedule_type: payload.examScheduleType,
        startTime: payload.examWindowStartUTC || undefined,
        endTime: payload.examWindowEndUTC || undefined,
        resultPublishTime: payload.resultPublishAtUTC || undefined,
        pricing: {
            isFree: payload.pricing?.isFree ?? true,
            amountBDT: payload.pricing?.amountBDT ?? 0,
            couponCodes: payload.pricing?.couponCodes ?? [],
        },
    };
}

/** POST / — Create a new exam draft (Step 1). */
export const createDraft = (payload: ExamInfoDto) =>
    api.post<ApiResponse<Record<string, unknown>>>(`${BASE}`, payload).then((r) => r.data);

/** PUT /:id/questions — Set selected questions (Step 2 manual). */
export const updateQuestions = (examId: string, payload: QuestionSelectionDto) =>
    api.put<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/questions`, payload).then((r) => r.data);

/** POST /:id/auto-pick — Auto-select questions by difficulty (Step 2 auto). */
export const autoPick = (examId: string, payload: AutoPickConfig) =>
    api.post<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/auto-pick`, payload).then((r) => r.data);

/** PUT /:id/settings — Update exam settings (Step 3). */
export const updateSettings = (examId: string, payload: ExamSettingsDto) =>
    api.put<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/settings`, toSettingsPayload(payload)).then((r) => r.data);

/** PUT /:id/scheduling — Update scheduling and pricing (Step 4). */
export const updateScheduling = (examId: string, payload: ExamSchedulingDto) =>
    api.put<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/scheduling`, toSchedulingPayload(payload)).then((r) => r.data);

/** GET /:id/preview — Preview exam with questions. */
export const previewExam = (examId: string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/preview`).then((r) => r.data);

/** POST /:id/publish — Publish a draft exam (Step 5). */
export const publishExam = (examId: string) =>
    api.post<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/publish`).then((r) => r.data);

/** POST /:id/clone — Clone an existing exam as a new draft. */
export const cloneExam = (examId: string) =>
    api.post<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/clone`).then((r) => r.data);

// ─── Exam list / management ──────────────────────────────────────────────

export interface ExamListItem {
    _id: string;
    title: string;
    title_bn?: string;
    status: string;
    rawStatus: string;
    isPublished: boolean;
    scheduleType?: string;
    deliveryMode?: string;
    totalQuestions: number;
    totalMarks: number;
    duration: number;
    startTime?: string;
    endTime?: string;
    createdAt?: string;
    participantCount: number;
}

/** GET / — List exams for the management table. Returns { items }. */
export const listExams = (params?: { status?: string; limit?: number }) =>
    api
        .get<ApiResponse<{ items: ExamListItem[] }>>(`${BASE}`, { params })
        .then((r) => r.data as unknown as { items?: ExamListItem[]; data?: { items?: ExamListItem[] } });

/** DELETE /:id — Delete an exam (refused if it already has participant results). */
export const deleteExam = (examId: string) =>
    api.delete<ApiResponse<null>>(`${BASE}/${examId}`).then((r) => r.data);
