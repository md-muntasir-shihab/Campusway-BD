import { Request } from 'express';
import rateLimit from 'express-rate-limit';

type RequestWithUser = Request & { user?: { _id?: unknown } };

function examRateLimitKeyGenerator(req: Request): string {
  const request = req as RequestWithUser;
  const userId = request.user?._id ? String(request.user._id) : '';
  return userId || request.ip || 'anonymous';
}

export const examSessionStartLimit = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: examRateLimitKeyGenerator,
  message: { message: "Too many session start requests. Try again in 1 minute." },
});

export const examAutoSaveLimit = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: examRateLimitKeyGenerator,
  message: { message: "Too many save requests. Slow down." },
});

export const examSubmitLimit = rateLimit({
  windowMs: 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: examRateLimitKeyGenerator,
  message: { message: "Too many submit requests." },
});

export const examImportPreviewLimit = rateLimit({
  windowMs: 60_000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: examRateLimitKeyGenerator,
  message: { message: 'Too many import preview requests. Slow down.' },
});

export const examImportCommitLimit = rateLimit({
  windowMs: 60_000,
  max: 4,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: examRateLimitKeyGenerator,
  message: { message: 'Too many import commit requests. Slow down.' },
});
