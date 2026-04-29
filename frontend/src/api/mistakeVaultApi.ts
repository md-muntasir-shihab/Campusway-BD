import api from '../services/api';
import type {
    ApiResponse,
    PaginatedResponse,
    MistakeVaultEntry,
    MistakeVaultFilters,
} from '../types/exam-system';

const BASE = '/v1/mistake-vault';

/** GET / — List the student's mistake vault entries with filters. */
export const listMistakes = (filters?: MistakeVaultFilters) =>
    api.get<PaginatedResponse<MistakeVaultEntry>>(`${BASE}`, { params: filters }).then((r) => r.data);

/** POST /retry-session — Create a retry practice session from filtered mistakes. */
export const createRetrySession = (filters?: Pick<MistakeVaultFilters, 'subject' | 'chapter' | 'topic' | 'masteryStatus'>) =>
    api.post<ApiResponse<{ sessionId: string; questionCount: number }>>(`${BASE}/retry-session`, filters).then((r) => r.data);
