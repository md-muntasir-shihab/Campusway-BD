// ─── AntiCheat Engine — Pure Functions + Signal Processing Orchestrator ───────
// Backend-authoritative anti-cheat policy engine for CampusWay exam system.
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 8.3, 8.4, 8.8, 9.8, 9.9

import type {
    AntiCheatPolicy,
    AntiCheatOverrides,
    AntiCheatSignalType,
    AntiCheatDecision,
    AntiCheatDecisionAction,
    AntiCheatSignal,
} from '../types/antiCheat';
import { SAFE_DEFAULTS, SEVERITY_ORDER } from '../types/antiCheat';
import ExamSession from '../models/ExamSession';
import ExamEvent from '../models/ExamEvent';
import SecuritySettings from '../models/SecuritySettings';
import Exam from '../models/Exam';
import { logAntiCheatAction } from './securityAuditLogger';
import { checkAntiCheatSpike } from './securityAlertService';

// ─── Counter-incrementing signal → counter/limit mapping ─────────────────────

interface CounterLimitMapping {
    counterField: 'tabSwitchCount' | 'copyAttemptCount' | 'fullscreenExitCount';
    limitField: 'tabSwitchLimit' | 'copyPasteViolationLimit' | 'maxFullscreenExitLimit';
}

const COUNTER_SIGNAL_MAP: Record<string, CounterLimitMapping> = {
    tab_switch: { counterField: 'tabSwitchCount', limitField: 'tabSwitchLimit' },
    copy_attempt: { counterField: 'copyAttemptCount', limitField: 'copyPasteViolationLimit' },
    fullscreen_exit: { counterField: 'fullscreenExitCount', limitField: 'maxFullscreenExitLimit' },
};

// ─── Counters interface ──────────────────────────────────────────────────────

export interface AntiCheatCounters {
    tabSwitchCount: number;
    copyAttemptCount: number;
    fullscreenExitCount: number;
}

// ─── Pure Functions ──────────────────────────────────────────────────────────

/**
 * Merge global policy with per-exam overrides.
 * Priority: SAFE_DEFAULTS < globalPolicy < overrides
 * Requirement 8.3: per-exam overrides get highest priority.
 * Requirement 8.4: legacy exams use SAFE_DEFAULTS.
 */
export function mergeAntiCheatPolicy(
    globalPolicy: Partial<AntiCheatPolicy>,
    overrides: AntiCheatOverrides | undefined,
): AntiCheatPolicy {
    const merged: AntiCheatPolicy = {
        ...SAFE_DEFAULTS,
        ...globalPolicy,
        ...(overrides ?? {}),
    };
    return enforceConstraints(merged);
}

/**
 * Enforce numeric field constraints on a policy.
 * Invalid values fall back to SAFE_DEFAULTS.
 * Requirement 8.8: tabSwitchLimit >= 1, copyPasteViolationLimit >= 1,
 *   warningCooldownSeconds >= 0, maxFullscreenExitLimit >= 1
 */
export function enforceConstraints(policy: AntiCheatPolicy): AntiCheatPolicy {
    return {
        ...policy,
        tabSwitchLimit:
            typeof policy.tabSwitchLimit === 'number' && policy.tabSwitchLimit >= 1
                ? policy.tabSwitchLimit
                : SAFE_DEFAULTS.tabSwitchLimit,
        copyPasteViolationLimit:
            typeof policy.copyPasteViolationLimit === 'number' && policy.copyPasteViolationLimit >= 1
                ? policy.copyPasteViolationLimit
                : SAFE_DEFAULTS.copyPasteViolationLimit,
        warningCooldownSeconds:
            typeof policy.warningCooldownSeconds === 'number' && policy.warningCooldownSeconds >= 0
                ? policy.warningCooldownSeconds
                : SAFE_DEFAULTS.warningCooldownSeconds,
        maxFullscreenExitLimit:
            typeof policy.maxFullscreenExitLimit === 'number' && policy.maxFullscreenExitLimit >= 1
                ? policy.maxFullscreenExitLimit
                : SAFE_DEFAULTS.maxFullscreenExitLimit,
    };
}

