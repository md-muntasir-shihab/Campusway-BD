// ─── AntiCheat Type Definitions ──────────────────────────────────────────────
// Backend-authoritative anti-cheat policy engine types for CampusWay exam system.
// Requirements: 7.2, 8.1, 8.4

/**
 * Global + per-exam anti-cheat policy configuration.
 * All numeric fields have minimum constraints enforced at merge time.
 */
export interface AntiCheatPolicy {
    tabSwitchLimit: number;              // min: 1, max: 100, default: 5
    copyPasteViolationLimit: number;     // min: 1, max: 50, default: 3
    requireFullscreen: boolean;          // default: false
    violationAction: 'warn' | 'submit' | 'lock'; // default: 'warn'
    warningCooldownSeconds: number;      // min: 0, max: 300, default: 30
    maxFullscreenExitLimit: number;      // min: 1, max: 50, default: 3
    enableClipboardBlock: boolean;       // default: false
    enableContextMenuBlock: boolean;     // default: false
    enableBlurTracking: boolean;         // default: false
    allowMobileRelaxedMode: boolean;     // default: false
    proctoringSignalsEnabled: boolean;   // default: false
    strictExamTabLock: boolean;          // default: false
}

/**
 * Partial policy used for per-exam overrides.
 * Only the fields present will override the global policy.
 */
export type AntiCheatOverrides = Partial<AntiCheatPolicy>;

/**
 * Signal types emitted by the frontend Signal Collector.
 */
export type AntiCheatSignalType =
    | 'tab_switch'
    | 'fullscreen_exit'
    | 'copy_attempt'
    | 'resume'
    | 'client_error'
    | 'blur'
    | 'context_menu_blocked';

/**
 * Decision actions returned by the AntiCheat Engine.
 * Severity order: logged < warn < lock <= force_submit
 */
export type AntiCheatDecisionAction = 'logged' | 'warn' | 'lock' | 'force_submit';

/**
 * Signal payload sent from the frontend to the backend.
 */
export interface AntiCheatSignal {
    eventType: AntiCheatSignalType;
    attemptRevision: number;
    metadata?: Record<string, unknown>;
    timestamp: number; // client-side timestamp (ms)
}

/**
 * Decision response returned by the AntiCheat Engine to the frontend.
 */
export interface AntiCheatDecision {
    action: AntiCheatDecisionAction;
    warningMessage?: string;
    remainingViolations?: number;
    sessionState?: 'active' | 'locked' | 'submitted';
}

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Safe default policy values for legacy exams or when no policy is configured.
 * Requirement 8.4: legacy exams without antiCheatOverrides use these defaults.
 */
export const SAFE_DEFAULTS: AntiCheatPolicy = {
    tabSwitchLimit: 5,
    copyPasteViolationLimit: 3,
    requireFullscreen: false,
    violationAction: 'warn',
    warningCooldownSeconds: 30,
    maxFullscreenExitLimit: 3,
    enableClipboardBlock: false,
    enableContextMenuBlock: false,
    enableBlurTracking: false,
    allowMobileRelaxedMode: false,
    proctoringSignalsEnabled: false,
    strictExamTabLock: false,
};

/**
 * Severity ordering for decision actions.
 * Used to enforce monotonicity: once severity rises, it never drops.
 */
export const SEVERITY_ORDER: Record<AntiCheatDecisionAction, number> = {
    logged: 0,
    warn: 1,
    lock: 2,
    force_submit: 3,
};
