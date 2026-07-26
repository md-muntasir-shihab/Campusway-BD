import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkUserAccountStatus, invalidateUserStatusCache, AccountStatusCheckResult } from '../middleware/auth';
import { cacheService } from '../services/cacheService';
import User from '../models/User';

vi.mock('../services/cacheService', () => ({
    cacheService: {
        get: vi.fn(),
        set: vi.fn().mockResolvedValue(undefined),
        del: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock('../models/User', () => ({
    default: {
        findById: vi.fn(),
    },
}));

describe('checkUserAccountStatus', () => {
    const userId = 'user_123456789';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns blocked status from cache when status is suspended', async () => {
        vi.mocked(cacheService.get).mockResolvedValueOnce({ status: 'suspended', lockUntil: null });

        const result: AccountStatusCheckResult = await checkUserAccountStatus(userId);
        expect(result.isBlocked).toBe(true);
        expect(result.status).toBe('suspended');
        expect(result.reason).toBe('ACCOUNT_SUSPENDED');
        expect(cacheService.get).toHaveBeenCalledWith(`user:status:${userId}`);
        expect(User.findById).not.toHaveBeenCalled();
    });

    it('returns blocked status from cache when user is locked in future', async () => {
        const futureDate = new Date(Date.now() + 100000).toISOString();
        vi.mocked(cacheService.get).mockResolvedValueOnce({ status: 'active', lockUntil: futureDate });

        const result = await checkUserAccountStatus(userId);
        expect(result.isBlocked).toBe(true);
        expect(result.reason).toBe('ACCOUNT_LOCKED');
    });

    it('returns unblocked status from cache when user is active', async () => {
        vi.mocked(cacheService.get).mockResolvedValueOnce({ status: 'active', lockUntil: null });

        const result = await checkUserAccountStatus(userId);
        expect(result.isBlocked).toBe(false);
        expect(result.status).toBe('active');
        expect(result.reason).toBeUndefined();
    });

    it('queries DB when cache misses and populates cache', async () => {
        vi.mocked(cacheService.get).mockResolvedValueOnce(null);
        vi.mocked(User.findById).mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                lean: vi.fn().mockResolvedValueOnce({
                    status: 'blocked',
                    lockUntil: null,
                }),
            }),
        } as any);

        const result = await checkUserAccountStatus(userId);
        expect(result.isBlocked).toBe(true);
        expect(result.status).toBe('blocked');
        expect(cacheService.set).toHaveBeenCalledWith(`user:status:${userId}`, { status: 'blocked', lockUntil: null }, 300);
    });

    it('returns USER_NOT_FOUND if user is missing in DB on cache miss', async () => {
        vi.mocked(cacheService.get).mockResolvedValueOnce(null);
        vi.mocked(User.findById).mockReturnValueOnce({
            select: vi.fn().mockReturnValueOnce({
                lean: vi.fn().mockResolvedValueOnce(null),
            }),
        } as any);

        const result = await checkUserAccountStatus(userId);
        expect(result.isBlocked).toBe(true);
        expect(result.status).toBe('not_found');
        expect(result.reason).toBe('USER_NOT_FOUND');
    });

    it('invalidates cache correctly when requested', async () => {
        await invalidateUserStatusCache(userId);
        expect(cacheService.del).toHaveBeenCalledWith(`user:status:${userId}`);
    });
});