/**
 * Map policy violationAction to AntiCheatDecisionAction.
 * 'submit' in policy maps to 'force_submit' in decision.
 */
function mapViolationAction(violationAction: AntiCheatPolicy['violationAction']): AntiCheatDecisionAction {
    if (violationAction === 'submit') return 'force_submit';
    return violationAction; // 'warn' | 'lock' stay as-is
}

/**
 * Evaluate a signal against the current counters and policy.
 * Returns a decision with action, optional warningMessage and remainingViolations.
 *
 * Decision matrix (counter-incrementing signals):
 *   counter < limit - 1        → logged
 *   counter == limit - 1       → warn (with warningMessage + remainingViolations)
 *   counter >= limit           → violationAction (warn/lock/force_submit)
 *
 * Non-counter signals (blur, resume, client_error, context_menu_blocked) → logged
 *
 * Severity monotonicity: logged < warn < lock ≤ force_submit
 *
 * Requirements: 7.1, 7.2, 7.3, 9.8, 9.9
 */
export function evaluateSignal(
    counters: AntiCheatCounters,
    policy: AntiCheatPolicy,
    signalType: AntiCheatSignalType,
): AntiCheatDecision {
    const mapping = COUNTER_SIGNAL_MAP[signalType];

    // Non-counter signals are always just logged
    if (!mapping) {
        return { action: 'logged' };
    }

    const counter = counters[mapping.counterField];
    const limit = policy[mapping.limitField];

    // Below approaching threshold → logged
    if (counter < limit - 1) {
        return { action: 'logged' };
    }

    // Approaching threshold (one away from limit) → warn
    if (counter === limit - 1) {
        const finalAction = mapViolationAction(policy.violationAction);
        const remaining = limit - counter;
        return {
            action: 'warn',
            warningMessage: `আপনি সীমার কাছাকাছি পৌঁছেছেন। আরও ${remaining}টি লঙ্ঘনে ${finalAction === 'force_submit' ? 'পরীক্ষা জোরপূর্বক সাবমিট' : finalAction === 'lock' ? 'সেশন লক' : 'সতর্কতা'} হবে।`,
            remainingViolations: remaining,
        };
    }

    // At or beyond limit → violationAction
    const action = mapViolationAction(policy.violationAction);
    return { action };
}

// ─── Custom Error for AntiCheat Signal Processing ────────────────────────────

export class AntiCheatSignalError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number,
    ) {
        super(message);
        this.name = 'AntiCheatSignalError';
    }
}

// ─── Request Context ─────────────────────────────────────────────────────────

export interface SignalRequestContext {
    ip: string;
    userAgent: string;
    correlationId: string;
}

// ─── Signal Processing Orchestrator ──────────────────────────────────────────

/**
 * Process an anti-cheat signal end-to-end:
 *  1. Load ExamSession — check sessionLocked, attemptRevision
 *  2. Load merged AntiCheat Policy (SecuritySettings + Exam overrides)
 *  3. Evaluate signal via evaluateSignal()
 *  4. Increment ExamSession counters for counter-incrementing signals
 *  5. Create ExamEvent record
 *  6. On lock/force_submit — update ExamSession state
 *  7. Return AntiCheatDecision
 *
 * Requirements: 7.1, 7.2, 7.4, 7.5, 7.6, 7.7, 7.8
 */
