import api from '../services/api';
import type {
    ApiResponse,
    PaginatedResponse,
    BattleChallengeDto,
    BattleAnswerDto,
    BattleSession,
    BattleProgress,
    PaginationParams,
} from '../types/exam-system';

const BASE = '/v1/battles';

/** POST /challenge — Create a battle challenge. */
export const createChallenge = (payload: BattleChallengeDto) =>
    api.post<ApiResponse<BattleSession>>(`${BASE}/challenge`, payload).then((r) => r.data);

/** POST /:id/accept — Accept a pending battle challenge. */
export const acceptChallenge = (battleId: string) =>
    api.post<ApiResponse<BattleSession>>(`${BASE}/${battleId}/accept`).then((r) => r.data);

/** POST /:id/answer — Submit an answer during an active battle. */
export const submitAnswer = (battleId: string, payload: BattleAnswerDto) =>
    api.post<ApiResponse<BattleProgress>>(`${BASE}/${battleId}/answer`, payload).then((r) => r.data);

/** GET /history — Paginated battle history for the authenticated student. */
export const getBattleHistory = (params?: PaginationParams) =>
    api.get<PaginatedResponse<BattleSession>>(`${BASE}/history`, { params }).then((r) => r.data);
