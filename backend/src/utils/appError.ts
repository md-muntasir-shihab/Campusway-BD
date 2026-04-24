export enum ErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    NOT_FOUND = 'NOT_FOUND',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    SECURITY_VIOLATION = 'SECURITY_VIOLATION',
    SERVER_ERROR = 'SERVER_ERROR',
}

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: ErrorCode;
    public readonly isOperational: boolean;
    public readonly details?: unknown;

    constructor(
        statusCode: number,
        code: ErrorCode,
        message: string,
        isOperational: boolean = true,
        details?: unknown,
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;

        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
