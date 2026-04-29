// ─── useAntiCheat — Client-Side Anti-Cheat Monitor ──────────────────────────
// Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 28.1
//
// Monitors browser events during an exam session:
//   • Tab switch detection via Page Visibility API
//   • Fullscreen enforcement (request on mount, warn on exit)
//   • Right-click context menu disabled
//   • Copy / cut / paste prevention
//   • Violation counter with auto-submit when limit exceeded
//   • Device fingerprint generation (canvas, WebGL, navigator)
//   • Logs each violation to the server
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ViolationType } from '../types/exam-system';
import api from '../services/api';

// ─── Public Types ────────────────────────────────────────────────────────────

export interface AntiCheatConfig {
    /** Active exam session ID used for server-side violation logging. */
    sessionId: string;
    /** Maximum violations before auto-submit is triggered (default: 3). */
    maxViolations: number;
    /** Enable tab / visibility change detection. */
    enableTabDetect: boolean;
    /** Enable fullscreen enforcement (request on mount, warn on exit). */
    enableFullscreen: boolean;
    /** Enable copy / cut / paste prevention. */
    enableCopyPaste: boolean;
    /** Callback invoked when violation count exceeds maxViolations. */
    onAutoSubmit: () => void;
}

export interface ViolationRecord {
    type: ViolationType;
    timestamp: string;
    details?: string;
}

export interface UseAntiCheatReturn {
    /** Current number of recorded violations. */
    violationCount: number;
    /** Whether the browser is currently in fullscreen mode. */
    isFullscreen: boolean;
    /** Composite device fingerprint string (canvas + WebGL + navigator). */
    fingerprint: string;
    /** Human-readable warning messages for each violation. */
    warnings: string[];
    /** Full violation records (type + timestamp + details). */
    violations: ViolationRecord[];
    /**
     * @deprecated Use `fingerprint` instead.
     */
    deviceFingerprint: string;
}

// ─── Device Fingerprint Helpers ──────────────────────────────────────────────

/** Simple non-cryptographic hash (djb2) for fingerprint string. */
function hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Generate a canvas-based fingerprint component. */
function getCanvasFingerprint(): string {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no-canvas';

        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(50, 0, 100, 30);
        ctx.fillStyle = '#069';
        ctx.fillText('CampusWay-fp', 2, 15);
        ctx.fillStyle = 'rgba(102,204,0,0.7)';
        ctx.fillText('CampusWay-fp', 4, 17);

        return canvas.toDataURL();
    } catch {
        return 'canvas-error';
    }
}

/** Get WebGL renderer string. */
function getWebGLRenderer(): string {
    try {
        const canvas = document.createElement('canvas');
        const gl =
            canvas.getContext('webgl') ??
            canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
        if (!gl) return 'no-webgl';

        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return 'no-debug-info';

        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
        const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string;
        return `${vendor}~${renderer}`;
    } catch {
        return 'webgl-error';
    }
}

/** Collect navigator properties for fingerprinting. */
function getNavigatorProperties(): string {
    const nav = navigator;
    const parts = [
        nav.userAgent ?? '',
        nav.language ?? '',
        nav.platform ?? '',
        String(nav.hardwareConcurrency ?? ''),
        `${screen.width}x${screen.height}`,
        `${screen.colorDepth ?? ''}`,
        String(screen.pixelDepth ?? ''),
        Intl?.DateTimeFormat?.()?.resolvedOptions?.()?.timeZone ?? '',
    ];
    return parts.join('|');
}

