import api from '../services/api';
import type { ApiResponse, PaginationParams } from '../types/exam-system';

export interface TopicDifficultyRecord {
    _id: string;
    topic: {
        _id: string;
        name: string;
        name_bn?: string;
    } | null;
    rating: number;
    totalAnswered: number;
    correctCount: number;
    accuracy: number;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    lastUpdated: string;
}

const BASE = '/v1/adaptive-difficulty';

/** GET /topics/:id/my-difficulty — Get difficulty for a specific topic */
export const getTopicDifficulty = (topicId: string) =>
    api.get<ApiResponse<TopicDifficultyRecord>>(`${BASE}/topics/${topicId}/my-difficulty`).then((r) => r.data);

/** GET /my-difficulties — Get all topic difficulties for the student */
export const getAllMyDifficulties = () =>
    api.get<ApiResponse<TopicDifficultyRecord[]>>(`${BASE}/my-difficulties`).then((r) => r.data);
