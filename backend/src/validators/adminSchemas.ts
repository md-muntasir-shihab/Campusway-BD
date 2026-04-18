import { z } from 'zod';

// ── Admin Validation Schemas ────────────────────────────
// Zod schemas for admin anti-cheat policy management.
// Requirements: 8.5, 8.6, 11.2, 11.6

/**
 * All valid Policy_Field keys for anti-cheat policy.
 * Used to reject unknown override keys (Req 11.6).
 */
const VALID_POLICY_KEYS = [
    'tabSwitchLimit',
    'copyPasteViolationLimit',
    'requireFullscreen',
    'violationAction',
    'warningCooldownSeconds',
    'maxFullscreenExitLimit',
    'enableClipboardBlock',
    'enableContextMenuBlock',
    'enableBlurTracking',
    'allowMobileRelaxedMode',
    'proctoringSignalsEnabled',
    'strictExamTabLock',
] as const;

/**
 * Full anti-cheat policy schema with range validation for all Policy_Fields.
 * Used for PUT /api/__cw_admin__/security/anti-cheat-policy
 * Requirement 11.2: tabSwitchLimit (1-100), copyPasteViolationLimit (1-50),
 * warningCooldownSeconds (0-300), maxFullscreenExitLimit (1-50), violationAction enum check.
 */
export const antiCheatPolicySchema = z.object({
    tabSwitchLimit: z.number().int().min(1).max(100).optional(),
    copyPasteViolationLimit: z.number().int().min(1).max(50).optional(),
    requireFullscreen: z.boolean().optional(),
    violationAction: z.enum(['warn', 'submit', 'lock']).optional(),
    warningCooldownSeconds: z.number().int().min(0).max(300).optional(),
    maxFullscreenExitLimit: z.number().int().min(1).max(50).optional(),
    enableClipboardBlock: z.boolean().optional(),
    enableContextMenuBlock: z.boolean().optional(),
    enableBlurTracking: z.boolean().optional(),
    allowMobileRelaxedMode: z.boolean().optional(),
    proctoringSignalsEnabled: z.boolean().optional(),
    strictExamTabLock: z.boolean().optional(),
}).strict();

/**
 * Per-exam anti-cheat overrides schema.
 * Same fields as antiCheatPolicySchema but rejects unknown keys (Req 11.6).
 */
export const antiCheatOverridesSchema = antiCheatPolicySchema;

export { VALID_POLICY_KEYS };