export async function processAntiCheatSignal(
    examId: string,
    sessionId: string,
    signal: AntiCheatSignal,
    ctx: SignalRequestContext,
): Promise<AntiCheatDecision> {
    // ── 1. Load ExamSession ──────────────────────────────────────────────────
    const session = await ExamSession.findById(sessionId);
    if (!session) {
        throw new AntiCheatSignalError('পরীক্ষা সেশন পাওয়া যায়নি', 'SESSION_NOT_FOUND', 404);
    }

    // Reject if already submitted (Req 7.8)
    if (session.status === 'submitted') {
        throw new AntiCheatSignalError('সেশন ইতিমধ্যে submit হয়েছে', 'SESSION_ALREADY_SUBMITTED', 409);
    }

    // Reject if session is locked (Req 7.8)
    if (session.sessionLocked) {
        throw new AntiCheatSignalError('পরীক্ষা সেশন লক করা হয়েছে', 'SESSION_LOCKED', 403);
    }

    // Reject on revision mismatch (Req 7.6)
    if (signal.attemptRevision !== session.attemptRevision) {
        throw new AntiCheatSignalError('attemptRevision mismatch', 'REVISION_MISMATCH', 409);
    }

    // ── 2. Load merged AntiCheat Policy ──────────────────────────────────────
    const [securitySettings, exam] = await Promise.all([
        SecuritySettings.findOne({ key: 'global' }),
        Exam.findById(examId).select('antiCheatOverrides'),
    ]);

    const globalPolicy: Partial<AntiCheatPolicy> = securitySettings?.antiCheatPolicy
        ? (securitySettings.antiCheatPolicy as unknown as Partial<AntiCheatPolicy>)
        : {};
    const overrides: AntiCheatOverrides | undefined = exam?.antiCheatOverrides as AntiCheatOverrides | undefined;
    const policy = mergeAntiCheatPolicy(globalPolicy, overrides);

    // ── 3. Evaluate signal ───────────────────────────────────────────────────
    const counters: AntiCheatCounters = {
        tabSwitchCount: session.tabSwitchCount,
        copyAttemptCount: session.copyAttemptCount,
        fullscreenExitCount: session.fullscreenExitCount,
    };

    const decision = evaluateSignal(counters, policy, signal.eventType);

    // ── 4. Increment counters for counter-incrementing signals ───────────────
    const mapping = COUNTER_SIGNAL_MAP[signal.eventType];
    if (mapping) {
        (session as any)[mapping.counterField] = (session as any)[mapping.counterField] + 1;
    }

    // ── 5. Handle lock / force_submit decisions ──────────────────────────────
    if (decision.action === 'lock') {
        // Req 7.4: lock session
        session.sessionLocked = true;
        session.lockReason = `Anti-cheat: ${signal.eventType} limit exceeded`;
        decision.sessionState = 'locked';
    } else if (decision.action === 'force_submit') {
        // Req 7.5: force submit
        session.sessionLocked = true;
        session.lockReason = `Anti-cheat: forced submission — ${signal.eventType} limit exceeded`;
        session.submissionType = 'forced';
        session.forcedSubmittedAt = new Date();
        session.auto_submitted = true;
        session.status = 'submitted';
        session.submittedAt = new Date();
        session.isActive = false;
        decision.sessionState = 'submitted';
    } else {
        decision.sessionState = 'active';
    }

    // Bump attemptRevision so subsequent signals carry the new revision
    session.attemptRevision = (session.attemptRevision ?? 0) + 1;

    await session.save();

    // ── 6. Create ExamEvent record (Req 7.7) ────────────────────────────────
    await ExamEvent.create({
        attempt: session._id,
        student: session.student,
        exam: session.exam,
        eventType: signal.eventType,
        metadata: {
            counter: mapping
                ? { [mapping.counterField]: (session as any)[mapping.counterField] }
                : undefined,
            policySnapshot: policy,
            decision: {
                action: decision.action,
                warningMessage: decision.warningMessage,
                remainingViolations: decision.remainingViolations,
            },
            clientTimestamp: signal.timestamp,
            signalMetadata: signal.metadata,
        },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
    });

    // ── 7. Audit logging for non-logged decisions (Req 12.4) ─────────────
    if (decision.action !== 'logged') {
        logAntiCheatAction({
            correlationId: ctx.correlationId,
            sessionId,
            examId,
            studentId: String(session.student),
            signalType: signal.eventType,
            decision: decision.action,
            counters: {
                tabSwitchCount: session.tabSwitchCount,
                copyAttemptCount: session.copyAttemptCount,
                fullscreenExitCount: session.fullscreenExitCount,
            },
            policySnapshot: policy,
            ip: ctx.ip,
            userAgent: ctx.userAgent,
        }).catch(() => { /* audit logging must never crash the request pipeline */ });
    }

    // ── 8. Alert check on lock decisions (Req 13.4) ──────────────────────
    if (decision.action === 'lock' || decision.action === 'force_submit') {
        checkAntiCheatSpike(examId).catch(() => { /* alert check must never crash the request pipeline */ });
    }

    return decision;
}
