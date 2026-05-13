import { NextFunction, Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import { AppError, ErrorCode } from '../utils/appError';
import { logger } from '../utils/logger';

// ── Blocked key sets ────────────────────────────────────────────────────────

const PROTOTYPE_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const MONGO_OPERATOR_KEYS = new Set([
    '$gt', '$lt', '$ne', '$regex', '$where', '$exists',
    '$gte', '$lte', '$eq', '$in', '$nin',
    '$or', '$and', '$not', '$nor',
    '$type', '$mod', '$text', '$search',
    '$elemMatch', '$size', '$all',
    '$set', '$unset', '$push', '$pull',
]);

// ── Allowed HTML tags for rich-text fields ──────────────────────────────────

const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 'p', 'ul', 'ol', 'li', 'br', 'a', 'blockquote', 'code', 'pre'];

const SANITIZE_HTML_OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
        a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
};

// ── Detection helpers ───────────────────────────────────────────────────────

export interface SecurityViolation {
    type: 'MONGO_OPERATOR' | 'PROTOTYPE_POLLUTION';
    key: string;
    path: string;
}

/**
 * Recursively scan an object for dangerous keys.
 * Returns the first violation found, or null if clean.
 */
export function detectViolation(input: unknown, currentPath: string = ''): SecurityViolation | null {
    if (Array.isArray(input)) {
        for (let i = 0; i < input.length; i++) {
            const violation = detectViolation(input[i], `${currentPath}[${i}]`);
            if (violation) return violation;
        }
        return null;
    }

    if (input && typeof input === 'object') {
        for (const key of Object.keys(input as Record<string, unknown>)) {
            if (!key) continue;

            const keyPath = currentPath ? `${currentPath}.${key}` : key;

            if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
                return { type: 'PROTOTYPE_POLLUTION', key, path: keyPath };
            }

            if (key.startsWith('$')) {
                return { type: 'MONGO_OPERATOR', key, path: keyPath };
            }

            // Recurse into nested values
            const violation = detectViolation((input as Record<string, unknown>)[key], keyPath);
            if (violation) return violation;
        }
    }

    return null;
}

// ── String sanitization ─────────────────────────────────────────────────────

export function sanitizeStringValue(value: string): string {
    const trimmed = value.trim();
    if (!trimmed.includes('<') && !trimmed.includes('>')) {
        return value;
    }

    return sanitizeHtml(trimmed, SANITIZE_HTML_OPTIONS);
}

// ── Object sanitization (HTML stripping only — dangerous keys already rejected) ──

export function sanitizeObject<T>(input: T): T {
    if (Array.isArray(input)) {
        return input.map((item) => sanitizeObject(item)) as T;
    }

    if (input && typeof input === 'object') {
        const target: Record<string, unknown> = {};
        Object.entries(input as Record<string, unknown>).forEach(([key, rawValue]) => {
            if (!key) return;
            // Skip blocked keys as a defense-in-depth layer
            // (primary rejection happens in detectViolation)
            if (PROTOTYPE_POLLUTION_KEYS.has(key)) return;
            if (key.startsWith('$')) return;
            if (key.includes('.')) return;

            target[key] = sanitizeObject(rawValue);
        });
        return target as T;
    }

    if (typeof input === 'string') {
        return sanitizeStringValue(input) as T;
    }

    return input;
}

// ── Zod schema validation middleware factory ────────────────────────────────

interface ValidateRequestOptions {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
}

/**
 * Middleware factory that validates request body, query, and/or params
 * against Zod schemas before controller logic runs.
 */
export function validateRequest(schemas: ValidateRequestOptions) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (schemas.body) {
            const result = schemas.body.safeParse(req.body);
            if (!result.success) {
                const errors = result.error.issues.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                res.status(400).json({
                    success: false,
                    error: { code: ErrorCode.VALIDATION_ERROR, details: errors },
                    message: 'Request body validation failed',
                });
                return;
            }
            req.body = result.data;
        }

        if (schemas.query) {
            const result = schemas.query.safeParse(req.query);
            if (!result.success) {
                const errors = result.error.issues.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                res.status(400).json({
                    success: false,
                    error: { code: ErrorCode.VALIDATION_ERROR, details: errors },
                    message: 'Request query validation failed',
                });
                return;
            }
            req.query = result.data as typeof req.query;
        }

        if (schemas.params) {
            const result = schemas.params.safeParse(req.params);
            if (!result.success) {
                const errors = result.error.issues.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                res.status(400).json({
                    success: false,
                    error: { code: ErrorCode.VALIDATION_ERROR, details: errors },
                    message: 'Request params validation failed',
                });
                return;
            }
            req.params = result.data as typeof req.params;
        }

        next();
    };
}

// ── Main sanitizer middleware ────────────────────────────────────────────────

/**
 * Global request sanitizer middleware.
 * 1. Detects and rejects MongoDB operator injection & prototype pollution
 * 2. Sanitizes (strips disallowed HTML) from all string values
 */
export function sanitizeRequestPayload(req: Request, _res: Response, next: NextFunction): void {
    // Check body, query, and params for injection patterns
    for (const source of ['body', 'query', 'params'] as const) {
        const data = req[source];
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            const violation = detectViolation(data, source);
            if (violation) {
                logger.error(
                    `Security violation detected: ${violation.type} key "${violation.key}" at "${violation.path}"`,
                    req,
                    {
                        violationType: violation.type,
                        violationKey: violation.key,
                        violationPath: violation.path,
                        method: req.method,
                        url: req.originalUrl,
                    },
                );
                throw new AppError(
                    400,
                    ErrorCode.SECURITY_VIOLATION,
                    `Forbidden key detected: ${violation.key}`,
                    true,
                    { violationType: violation.type, path: violation.path },
                );
            }
        }
    }

    // Sanitize HTML from string values (defense-in-depth stripping of any remaining bad keys)
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    next();
}
