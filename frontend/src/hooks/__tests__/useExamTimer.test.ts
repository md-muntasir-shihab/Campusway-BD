/**
 * Unit tests for useExamTimer hook.
 *
 * Requirements: 14.2
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExamTimer } from '../useExamTimer';

describe('useExamTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns null timeLeft when endTimeUTC is undefined', () => {
        const onTimeUp = vi.fn();
        const { result } = renderHook(() => useExamTimer(undefined, onTimeUp));

        expect(result.current.timeLeftSeconds).toBeNull();
        expect(result.current.formattedTime).toBe('--:--');
        expect(result.current.isTimeUp).toBe(false);
    });

    it('calculates time left from endTimeUTC', () => {
        const onTimeUp = vi.fn();
        // Set end time 90 seconds from now
        const endTime = new Date(Date.now() + 90_000).toISOString();

        const { result } = renderHook(() => useExamTimer(endTime, onTimeUp));

        // Should be approximately 90 seconds (allow 1s tolerance for execution time)
        expect(result.current.timeLeftSeconds).toBeGreaterThanOrEqual(89);
        expect(result.current.timeLeftSeconds).toBeLessThanOrEqual(90);
        expect(result.current.isTimeUp).toBe(false);
    });

    it('formats time as MM:SS when under 1 hour', () => {
        const onTimeUp = vi.fn();
        const endTime = new Date(Date.now() + 90_000).toISOString();

        const { result } = renderHook(() => useExamTimer(endTime, onTimeUp));

        expect(result.current.formattedTime).toBe('01:30');
    });

    it('formats time as HH:MM:SS when over 1 hour', () => {
        const onTimeUp = vi.fn();
        const endTime = new Date(Date.now() + 3661_000).toISOString(); // 1h 1m 1s

        const { result } = renderHook(() => useExamTimer(endTime, onTimeUp));

        expect(result.current.formattedTime).toBe('01:01:01');
    });

    it('calls onTimeUp when timer reaches zero', () => {
        const onTimeUp = vi.fn();
        const endTime = new Date(Date.now() + 2_000).toISOString(); // 2 seconds

        renderHook(() => useExamTimer(endTime, onTimeUp));

        // Advance past the end time
        act(() => {
            vi.advanceTimersByTime(3_000);
        });

        expect(onTimeUp).toHaveBeenCalled();
    });

    it('accounts for serverOffsetMs', () => {
        const onTimeUp = vi.fn();
        const endTime = new Date(Date.now() + 60_000).toISOString(); // 60s from now
        const serverOffset = 10_000; // server is 10s ahead

        const { result } = renderHook(() => useExamTimer(endTime, onTimeUp, serverOffset));

        // With +10s offset, effective time left should be ~50s
        expect(result.current.timeLeftSeconds).toBeGreaterThanOrEqual(49);
        expect(result.current.timeLeftSeconds).toBeLessThanOrEqual(50);
    });

    it('counts down to zero and fires onTimeUp', () => {
        const onTimeUp = vi.fn();
        // 3 seconds from now
        const endTime = new Date(Date.now() + 3_000).toISOString();

        const { result } = renderHook(() => useExamTimer(endTime, onTimeUp));

        expect(result.current.timeLeftSeconds).toBeGreaterThan(0);

        // Advance past the end time
        act(() => {
            vi.advanceTimersByTime(4_000);
        });

        expect(result.current.timeLeftSeconds).toBe(0);
        expect(result.current.isTimeUp).toBe(true);
        expect(onTimeUp).toHaveBeenCalledTimes(1);
    });
});
