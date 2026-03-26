# CampusWay Monitoring Guide

## 1. Health Check

**Endpoint**: `GET /api/health`

**Response**:

```json
{
  "status": "OK",
  "timeUTC": "2026-03-03T12:00:00.000Z",
  "version": "1.0.0",
  "db": "connected"
}
```

Use this endpoint with any uptime service (UptimeRobot, Pingdom, Better Uptime, or a simple cron-based curl).

**Recommended check interval**: every 60 seconds.

## 2. Structured Logging

All logs include:

- `timestamp` — ISO 8601
- `level` — INFO, WARN, ERROR, DEBUG
- `requestId` — correlates to `X-Request-Id` response header
- **PII is masked** — emails and phone numbers are redacted

### Log Levels

| Level | Use |
| --- | --- |
| INFO | Normal operations (request handled, payment processed) |
| WARN | Non-critical issues (duplicate webhook, missing optional config) |
| ERROR | Failures (DB errors, unhandled exceptions, invalid signatures) |
| DEBUG | Verbose dev-only output (disabled in production) |

## 3. Request Tracing

Every API response includes an `X-Request-Id` header. When a user reports an issue:

1. Ask for the `X-Request-Id` (visible in browser DevTools → Network → Response Headers)
2. Search server logs for `[rid:<requestId>]`
3. Full request lifecycle is traceable

## 4. Error Tracking Integration (Recommended)

For production, integrate **Sentry** or **LogRocket**:

### Backend (Sentry)

```bash
npm install @sentry/node
```

```typescript
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
app.use(Sentry.Handlers.requestHandler());
// ... routes ...
app.use(Sentry.Handlers.errorHandler());
```

### Frontend (Sentry)

```bash
npm install @sentry/react
```

```typescript
import * as Sentry from '@sentry/react';
Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
```

## 5. Admin Log Viewer

Admin can view system logs at `/admin/settings/logs` (read-only).
This panel shows recent audit events from the `AuditLog` collection.
