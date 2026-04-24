import type { Response } from 'express';

/**
 * Standardized API response envelope.
 * All controllers should return responses matching this shape.
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: { code: string; details?: unknown };
    meta?: { page?: number; limit?: number; total?: number };
}

/**
 * Utility class for building standardized API response envelopes.
 *
 * Replaces ad-hoc `res.json()` calls with a consistent format:
 * `{ success, data?, message?, error?, meta? }`
 *
 * Backward-compatible with the existing `{ success, data }` shape.
 */
export class ResponseBuilder {
    /**
     * Build a success response (HTTP 200).
     */
    static success<T>(data: T, message?: string): ApiResponse<T> {
        const response: ApiResponse<T> = { success: true, data };
        if (message !== undefined) {
            response.message = message;
        }
        return response;
    }

    /**
     * Build a created response (HTTP 201).
     */
    static created<T>(data: T, message?: string): ApiResponse<T> {
        const response: ApiResponse<T> = { success: true, data };
        if (message !== undefined) {
            response.message = message;
        }
        return response;
    }

    /**
     * Build a paginated response with meta information.
     */
    static paginated<T>(
        data: T[],
        page: number,
        limit: number,
        total: number,
    ): ApiResponse<T[]> {
        return {
            success: true,
            data,
            meta: { page, limit, total },
        };
    }

    /**
     * Build an error response.
     */
    static error(
        code: string,
        message: string,
        details?: unknown,
    ): ApiResponse {
        const response: ApiResponse = {
            success: false,
            message,
            error: { code },
        };
        if (details !== undefined) {
            response.error!.details = details;
        }
        return response;
    }

    /**
     * Send a response with the given HTTP status code and envelope body.
     */
    static send(res: Response, status: number, body: ApiResponse): void {
        res.status(status).json(body);
    }
}
