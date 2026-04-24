import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock JobRunLog model ──
const mockCreate = vi.fn();
const mockFindByIdAndUpdate = vi.fn();

vi.mock('../models/JobRunLog', () => ({
    default: {
        create: (...args: unknown[]) => mockCreate(...args),
        findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
    },
}));

import { runJobWithRetry, _delays } from '../services/jobRunLogService';

describe('runJobWithRetry', () => {
    const fakeId = 'fake-doc-id';
    let sleepSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockCreate.mockResolvedValue({ _id: fakeId });
        mockFindByIdAndUpdate.mockResolvedValue(null);
        sleepSpy = vi.spyOn(_delays, 'sleep').mockResolvedValue(undefined);
    });

    it('should succeed on first attempt without retries', async () => {
        const worker = vi.fn().mockResolvedValue({ summary: { count: 5 } });

        await runJobWithRetry('test-job', worker);

        expect(worker).toHaveBeenCalledTimes(1);
        expect(sleepSpy).not.toHaveBeenCalled();
        expect(mockCreate).toHaveBeenCalledWith(
            expect.objectContaining({ jobName: 'test-job', status: 'running', retryCount: 0 }),
        );
        expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
            fakeId,
            expect.objectContaining({
                $set: expect.objectContaining({ status: 'success', retryCount: 0 }),
            }),
        );
    });

    it('should retry and succeed on second attempt', async () => {
        const worker = vi.fn()
            .mockRejectedValueOnce(new Error('transient'))
            .mockResolvedValueOnce(undefined);

        await runJobWithRetry('retry-job', worker);

        expect(worker).toHaveBeenCalledTimes(2);
        expect(sleepSpy).toHaveBeenCalledTimes(1);
        expect(sleepSpy).toHaveBeenCalledWith(1000); // backoffBase * 4^0
        expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
            fakeId,
            expect.objectContaining({
                $set: expect.objectContaining({ status: 'success', retryCount: 1 }),
            }),
        );
    });

    it('should retry up to maxRetries and then fail', async () => {
        const worker = vi.fn().mockRejectedValue(new Error('permanent'));
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        await expect(runJobWithRetry('fail-job', worker)).rejects.toThrow('permanent');

        // 1 initial + 3 retries = 4 calls
        expect(worker).toHaveBeenCalledTimes(4);
        expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
            fakeId,
            expect.objectContaining({
                $set: expect.objectContaining({
                    status: 'failed',
                    retryCount: 3,
                    errorMessage: 'permanent',
                }),
            }),
        );

        consoleSpy.mockRestore();
    });

    it('should use exponential backoff delays: 1s, 4s, 16s', async () => {
        const worker = vi.fn().mockRejectedValue(new Error('fail'));
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        await expect(runJobWithRetry('backoff-job', worker)).rejects.toThrow();

        expect(sleepSpy).toHaveBeenCalledTimes(3);
        expect(sleepSpy).toHaveBeenNthCalledWith(1, 1000);  // 1000 * 4^0
        expect(sleepSpy).toHaveBeenNthCalledWith(2, 4000);  // 1000 * 4^1
        expect(sleepSpy).toHaveBeenNthCalledWith(3, 16000); // 1000 * 4^2

        vi.restoreAllMocks();
    });

    it('should emit warning log after 3 consecutive failures', async () => {
        const worker = vi.fn().mockRejectedValue(new Error('boom'));
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        await expect(runJobWithRetry('warn-job', worker)).rejects.toThrow();

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('WARNING: Job "warn-job" failed 4 consecutive times'),
        );

        consoleSpy.mockRestore();
    });

    it('should call onConsecutiveFailures callback when all retries exhausted', async () => {
        const worker = vi.fn().mockRejectedValue(new Error('fail'));
        const onFail = vi.fn();
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        await expect(
            runJobWithRetry('callback-job', worker, { onConsecutiveFailures: onFail }),
        ).rejects.toThrow();

        expect(onFail).toHaveBeenCalledWith('callback-job', 4);

        vi.restoreAllMocks();
    });

    it('should persist log with all required fields', async () => {
        const worker = vi.fn().mockResolvedValue(undefined);

        await runJobWithRetry('fields-job', worker);

        const updateCall = mockFindByIdAndUpdate.mock.calls[0][1].$set;
        expect(updateCall).toHaveProperty('status', 'success');
        expect(updateCall).toHaveProperty('endedAt');
        expect(updateCall).toHaveProperty('durationMs');
        expect(updateCall.durationMs).toBeGreaterThanOrEqual(0);
        expect(updateCall).toHaveProperty('retryCount', 0);
    });

    it('should respect custom maxRetries option', async () => {
        const worker = vi.fn().mockRejectedValue(new Error('fail'));
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

        await expect(
            runJobWithRetry('custom-retry-job', worker, { maxRetries: 1 }),
        ).rejects.toThrow();

        // 1 initial + 1 retry = 2 calls
        expect(worker).toHaveBeenCalledTimes(2);
        // maxRetries=1 < 3, so no warning
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
