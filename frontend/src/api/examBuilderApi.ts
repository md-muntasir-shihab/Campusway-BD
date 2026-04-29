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
    api.put<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/settings`, payload).then((r) => r.data);

/** PUT /:id/scheduling — Update scheduling and pricing (Step 4). */
export const updateScheduling = (examId: string, payload: ExamSchedulingDto) =>
    api.put<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/scheduling`, payload).then((r) => r.data);

/** GET /:id/preview — Preview exam with questions. */
export const previewExam = (examId: string) =>
    api.get<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/preview`).then((r) => r.data);

/** POST /:id/publish — Publish a draft exam (Step 5). */
export const publishExam = (examId: string) =>
    api.post<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/publish`).then((r) => r.data);

/** POST /:id/clone — Clone an existing exam as a new draft. */
export const cloneExam = (examId: string) =>
    api.post<ApiResponse<Record<string, unknown>>>(`${BASE}/${examId}/clone`).then((r) => r.data);
