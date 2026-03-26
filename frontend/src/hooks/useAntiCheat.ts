import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { ExamAttemptEventType } from '../services/api';

export type AntiCheatEventPayload = {
    eventType: Extract<ExamAttemptEventType, 'tab_switch' | 'fullscreen_exit' | 'copy_attempt' | 'error'>;
    metadata?: Record<string, unknown>;
    timestamp: string;
};

type UseAntiCheatSettings = {
    enabled?: boolean;
    enforceFullscreen?: boolean;
    disableContextMenu?: boolean;
    blockClipboardShortcuts?: boolean;
    showToasts?: boolean;
};

type CheatLogger = (event: AntiCheatEventPayload) => void | Promise<void>;

function emitWarning(message: string, enabled: boolean) {
    if (!enabled) return;
    toast.error(message, { duration: 4000 });
}

export function useAntiCheat(onCheatLog: CheatLogger, settings: UseAntiCheatSettings = {}) {
    const lastTabSwitchAtRef = useRef<number>(0);

    useEffect(() => {
        const enabled = settings.enabled !== false;
        if (!enabled) {
            return;
        }

        const enforceFullscreen = Boolean(settings.enforceFullscreen);
        const disableContextMenu = settings.disableContextMenu !== false;
        const blockClipboardShortcuts = settings.blockClipboardShortcuts !== false;
        const showToasts = settings.showToasts !== false;

        const logEvent = (event: AntiCheatEventPayload) => {
            Promise.resolve(onCheatLog(event)).catch(() => undefined);
        };

        const logTabSwitch = (source: 'visibilitychange' | 'blur') => {
            const now = Date.now();
            if (now - lastTabSwitchAtRef.current < 1200) return;
            lastTabSwitchAtRef.current = now;

            emitWarning('Tab switch detected. This action was recorded.', showToasts);
            logEvent({
                eventType: 'tab_switch',
                metadata: { increment: 1, source },
                timestamp: new Date(now).toISOString(),
            });
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                logTabSwitch('visibilitychange');
            }
        };

        const handleBlur = () => {
            logTabSwitch('blur');
        };

        const handleFullscreenChange = () => {
            if (!enforceFullscreen) return;
            const activeFullscreenElement =
                document.fullscreenElement ||
                (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ||
                (document as Document & { msFullscreenElement?: Element | null }).msFullscreenElement;

            if (!activeFullscreenElement) {
                emitWarning('Fullscreen exit detected. Please return to fullscreen.', showToasts);
                logEvent({
                    eventType: 'fullscreen_exit',
                    metadata: { source: 'fullscreenchange' },
                    timestamp: new Date().toISOString(),
                });
            }
        };

        const handleContextMenu = (event: MouseEvent) => {
            if (disableContextMenu) {
                event.preventDefault();
            }
            logEvent({
                eventType: 'copy_attempt',
                metadata: { source: 'contextmenu' },
                timestamp: new Date().toISOString(),
            });
        };

        const handleClipboardEvent = (type: 'copy' | 'paste' | 'cut', event: ClipboardEvent) => {
            if (blockClipboardShortcuts) {
                event.preventDefault();
            }
            emitWarning(`${type.toUpperCase()} is not allowed during exam.`, showToasts);
            logEvent({
                eventType: 'copy_attempt',
                metadata: { source: type },
                timestamp: new Date().toISOString(),
            });
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            const key = String(event.key || '').toLowerCase();
            const isClipboardCombo =
                (event.ctrlKey || event.metaKey) &&
                (key === 'c' || key === 'v' || key === 'x' || key === 'a');
            if (!isClipboardCombo && key !== 'printscreen') return;

            if (blockClipboardShortcuts) {
                event.preventDefault();
            }
            emitWarning('Restricted shortcut detected. This action was recorded.', showToasts);
            logEvent({
                eventType: 'copy_attempt',
                metadata: {
                    source: 'keyboard',
                    key: event.key,
                    ctrlKey: event.ctrlKey,
                    metaKey: event.metaKey,
                },
                timestamp: new Date().toISOString(),
            });
        };

        const handleError = (event: ErrorEvent) => {
            logEvent({
                eventType: 'error',
                metadata: {
                    message: event.message || 'client_error',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                },
                timestamp: new Date().toISOString(),
            });
        };

        const handleCopy = (event: ClipboardEvent) => handleClipboardEvent('copy', event);
        const handlePaste = (event: ClipboardEvent) => handleClipboardEvent('paste', event);
        const handleCut = (event: ClipboardEvent) => handleClipboardEvent('cut', event);

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
        document.addEventListener('msfullscreenchange', handleFullscreenChange as EventListener);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('cut', handleCut);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('error', handleError);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange as EventListener);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('cut', handleCut);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('error', handleError);
        };
    }, [onCheatLog, settings.enabled, settings.enforceFullscreen, settings.disableContextMenu, settings.blockClipboardShortcuts, settings.showToasts]);
}
