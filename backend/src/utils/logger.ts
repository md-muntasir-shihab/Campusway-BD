import { Request } from 'express';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    requestId?: string;
    message: string;
    data?: Record<string, unknown>;
}

const PII_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
    { regex: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, replacement: '***@$2' },
    { regex: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replacement: '***-***-****' },
    { regex: /\b01[3-9]\d{8}\b/g, replacement: '01*********' }, // BD mobile numbers
];

function maskPII(text: string): string {
    let masked = text;
    for (const pattern of PII_PATTERNS) {
        masked = masked.replace(pattern.regex, pattern.replacement);
    }
    return masked;
}

function formatEntry(entry: LogEntry): string {
    const base = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const rid = entry.requestId ? ` [rid:${entry.requestId}]` : '';
    const msg = maskPII(entry.message);
    const extra = entry.data ? ` ${maskPII(JSON.stringify(entry.data))}` : '';
    return `${base}${rid} ${msg}${extra}`;
}

function createEntry(level: LogLevel, message: string, req?: Request, data?: Record<string, unknown>): LogEntry {
    return {
        timestamp: new Date().toISOString(),
        level,
        requestId: req?.requestId,
        message,
        data,
    };
}

export const logger = {
    info(message: string, req?: Request, data?: Record<string, unknown>): void {
        const entry = createEntry('info', message, req, data);
        console.log(formatEntry(entry));
    },

    warn(message: string, req?: Request, data?: Record<string, unknown>): void {
        const entry = createEntry('warn', message, req, data);
        console.warn(formatEntry(entry));
    },

    error(message: string, req?: Request, data?: Record<string, unknown>): void {
        const entry = createEntry('error', message, req, data);
        console.error(formatEntry(entry));
    },

    debug(message: string, req?: Request, data?: Record<string, unknown>): void {
        if (process.env.NODE_ENV === 'production') return;
        const entry = createEntry('debug', message, req, data);
        console.debug(formatEntry(entry));
    },
};
