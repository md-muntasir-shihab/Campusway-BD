import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../utils/appError';
import { logger } from '../utils/logger';

/**
 * Attempt to capture the error in Sentry when SENTRY_DSN is configured.
 * Uses dynamic import so @sentry/node is only loaded if available.
 */
async function captureWithSentry(err: Error, req: Request): Promise<void> {
    if (!process.env.SENTRY_DSN) return;
    try {
        const Sentry = await import('@sentry/node');
        Sentry.withScope((scope) => {
            scope.setTag('requestId', req.requestId ?? 'unknown');
            scope.setExtra('path', req.path);
            scope.setExtra('method', req.method);
            Sentry.captureException(err);
        });
    } catch {
        // @sentry/node not installed or failed — silently skip
    }
}

/**
 * Centralized Express error-handling middleware.
 *
 * Classification:
 *  1. AppError (operational)     → return error message + code to client
 *  2. AppError (non-operational) → generic message, log full stack, forward to Sentry
 *  3. ZodError                   → 400 with field-level validation errors
 *  4. Unknown                    → wrap as non-operational AppError with SERVER_ERROR
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction,
): void {
    // --- ZodError: field-level validation errors ---
    if (err instanceof ZodError) {
        const fieldErrors = err.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
        }));

        logger.info(`Validation error: ${err.issues.length} issue(s)`, req, {
            path: req.path,
            method: req.method,
        });

        res.status(400).json({
            success: false,
            error: {
                code: ErrorCode.VALIDATION_ERROR,
                details: fieldErrors,
            },
            message: 'Validation failed',
        });
        return;
    }

    // --- AppError ---
    if (err instanceof AppError) {
        if (err.isOperational) {
            // Operational: safe to expose to client
            res.status(err.statusCode).json({
                success: false,
                error: {
                    code: err.code,
                    ...(err.details !== undefined && { details: err.details }),
                },
                message: err.message,
            });
            return;
        }

        // Non-operational: log full stack, generic response
        logger.error(`Non-operational error: ${err.message}`, req, {
            stack: err.stack,
            code: err.code,
            path: req.path,
            method: req.method,
        });

        captureWithSentry(err, req);

        res.status(err.statusCode).json({
            success: false,
            error: { code: err.code },
            message: 'Internal server error',
        });
        return;
    }

    // --- Unknown error: wrap as non-operational SERVER_ERROR ---
    const wrapped = new AppError(
        500,
        ErrorCode.SERVER_ERROR,
        err.message || 'An unexpected error occurred',
        false,
    );

    logger.error(`Unhandled error: ${err.message}`, req, {
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    captureWithSentry(err, req);

    res.status(wrapped.statusCode).json({
        success: false,
        error: { code: wrapped.code },
        message: 'Internal server error',
    });
}
