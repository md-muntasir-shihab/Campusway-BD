import { describe, it, expect } from 'vitest';
import { mergeAntiCheatPolicy, evaluateSignal } from '../services/antiCheatEngine';
import type { AntiCheatCounters } from '../services/antiCheatEngine';
import type { AntiCheatPolicy, AntiCheatSignalType } from '../types/antiCheat';
import { SAFE_DEFAULTS } from '../types/antiCheat';

// ─── Unit Tests: AntiCheat Engine ────────────────────────────────────────────

/**
 * Req 8.4 — Legacy exam safe defaults
 * Merging with no global policy and no overrides returns SAFE_DEFAULTS.
 */
describe('Legacy exam safe defaults (Req 8.4)', () => {
    it('merging empty global policy with no overrides returns SAFE_DEFAULTS', () => {
        const result = mergeAntiCheatPolicy({}, undefined);
        expect(result).toEqual(SAFE_DEFAULTS);
    });

    it('merging empty global policy with empty overrides returns SAFE_DEFAULTS', () => {
        const result = mergeAntiCheatPolicy({}, {});
        expect(result).toEqual(SAFE_DEFAULTS);
    });
});

/**
 * Req 7.3 — Warn response format
 * warningMessage and remainingViolations fields present on warn decision.
 */
describe('Warn response format (Req 7.3)', () => {
    it('warn decision includes warningMessage and remainingViolations', () => {
        const policy: AntiCheatPolicy = { ...SAFE_DEFAULTS, tabSwitchLimit: 5, violationAction: 'warn' };
        // counter at limit - 1 → approaching threshold → warn
        const counters: AntiCheatCounters = { tabSwitchCount: 4, copyAttemptCount: 0, fullscreenExitCount: 0 };

        const decision = evaluateSignal(counters, policy, 'tab_switch');

        expect(decision.action).toBe('warn');
        expect(decision).toHaveProperty('warningMessage');
        expect(typeof decision.warningMessage).toBe('string');
        expect(decision.warningMessage!.length).toBeGreaterThan(0);
        expect(decision).toHaveProperty('remainingViolations');
        expect(typeof decision.remainingViolations).toBe('number');
        expect(decision.remainingViolations).toBeGreaterThanOrEqual(1);
    });
});

/**
 * Req 7.4 — Lock decision
 * When violationAction is 'lock' and counter >= limit, action is 'lock'.
 */
describe('Lock decision (Req 7.4)', () => {
    it('returns lock action when violationAction is lock and counter >= limit', () => {
        const policy: AntiCheatPolicy = { ...SAFE_DEFAULTS, tabSwitchLimit: 3, violationAction: 'lock' };
        const counters: AntiCheatCounters = { tabSwitchCount: 3, copyAttemptCount: 0, fullscreenExitCount: 0 };

        const decision = evaluateSignal(counters, policy, 'tab_switch');

        expect(decision.action).toBe('lock');
    });

    it('returns lock action when counter exceeds limit', () => {
        const policy: AntiCheatPolicy = { ...SAFE_DEFAULTS, copyPasteViolationLimit: 2, violationAction: 'lock' };
        const counters: AntiCheatCounters = { tabSwitchCount: 0, copyAttemptCount: 5, fullscreenExitCount: 0 };

        const decision = evaluateSignal(counters, policy, 'copy_attempt');

        expect(decision.action).toBe('lock');
    });
});

/**
 * Req 7.5 — Force submit decision
 * When violationAction is 'submit' and counter >= limit, action is 'force_submit'.
 */
describe('Force submit decision (Req 7.5)', () => {
    it('returns force_submit action when violationAction is submit and counter >= limit', () => {
        const policy: AntiCheatPolicy = { ...SAFE_DEFAULTS, tabSwitchLimit: 3, violationAction: 'submit' };
        const counters: AntiCheatCounters = { tabSwitchCount: 3, copyAttemptCount: 0, fullscreenExitCount: 0 };

        const decision = evaluateSignal(counters, policy, 'tab_switch');

        expect(decision.action).toBe('force_submit');
    });

    it('returns force_submit for fullscreen_exit when counter >= limit', () => {
        const policy: AntiCheatPolicy = { ...SAFE_DEFAULTS, maxFullscreenExitLimit: 2, violationAction: 'submit' };
        const counters: AntiCheatCounters = { tabSwitchCount: 0, copyAttemptCount: 0, fullscreenExitCount: 2 };

        const decision = evaluateSignal(counters, policy, 'fullscreen_exit');

        expect(decision.action).toBe('force_submit');
    });
});

/**
 * Req 7.1 — Unknown / non-counter signal types
 * Non-counter signals always return 'logged'.
 */
describe('Non-counter signals return logged (Req 7.1)', () => {
    const nonCounterSignals: AntiCheatSignalType[] = ['blur', 'resume', 'client_error', 'context_menu_blocked'];

    for (const signalType of nonCounterSignals) {
        it(`${signalType} signal returns logged regardless of counters`, () => {
            const policy: AntiCheatPolicy = { ...SAFE_DEFAULTS, violationAction: 'lock' };
            const counters: AntiCheatCounters = { tabSwitchCount: 100, copyAttemptCount: 100, fullscreenExitCount: 100 };

            const decision = evaluateSignal(counters, policy, signalType);

            expect(decision.action).toBe('logged');
        });
    }
});
