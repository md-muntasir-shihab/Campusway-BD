import { z } from 'zod';

// ── Exam Validation Schemas ─────────────────────────────
// Zod schemas for exam submit and anti-cheat signal endpoints.
// Requirements: 4.3, 8.5

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId');

/**
 * Exam submit request body schema.
 */
export const examSubmitSchema = z.object({
    answers: z.record(z.string(), z.unknown()).optional(),
    tabSwitchCount: z.number().int().min(0).optional(),
    isAutoSubmit: z.boolean().optional(),
    cheat_flags: z.array(z.string()).optional(),
    attemptId: objectId.optional(),
    submissionType: z.enum(['manual', 'auto', 'forced', 'timeout']).optional(),
    attemptRevision: z.number().int().min(0).optional(),
});

/**
 * Anti-cheat signal types emitted by the frontend Signal Collector.
 */
const antiCheatSignalTypes = [
    'tab_switch',
    'fullscreen_exit',
    'copy_attempt',
    'resume',
    'client_error',
    'blur',
    'context_menu_blocked',
] as const;

/**
 * Anti-cheat signal request body schema.
 * Sent from frontend to POST /api/exams/:examId/sessions/:sessionId/anti-cheat/signal
 */
export const antiCheatSignalSchema = z.object({
    eventType: z.enum(antiCheatSignalTypes),
    attemptRevision: z.number().int().min(0),
    metadata: z.record(z.string(), z.unknown()).optional(),
    timestamp: z.number().positive(),
});
