/**
 * Shared API envelope types used by both backend and frontend.
 *
 * These interfaces define the standardized response format returned by all
 * backend controllers via ResponseBuilder.
 */

/** Pagination metadata included in list responses. */
export interface PaginationMeta {
    page?: number;
    limit?: number;
    total?: number;
}

/** Error payload nested inside an API error response. */
export interface ApiErrorPayload {
    code: string;
    details?: unknown;
}

/**
 * Standardized API response envelope.
 *
 * Every backend endpoint returns this shape. `data` is present on success,
 * `error` is present on failure, and `meta` is included for paginated lists.
 */
export interface ApiEnvelope<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: ApiErrorPayload;
    meta?: PaginationMeta;
}

/**
 * Known API error codes returned by the backend.
 * Mirrors the ErrorCode enum in `backend/src/utils/appError.ts`.
 */
export type ApiErrorCode =
    | 'VALIDATION_ERROR'
    | 'AUTHENTICATION_ERROR'
    | 'AUTHORIZATION_ERROR'
    | 'NOT_FOUND'
    | 'RATE_LIMIT_EXCEEDED'
    | 'SECURITY_VIOLATION'
    | 'SERVER_ERROR'
    | 'STUDENT_LOGIN_DISABLED';
