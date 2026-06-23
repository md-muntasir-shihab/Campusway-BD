import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import ActiveSession from '../models/ActiveSession';
import SecureUpload from '../models/SecureUpload';
import User from '../models/User';
import { ResponseBuilder } from '../utils/responseBuilder';

const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET || (() => { throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is required'); })();
const ACCESS_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('FATAL: JWT_SECRET environment variable is required'); })() : 'dev-only-jwt-secret-do-not-use');

/**
 * Roles that may read a PROTECTED upload when its accessRoles list is empty.
 * Read-only roles (viewer, editor, support_agent, finance_agent) are
 * intentionally excluded — they must be granted explicitly via accessRoles.
 */
const TRUSTED_PROTECTED_READ_ROLES = new Set(['superadmin', 'admin', 'moderator', 'chairman']);

/** Resolve storagePath only if it lives under public/uploads (traversal guard). */
function resolveContainedStoragePath(storagePath: string): string | null {
    if (typeof storagePath !== 'string' || storagePath.length === 0 || storagePath.includes('\0')) {
        return null;
    }
    const UPLOADS_DIR = path.resolve(__dirname, '../../public/uploads');
    const resolved = path.resolve(storagePath);
    const prefix = UPLOADS_DIR + path.sep;
    if (resolved !== UPLOADS_DIR && !resolved.startsWith(prefix)) {
        return null;
    }
    return resolved;
}

type UploadRefreshTokenPayload = {
    _id: string;
    id?: string;
    sessionId?: string;
};

async function attachUserFromRefreshCookie(req: Request): Promise<void> {
    if (req.user) return;

    // 1) Bearer / cookie access token (Authorization header or access_token cookie),
    //    so API/mobile clients can fetch protected uploads too.
    const authHeader = String(req.headers?.authorization || '');
    const bearerToken = authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]?.trim() || ''
        : '';
    const accessToken = bearerToken || String(req.cookies?.access_token || '').trim();
    if (accessToken) {
        try {
            const decodedAccess = jwt.verify(accessToken, ACCESS_SECRET) as UploadRefreshTokenPayload;
            if (decodedAccess?._id) {
                const user = await User.findById(decodedAccess._id)
                    .select('username email role full_name permissions permissionsV2 status')
                    .lean();
                if (user && String(user.status || '').toLowerCase() === 'active') {
                    req.user = {
                        _id: String(user._id),
                        id: String(user._id),
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        fullName: user.full_name,
                        permissions: user.permissions,
                        permissionsV2: user.permissionsV2,
                        sessionId: decodedAccess.sessionId,
                    };
                    return;
                }
            }
        } catch {
            // fall through to refresh-token path
        }
    }

    // 2) Refresh-token cookie (web clients).
    const refreshToken = String(req.cookies?.refresh_token || '').trim();
    if (!refreshToken) return;

    try {
        const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as UploadRefreshTokenPayload;
        if (!decoded?._id) return;

        if (decoded.sessionId) {
            const session = await ActiveSession.findOne({
                session_id: decoded.sessionId,
                status: 'active',
            })
                .select('_id')
                .lean();
            if (!session) return;
        }

        const user = await User.findById(decoded._id)
            .select('username email role full_name permissions permissionsV2 status')
            .lean();
        if (!user || String(user.status || '').toLowerCase() !== 'active') return;

        req.user = {
            _id: String(user._id),
            id: String(user._id),
            username: user.username,
            email: user.email,
            role: user.role,
            fullName: user.full_name,
            permissions: user.permissions,
            permissionsV2: user.permissionsV2,
            sessionId: decoded.sessionId,
        };
    } catch {
        return;
    }
}

function canAccessUpload(
    upload: {
        visibility: string;
        ownerUserId?: unknown;
        accessRoles?: string[];
        deletedAt?: Date | null;
    },
    user?: Request['user'],
): boolean {
    // Bug 1.10 fix: Deny access if upload has been revoked (deletedAt set), unless superadmin
    if (upload.deletedAt) {
        const normalizedRole = String(user?.role || '').trim().toLowerCase();
        return normalizedRole === 'superadmin';
    }
    if (upload.visibility === 'public') return true;
    if (!user?._id) return false;

    const normalizedRole = String(user.role || '').trim().toLowerCase();
    const accessRoles = Array.isArray(upload.accessRoles)
        ? upload.accessRoles.map((role) => String(role || '').trim().toLowerCase()).filter(Boolean)
        : [];
    const ownerUserId = String(upload.ownerUserId || '').trim();

    if (ownerUserId && ownerUserId === String(user._id)) return true;
    if (accessRoles.includes(normalizedRole)) return true;
    // When accessRoles is empty, allow only trusted (non-read-only) admin roles
    // to read protected uploads. Read-only roles (viewer/editor/support_agent/
    // finance_agent) must be granted explicitly via accessRoles.
    if (TRUSTED_PROTECTED_READ_ROLES.has(normalizedRole) && accessRoles.length === 0) return true;
    return false;
}

export async function serveSecureUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const storedName = String(req.params.storedName || '').trim();
        if (!storedName) {
            next();
            return;
        }

        const upload = await SecureUpload.findOne({
            storedName,
            deletedAt: null,
        }).lean();

        if (!upload) {
            next();
            return;
        }

        await attachUserFromRefreshCookie(req);

        if (!canAccessUpload(upload, req.user)) {
            const status = req.user ? 403 : 401;
            const code = req.user ? 'AUTHORIZATION_ERROR' : 'AUTHENTICATION_ERROR';
            const message = req.user ? 'You do not have permission to access this file.' : 'Authentication required';
            ResponseBuilder.send(res, status, ResponseBuilder.error(code, message));
            return;
        }

        if (!fs.existsSync(upload.storagePath)) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'File not found'));
            return;
        }

        // Containment guard: never serve a storagePath that escapes public/uploads
        // (defends against poisoned DB records / path traversal).
        const safePath = resolveContainedStoragePath(upload.storagePath);
        if (!safePath) {
            ResponseBuilder.send(res, 404, ResponseBuilder.error('NOT_FOUND', 'File not found'));
            return;
        }

        SecureUpload.updateOne(
            { _id: upload._id },
            {
                $inc: { downloadCount: 1 },
                $set: { lastDownloadedAt: new Date() },
            },
        ).catch(() => undefined);

        if (upload.visibility === 'protected') {
            res.setHeader('Cache-Control', 'private, no-store');
        } else {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        }
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.type(upload.mimeType || 'application/octet-stream');
        res.sendFile(safePath);
    } catch (error) {
        console.error('serveSecureUpload error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Failed to serve file'));
    }
}
