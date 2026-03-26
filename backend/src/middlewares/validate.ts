import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Express middleware that validates req.body against a Zod schema.
 * Returns 400 with structured error messages on validation failure.
 */
export function validate(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                const issues = err.issues ?? [];
                const errors = issues.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                res.status(400).json({ message: 'Validation failed', errors });
                return;
            }
            next(err);
        }
    };
}

/**
 * Validates req.query against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.query = schema.parse(req.query) as Record<string, string>;
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                const issues = err.issues ?? [];
                const errors = issues.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                }));
                res.status(400).json({ message: 'Validation failed', errors });
                return;
            }
            next(err);
        }
    };
}
