import api from '../services/api';
import type {
    ApiResponse,
    DoubtThread,
    DoubtCreateDto,
    DoubtReplyDto,
    DoubtVoteDto,
} from '../types/exam-system';

const BASE = '/v1/doubts';

/** POST / — Create a new doubt thread for a question. */
export const createDoubt = (payload: DoubtCreateDto) =>
    api.post<ApiResponse<DoubtThread>>(`${BASE}`, payload).then((r) => r.data);

/** GET /question/:questionId — Get doubt threads for a question. */
export const getThreads = (questionId: string) =>
    api.get<ApiResponse<DoubtThread[]>>(`${BASE}/question/${questionId}`).then((r) => r.data);

/** POST /:id/reply — Post a reply to a doubt thread. */
export const postReply = (threadId: string, payload: DoubtReplyDto) =>
    api.post<ApiResponse<DoubtThread>>(`${BASE}/${threadId}/reply`, payload).then((r) => r.data);

/** POST /:id/vote — Vote on a reply in a doubt thread. */
export const vote = (threadId: string, payload: DoubtVoteDto) =>
    api.post<ApiResponse<{ upvotes: number; downvotes: number }>>(`${BASE}/${threadId}/vote`, payload).then((r) => r.data);
