import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';

/**
 * Generic Zod validation middleware factory for request body.
 * Parses req.body against the provided schema — replaces body with
 * the parsed (coerced / defaulted) output on success, or returns
 * 400 with field-level errors on failure.
 */
export function validateBody(schema: z.ZodSchema): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (result.success) {
            req.body = result.data;
            next();
            return;
        }

        const zodError = (result as any).error;
        const issues: Array<{ path: (string | number)[]; message: string }> =
            zodError?.issues ?? [];
        const errors = issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
        }));

        res.status(400).json({
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors,
        });
    };
}
