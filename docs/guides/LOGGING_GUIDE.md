# CampusWay Logging Guide

## Architecture

CampusWay uses a structured logging system built on top of `console.*` with additional features:

```text
Request → requestId middleware → logger.info/warn/error → stdout
```

## Log Format

```text
[2026-03-03T12:00:00.000Z] [INFO] [rid:abc-123] Payment processed {paymentId: "xyz"}
[2026-03-03T12:00:01.000Z] [ERROR] [rid:def-456] Unhandled error: DB timeout {statusCode: 500}
```

## Files

| File | Purpose |
| --- | --- |
| `backend/src/middlewares/requestId.ts` | Attaches `X-Request-Id` header |
| `backend/src/utils/logger.ts` | Structured logger with PII masking |

## PII Masking

The logger automatically masks:

- **Email addresses**: `user@example.com` → `***@example.com`
- **Phone numbers**: `+8801712345678` → `01*********`
- **US phone format**: `555-123-4567` → `***-***-****`

## Usage in Controllers

```typescript
import { logger } from '../utils/logger';

export async function myHandler(req: Request, res: Response) {
    logger.info('Processing request', req, { userId: req.user?._id });
    
    try {
        // ... business logic
    } catch (error) {
        logger.error(`Handler failed: ${error.message}`, req, { stack: error.stack });
        res.status(500).json({ message: 'Server error' });
    }
}
```

## Log Levels in Production

- `DEBUG` is **disabled** in `NODE_ENV=production`
- `INFO`, `WARN`, `ERROR` are always active
- Morgan uses `combined` format in production, `dev` in development

## External Log Aggregation (Optional)

For production, pipe stdout to a log aggregator:

```bash
# PM2
pm2 start dist/server.js --log /var/log/campusway/app.log

# Docker
docker logs campusway-backend 2>&1 | tee /var/log/campusway.log

# Cloud (render.com, Railway, etc.)
# Logs are automatically captured by the platform
```
