import { useState, useEffect } from 'react';

/**
 * useExamTimer
 * @param endTimeUTC The exact ISO string of when the exam ends.
 * @param onTimeUp Callback triggered when the timer hits zero.
 */
export function useExamTimer(endTimeUTC: string | undefined, onTimeUp: () => void, serverOffsetMs = 0) {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!endTimeUTC) return;

        const targetTime = new Date(endTimeUTC).getTime();

        const updateTimer = () => {
            const now = new Date().getTime() + serverOffsetMs;
            const diff = Math.max(0, targetTime - now);
            setTimeLeft(Math.floor(diff / 1000));

            if (diff <= 0) {
                clearInterval(interval);
                onTimeUp();
            }
        };

        // Initial update
        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [endTimeUTC, onTimeUp, serverOffsetMs]);

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return '--:--';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return {
        timeLeftSeconds: timeLeft,
        formattedTime: formatTime(timeLeft),
        isTimeUp: timeLeft !== null && timeLeft <= 0
    };
}
