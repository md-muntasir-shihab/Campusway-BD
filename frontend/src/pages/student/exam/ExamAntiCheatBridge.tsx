import { useEffect, useRef } from 'react';
import {
    sendAntiCheatSignal,
    type AntiCheatSignalType,
} from '../../../api/examRunnerApi';

interface ExamAntiCheatBridgeProps {
    examId: string;
    sessionId: string;
    /** Current attempt revision; sent with every signal for optimistic-concurrency checks. */
    attemptRevision: number;
    /** Invoked once when the server locks the session. */
    onLock: () => void;
    /** Invoked once when the server forces an auto-submit. */
    onForceSubmit: () => void;
}

/** Minimum gap between identical signals — protects the rate-limited endpoint and the user. */
const SIGNAL_THROTTLE_MS = 1_500;

/**
 * Headless anti-cheat signal collector for the live exam runner.
 *
 * Listens for proctoring-relevant browser events (tab switch, window blur, copy,
 * fullscreen exit) and reports them to the backend AntiCheat Engine. The server
 * owns every decision; this component only reacts to an explicit `lock` or
 * `force_submit` verdict. Any network/validation failure is swallowed — a live
 * exam is never disrupted by a failed or blocked signal.
 */
export default function ExamAntiCheatBridge({
    examId,
    sessionId,
    attemptRevision,
    onLock,
    onForceSubmit,
}: ExamAntiCheatBridgeProps) {
    const attemptRevisionRef = useRef(attemptRevision);
    const lastSentAtRef = useRef<Partial<Record<AntiCheatSignalType, number>>>({});
    const terminatedRef = useRef(false);
    const onLockRef = useRef(onLock);
    const onForceSubmitRef = useRef(onForceSubmit);

    // Keep the latest values without re-subscribing the DOM listeners.
    useEffect(() => {
        attemptRevisionRef.current = attemptRevision;
    }, [attemptRevision]);
    useEffect(() => {
        onLockRef.current = onLock;
        onForceSubmitRef.current = onForceSubmit;
    }, [onLock, onForceSubmit]);

    useEffect(() => {
        if (!examId || !sessionId) return;

        const report = async (eventType: AntiCheatSignalType, metadata?: Record<string, unknown>) => {
            if (terminatedRef.current) return;
            const now = Date.now();
            const last = lastSentAtRef.current[eventType] ?? 0;
            if (now - last < SIGNAL_THROTTLE_MS) return;
            lastSentAtRef.current[eventType] = now;

            try {
                const decision = await sendAntiCheatSignal(examId, sessionId, {
                    eventType,
                    attemptRevision: attemptRevisionRef.current,
                    metadata,
                    timestamp: now,
                });
                if (!decision) return;
                if (decision.action === 'force_submit') {
                    terminatedRef.current = true;
                    onForceSubmitRef.current();
                } else if (decision.action === 'lock' || decision.sessionState === 'locked') {
                    terminatedRef.current = true;
                    onLockRef.current();
                }
            } catch {
                // Best-effort: never disrupt a live exam on a failed/blocked signal.
            }
        };

        const handleVisibility = () => {
            if (document.hidden) void report('tab_switch');
        };
        const handleBlur = () => void report('blur');
        const handleCopy = () => void report('copy_attempt');
        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) void report('fullscreen_exit');
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [examId, sessionId]);

    return null;
}
