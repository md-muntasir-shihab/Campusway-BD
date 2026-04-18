import { z } from 'zod';

// ── Auth Validation Schemas ─────────────────────────────
// Zod schemas for high-risk auth endpoints: login, register, password reset.
// Requirements: 4.3

const safeStr = z.string().trim().max(1000);

/**
 * Login request body schema.
 * Accepts identifier (email or username) + password, optional portal.
 */
export const loginSchema = z.object({
    identifier: safeStr.min(1, 'Username or email is required').optional(),
    email: safeStr.optional(),
    username: safeStr.optional(),
    password: z.string().min(1, 'Password is required').max(500),
    portal: z.enum(['student', 'admin', 'chairman']).optional(),
}).refine(
    (d) => !!(d.identifier || d.email || d.username),
    { message: 'identifier, email, or username is required', path: ['identifier'] },
);

/**
 * Student registration request body schema.
 */
export const registerSchema = z.object({
    fullName: safeStr.min(1, 'Full name is required').optional(),
    name: safeStr.optional(),
    email: z.string().trim().email('Invalid email').max(500),
    username: z.string().trim().min(1, 'Username is required').max(200),
    password: z.string().min(1, 'Password is required').max(500),
    phone: safeStr.optional(),
}).refine(
    (d) => !!(d.fullName || d.name),
    { message: 'fullName or name is required', path: ['fullName'] },
);

/**
 * Password reset request body schema.
 * Covers both forgotPassword (identifier only) and resetPassword (token + newPassword).
 */
export const passwordResetSchema = z.union([
    // forgotPassword: just needs an identifier
    z.object({
        identifier: safeStr.min(1, 'Identifier is required').optional(),
        email: safeStr.optional(),
        username: safeStr.optional(),
    }).refine(
        (d) => !!(d.identifier || d.email || d.username),
        { message: 'identifier, email, or username is required', path: ['identifier'] },
    ),
    // resetPassword: needs token + newPassword
    z.object({
        token: z.string().trim().min(1, 'Token is required'),
        newPassword: z.string().min(1, 'New password is required').max(500),
    }),
]);
