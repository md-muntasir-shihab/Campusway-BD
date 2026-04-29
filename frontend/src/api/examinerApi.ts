import api from '../services/api';
import type {
    ApiResponse,
    ExaminerApplication,
    ExaminerApplicationDto,
    ExaminerEarnings,
} from '../types/exam-system';

const BASE = '/v1/examiner';

/** POST /apply — Submit an examiner application. */
export const applyForExaminer = (payload: ExaminerApplicationDto) =>
    api.post<ApiResponse<ExaminerApplication>>(`${BASE}/apply`, payload).then((r) => r.data);

/** GET /dashboard — Examiner dashboard data. */
export const getDashboard = () =>
    api.get<ApiResponse<Record<string, unknown>>>(`${BASE}/dashboard`).then((r) => r.data);

/** GET /earnings — Examiner revenue report. */
export const getEarnings = () =>
    api.get<ApiResponse<ExaminerEarnings>>(`${BASE}/earnings`).then((r) => r.data);
