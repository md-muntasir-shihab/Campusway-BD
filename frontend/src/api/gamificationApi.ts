import api from '../services/api';
import type {
    ApiResponse,
    GamificationProfile,
    LeaderboardPage,
    PaginationParams,
    Badge,
} from '../types/exam-system';

const BASE = '/v1/gamification';

/** GET /profile — Student gamification profile.
 *  The response interceptor unwraps the { success, data } envelope, so the
 *  resolved value is the GamificationProfile itself (not an ApiResponse). */
export const getProfile = (): Promise<GamificationProfile> =>
    api.get<ApiResponse<GamificationProfile>>(`${BASE}/profile`).then((r) => r.data as unknown as GamificationProfile);

/** GET /leaderboard/weekly — Weekly leaderboard. */
export const getWeeklyLeaderboard = (params?: PaginationParams) =>
    api.get<ApiResponse<LeaderboardPage>>(`${BASE}/leaderboard/weekly`, { params }).then((r) => r.data);

/** GET /leaderboard/global — Global leaderboard. */
export const getGlobalLeaderboard = (params?: PaginationParams) =>
    api.get<ApiResponse<LeaderboardPage>>(`${BASE}/leaderboard/global`, { params }).then((r) => r.data);

/** GET /users/me/points — Student points (xp, coins, lastLoginDate). */
export const getUserPoints = () =>
    api.get<ApiResponse<{ xp: number; coins: number; lastLoginDate: string | null }>>('/users/me/points').then((r) => r.data);

/** GET /v1/gamification/badges — Get all active badges. */
export const getBadges = () =>
    api.get<ApiResponse<Badge[]>>(`${BASE}/badges`).then((r) => r.data);

/** GET /users/me/badges — Get student's earned badges. */
export const getStudentBadges = () =>
    api.get<ApiResponse<Badge[]>>('/users/me/badges').then((r) => r.data);

/** POST /daily-bonus — Claim daily login bonus. */
export const claimDailyBonus = () =>
    api.post<ApiResponse<{ success: boolean; message: string; coinsAwarded: number; xpAwarded: number }>>(`${BASE}/daily-bonus`).then((r) => r.data);
