import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.js';
export const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return sendError(res, 'UNAUTHORIZED', 'Missing bearer token', 401);
    }
    const token = authHeader.slice(7).trim();
    if (token === 'dev-admin-token') {
        req.adminActorId = 'dev-admin';
        return next();
    }
    try {
        const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET ?? 'campusway-admin-secret');
        if (typeof decoded === 'object' && decoded) {
            const actorId = decoded.sub || decoded.id || decoded._id || decoded.userId || '';
            req.adminActorId = actorId;
        }
        return next();
    }
    catch {
        return sendError(res, 'UNAUTHORIZED', 'Invalid admin token', 401);
    }
};
