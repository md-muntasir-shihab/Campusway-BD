import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit test for fix C-2 (profile-completion threshold single source of truth).
 *
 * `getProfileCompletionThreshold` must resolve consistently, in this order:
 *   1. Security config `profileScoreThreshold` when `requireProfileScoreForExam` is on.
 *   2. `StudentDashboardConfig.profileCompletionThreshold`.
 *   3. 70 (default).
 *
 * It has no DB access beyond the two mocked models, so it runs without mongod.
 */

const getSecurityConfig = vi.fn();
const findOne = vi.fn();

vi.doMock('../models/StudentDashboardConfig', () => ({
    default: { findOne: vi.fn(() => ({ select: vi.fn(() => ({ lean: findOne })) })) },
}));
vi.doMock('../services/securityConfigService', () => ({ getSecurityConfig }));

const { getProfileCompletionThreshold } = await import('../services/profileScoreConfig');

beforeEach(() => {
    vi.clearAllMocks();
    findOne.mockReset();
    // Default lean() resolves to null (no StudentDashboardConfig doc).
    findOne.mockResolvedValue(null);
});

describe('getProfileCompletionThreshold (fix C-2)', () => {
    it('uses security profileScoreThreshold when profile-score gating is on', async () => {
        getSecurityConfig.mockResolvedValue({
            examProtection: { requireProfileScoreForExam: true, profileScoreThreshold: 55 },
        });
        const result = await getProfileCompletionThreshold();
        expect(result).toBe(55);
        expect(findOne).not.toHaveBeenCalled();
    });

    it('uses StudentDashboardConfig.profileCompletionThreshold when security gating is off', async () => {
        getSecurityConfig.mockResolvedValue({
            examProtection: { requireProfileScoreForExam: false, profileScoreThreshold: undefined },
        });
        findOne.mockResolvedValue({ profileCompletionThreshold: 60 });
        const result = await getProfileCompletionThreshold();
        expect(result).toBe(60);
    });

    it('defaults to 70 when no config is set', async () => {
        getSecurityConfig.mockResolvedValue({
            examProtection: { requireProfileScoreForExam: false, profileScoreThreshold: undefined },
        });
        const result = await getProfileCompletionThreshold();
        expect(result).toBe(70);
    });
});
