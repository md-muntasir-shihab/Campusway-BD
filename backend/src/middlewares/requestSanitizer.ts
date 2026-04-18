import { NextFunction, Request, Response } from 'express';
import sanitizeHtml from 'sanitize-html';

const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function sanitizeStringValue(value: string): string {
    const trimmed = value.trim();
    if (!trimmed.includes('<') && !trimmed.includes('>')) {
        return value;
    }

    return sanitizeHtml(trimmed, {
        allowedTags: ['b', 'strong', 'i', 'em', 'u', 'p', 'ul', 'ol', 'li', 'br', 'a', 'blockquote', 'code', 'pre'],
        allowedAttributes: {
            a: ['href', 'target', 'rel'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
    });
}

export function sanitizeObject<T>(input: T): T {
    if (Array.isArray(input)) {
        return input.map((item) => sanitizeObject(item)) as T;
    }

    if (input && typeof input === 'object') {
        const target: Record<string, unknown> = {};
        Object.entries(input as Record<string, unknown>).forEach(([key, rawValue]) => {
            if (!key) return;
            if (BLOCKED_KEYS.has(key)) return;
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

export function sanitizeRequestPayload(req: Request, _res: Response, next: NextFunction): void {
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);
    next();
}
