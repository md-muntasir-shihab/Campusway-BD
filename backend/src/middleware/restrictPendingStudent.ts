import { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth';
import User from '../models/User';

/**
 * Paths that pending students ARE allowed to access (read-only dashboard).
 * Matched as prefixes against `req.path` (the path relative to the router mount).
 */
const PERMITTED_PATHS = [
    '/profile',
    '/profile-update-request',
    '/dashboard',
    '/dashboard-profile',
    '/dashboard-full',
    '/dashboard-sections-config',
    '/dashboard/stream',
    '/notices',
    '/notifications',
    '/notifications/feed',
    '/notifications/mark-read',
    '/live-alerts',
    '/me',
    '/me/notifications',
    '/me/notifications/mark-read',
    '/otp/request',
    '/otp/verify',
    '/otp/resend',
];

/**
 * Paths that are explicitly restricted for pending students.
 * Any path starting with one of these prefixes will be blocked.
 */
const RESTRICTED_PATH_PREFIXES = [
    '/me/exams',
    '/me/results',
    '/me/payments',
    '/me/resources',
    '/me/weak-topics',
    '/upcoming-exams',
    '/exam-history',
    '/resources',
    '/payments',
    '/support-tickets',
    '/support/eligibility',
    '/applications',
    '/leaderboard',
    '/watchlist',
    '/featured-universities',
];

function isPermittedPath(path: string): boolean {
    // Exact match or path with trailing slash / query
    return PERMITTED_PATHS.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'));
}

function isRestrictedPath(path: string): boolean {
    return RESTRICTED_PATH_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path.startsWith(p + '?'));
}

/**
 * Middleware that restricts pending students to read-only access.
 *
 * - Checks if the authenticated user has role `student` and status `pending`.
 * - If so, only permits access to dashboard/profile/announcement endpoints.
 * - Returns HTTP 403 for restricted endpoints (exams, resources, payments, support tickets).
 *
 * Requirements: 5.2
 */
export async function restrictPendingStudent(
    req: AuthRequest,
    res: Response,
    next: NextFunction,
): Promise<void> {
    // Only applies to authenticated students
    if (!req.user || req.user.role !== 'student') {
        next();
        return;
    }

    try {
        const user = await User.findById(req.user._id).select('status role').lean();

        // If user not found or not pending, allow through
        if (!user || user.status !== 'pending') {
            next();
            return;
        }

        const path = req.path;

        // PUT/POST/DELETE on profile is a write — allow GET only for profile
        if (path === '/profile' && req.method !== 'GET') {
            res.status(403).json({
                message: 'Your account is pending approval. You cannot modify your profile until approved.',
                code: 'PENDING_STUDENT_RESTRICTED',
            });
            return;
        }

        // Check restricted paths FIRST (more specific, e.g. /me/exams before /me)
        if (isRestrictedPath(path)) {
            res.status(403).json({
                message: 'Your account is pending approval. Access to this feature is restricted until an admin approves your profile.',
                code: 'PENDING_STUDENT_RESTRICTED',
            });
            return;
        }

        // Check if the path is explicitly permitted
        if (isPermittedPath(path)) {
            next();
            return;
        }

        // Default: block unknown paths for pending students (safe default)
        res.status(403).json({
            message: 'Your account is pending approval. Access to this feature is restricted until an admin approves your profile.',
            code: 'PENDING_STUDENT_RESTRICTED',
        });
    } catch {
        // On DB error, allow through to avoid blocking legitimate users
        next();
    }
}