/** Generate a composite device fingerprint. */
function generateDeviceFingerprint(): string {
    const canvasFp = getCanvasFingerprint();
    const webglRenderer = getWebGLRenderer();
    const navProps = getNavigatorProperties();

    const raw = `${hashString(canvasFp)}:${hashString(webglRenderer)}:${hashString(navProps)}`;
    return hashString(raw);
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAntiCheat(config: AntiCheatConfig): UseAntiCheatReturn {
    const {
        sessionId,
        maxViolations,
        enableTabDetect,
        enableFullscreen,
        enableCopyPaste,
        onAutoSubmit,
    } = config;

    const [violationCount, setViolationCount] = useState<number>(0);
    const [violations, setViolations] = useState<ViolationRecord[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [deviceFingerprint] = useState<string>(() => generateDeviceFingerprint());

    // Refs to avoid stale closures in event listeners
    const violationCountRef = useRef<number>(0);
    const autoSubmittedRef = useRef<boolean>(false);
    const onAutoSubmitRef = useRef(onAutoSubmit);
    const sessionIdRef = useRef(sessionId);
    const maxViolationsRef = useRef(maxViolations);

    // Keep refs in sync
    useEffect(() => { onAutoSubmitRef.current = onAutoSubmit; }, [onAutoSubmit]);
    useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
    useEffect(() => { maxViolationsRef.current = maxViolations; }, [maxViolations]);

    // ─── Log violation to server ─────────────────────────────────────────────

    const logViolationToServer = useCallback(
        async (violationType: ViolationType, details?: string) => {
            try {
                await api.post(`/v1/exam-sessions/${sessionIdRef.current}/violations`, {
                    violationType,
                    details: details ?? '',
                    deviceFingerprint,
                    timestamp: new Date().toISOString(),
                });
            } catch {
                // Silently fail — violation is still tracked client-side
            }
        },
        [deviceFingerprint],
    );

    // ─── Record a violation ──────────────────────────────────────────────────

    const recordViolation = useCallback(
        (type: ViolationType, details?: string) => {
            if (autoSubmittedRef.current) return;

            const record: ViolationRecord = {
                type,
                timestamp: new Date().toISOString(),
                details,
            };

            violationCountRef.current += 1;
            const newCount = violationCountRef.current;

            setViolationCount(newCount);
            setViolations((prev) => [...prev, record]);

            // Build a human-readable warning message
            const remaining = maxViolationsRef.current - newCount;
            const warningMsg =
                remaining > 0
                    ? `Warning: ${type.replace(/_/g, ' ')} detected (${newCount}/${maxViolationsRef.current}). ${remaining} violation(s) remaining before auto-submit.`
                    : `Violation limit exceeded. Exam will be auto-submitted.`;
            setWarnings((prev) => [...prev, warningMsg]);

            // Log to server (fire-and-forget)
            logViolationToServer(type, details);

            // Auto-submit when limit exceeded
            if (newCount > maxViolationsRef.current && !autoSubmittedRef.current) {
                autoSubmittedRef.current = true;
                onAutoSubmitRef.current();
            }
        },
        [logViolationToServer],
    );

    // ─── Fullscreen request on mount ─────────────────────────────────────────

    useEffect(() => {
        if (!enableFullscreen) return;

        const el = document.documentElement;
        const requestFs =
            el.requestFullscreen ??
            (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen ??
            (el as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen;

        if (typeof requestFs === 'function') {
            requestFs.call(el).then(() => {
                setIsFullscreen(true);
            }).catch(() => {
                // Browser may block fullscreen without user gesture — degrade gracefully
                setIsFullscreen(false);
            });
        }
    }, [enableFullscreen]);

    // ─── Event listeners ─────────────────────────────────────────────────────

    useEffect(() => {
        // --- Tab switch detection (Page Visibility API) ---
        const handleVisibilityChange = () => {
            if (!enableTabDetect) return;
            if (document.visibilityState === 'hidden') {
                recordViolation('tab_switch', 'Tab switch detected via visibilitychange');
            }
        };

        // --- Fullscreen exit detection ---
        const handleFullscreenChange = () => {
            const activeEl =
                document.fullscreenElement ??
                (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ??
                (document as Document & { msFullscreenElement?: Element | null }).msFullscreenElement;

            setIsFullscreen(Boolean(activeEl));

            if (!enableFullscreen) return;
            if (!activeEl) {
                recordViolation('fullscreen_exit', 'Exited fullscreen mode');
            }
        };

        // --- Right-click context menu disable ---
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        // --- Copy / Cut / Paste prevention ---
        const handleCopy = (e: ClipboardEvent) => {
            if (!enableCopyPaste) return;
            e.preventDefault();
            recordViolation('copy_attempt', 'Copy attempt blocked');
        };

        const handleCut = (e: ClipboardEvent) => {
            if (!enableCopyPaste) return;
            e.preventDefault();
            recordViolation('copy_attempt', 'Cut attempt blocked');
        };

        const handlePaste = (e: ClipboardEvent) => {
            if (!enableCopyPaste) return;
            e.preventDefault();
            recordViolation('copy_attempt', 'Paste attempt blocked');
        };

        // Attach listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('cut', handleCut);
        document.addEventListener('paste', handlePaste);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('cut', handleCut);
            document.removeEventListener('paste', handlePaste);
        };
    }, [enableTabDetect, enableFullscreen, enableCopyPaste, recordViolation]);

    return {
        violationCount,
        isFullscreen,
        fingerprint: deviceFingerprint,
        warnings,
        violations,
        deviceFingerprint,
    };
}
