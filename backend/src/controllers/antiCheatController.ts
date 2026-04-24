// ─── AntiCheat Controller ────────────────────────────────────────────────────
// Handles anti-cheat signal processing endpoint.
// Requirements: 7.1, 7.2, 7.6, 7.8

import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth';
import { processAntiCheatSignal, AntiCheatSignalError } from '../services/antiCheatEngine';
import { ResponseBuilder } from '../utils/responseBuilder';

/**
 * Error code → HTTP status mapping for AntiCheatSignalError.
 */
const ERROR_STATUS_MAP: Record<string, number> = {
    SESSION_LOCKED: 403,
    REVISION_MISMATCH: 409,
    INVALID_SIGNAL_TYPE: 400,
    SESSION_NOT_FOUND: 404,
    SESSION_ALREADY_SUBMITTED: 409,
};

/**
 * POST /api/exams/:examId/sessions/:sessionId/anti-cheat/signal
 *
 * Processes an anti-cheat signal from the frontend Signal Collector.
 * Extracts examId and sessionId from route params, delegates to
 * processAntiCheatSignal(), and returns the AntiCheatDecision as JSON.
 */
export async function processSignalController(req: AuthRequest, res: Response): Promise<void> {
    try {
        const examId = String(req.params.examId || '');
        const sessionId = String(req.params.sessionId || '');

        const decision = await processAntiCheatSignal(examId, sessionId, req.body, {
            ip: req.ip || '0.0.0.0',
            userAgent: req.headers['user-agent'] || '',
            correlationId: (req as any).requestId || '',
        });

        ResponseBuilder.send(res, 200, ResponseBuilder.success(decision));
    } catch (err: unknown) {
        if (err instanceof AntiCheatSignalError) {
            const status = ERROR_STATUS_MAP[err.code] ?? err.statusCode;
            ResponseBuilder.send(res, status, ResponseBuilder.error(err.code || 'SERVER_ERROR', err.message));
            return;
        }

        console.error('[AntiCheatController] Unexpected error:', err);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Internal server error'));
    }
}
