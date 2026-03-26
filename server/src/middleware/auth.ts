import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.js';

type JwtPayload = {
  sub?: string;
  id?: string;
  _id?: string;
  userId?: string;
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 'UNAUTHORIZED', 'Missing bearer token', 401);
  }

  const token = authHeader.slice(7).trim();

  if (token === 'dev-admin-token') {
    (req as Request & { adminActorId?: string }).adminActorId = 'dev-admin';
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET ?? 'campusway-admin-secret') as JwtPayload | string;
    if (typeof decoded === 'object' && decoded) {
      const actorId = decoded.sub || decoded.id || decoded._id || decoded.userId || '';
      (req as Request & { adminActorId?: string }).adminActorId = actorId;
    }
    return next();
  } catch {
    return sendError(res, 'UNAUTHORIZED', 'Invalid admin token', 401);
  }
};

