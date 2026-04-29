import api from '../services/api';
import type {
    ApiResponse,
    GamificationProfile,
    LeaderboardPage,
    PaginationParams,
} from '../types/exam-system';

const BASE = '/v1/gamification';

/** GET /profile — Student gamification profile. */
export const getProfile = () =>
    api.get<ApiResponse<GamificationProfile>>(`${BASE}/profile`).then((r) => r.data);

/** GET /leaderboard/weekly — Weekly leaderboard. */
export const getWeeklyLeaderboard = (params?: PaginationParams) =>
    api.get<ApiResponse<LeaderboardPage>>(`${BASE}/leaderboard/weekly`, { params }).then((r) => r.data);

/** GET /leaderboard/global — Global leaderboard. */
export const getGlobalLeaderboard = (params?: PaginationParams) =>
    api.get<ApiResponse<LeaderboardPage>>(`${BASE}/leaderboard/global`, { params }).then((r) => r.data);
