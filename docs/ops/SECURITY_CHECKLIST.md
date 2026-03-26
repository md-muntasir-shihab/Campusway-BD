# CampusWay Security Checklist

## 1. Transport & Headers

| Control | Status | Location |
| --- | --- | --- |
| HSTS (1 year, includeSubDomains, preload) | ✅ | `server.ts` Helmet config |
| X-Frame-Options: DENY | ✅ | `server.ts` Helmet frameguard |
| X-Content-Type-Options: nosniff | ✅ | Helmet default |
| X-XSS-Protection | ✅ | Helmet xssFilter |
| Referrer-Policy: strict-origin-when-cross-origin | ✅ | `server.ts` Helmet referrerPolicy |
| Content-Security-Policy (production) | ✅ | `server.ts` Helmet CSP directives |

## 2. CORS

| Control | Status | Location |
| --- | --- | --- |
| Strict CORS from FRONTEND_URL + ADMIN_ORIGIN | ✅ | `server.ts` |
| Loopback allowed only in dev | ✅ | `isLoopbackOrigin()` |
| No wildcard (`*`) in production | ✅ | parseCorsOrigins logic |

## 3. Authentication & Sessions

| Control | Status | Location |
| --- | --- | --- |
| JWT Bearer token auth (no cookie auth) | ✅ | `auth.ts` extractToken |
| Session tracking (ActiveSession model) | ✅ | `auth.ts` authenticate |
| Idle timeout enforcement | ✅ | `auth.ts` idleTimeoutMinutes |
| Token hash for session binding | ✅ | `auth.ts` hashToken |
| Role-based route protection | ✅ | `auth.ts` requireRole / requireAdmin |

## 4. Input Sanitization

| Control | Status | Location |
| --- | --- | --- |
| NoSQL injection prevention (mongo-sanitize) | ✅ | `server.ts` |
| Prototype pollution block | ✅ | `requestSanitizer.ts` BLOCKED_KEYS |
| `$` / `.` key stripping | ✅ | `requestSanitizer.ts` |
| HTML sanitization (sanitize-html) | ✅ | `requestSanitizer.ts` |

## 5. Rate Limiting

| Endpoint | Limit | Location |
| --- | --- | --- |
| Global API | 500/15min (prod) | `server.ts` apiLimiter |
| Auth login | 20/15min (prod) | `server.ts` authLimiter |
| Admin routes | Dynamic from SecuritySettings | `securityRateLimit.ts` adminRateLimiter |
| Uploads | Dynamic | `securityRateLimit.ts` uploadRateLimiter |
| Exam submit | Dynamic | `securityRateLimit.ts` examSubmitRateLimiter |
| Contact form | 5/hour per IP | `securityRateLimit.ts` contactRateLimiter |

## 6. Payment Webhook Security

| Control | Status | Location |
| --- | --- | --- |
| HMAC-SHA256 signature validation | ✅ | `webhookRoutes.ts` verifySSLCommerzSignature |
| Replay attack protection (idempotency) | ✅ | `webhookRoutes.ts` PaymentWebhookEvent check |
| Audit logging every event | ✅ | `webhookRoutes.ts` PaymentWebhookEvent.create |

## 7. Request Tracing

| Control | Status | Location |
| --- | --- | --- |
| X-Request-Id on all requests | ✅ | `requestId.ts` middleware |
| PII masking in logs | ✅ | `logger.ts` maskPII |
| Structured error responses with requestId | ✅ | `server.ts` error handler |

## 8. Frontend Security

| Control | Status | Location |
| --- | --- | --- |
| Only VITE_ prefixed env vars exposed | ✅ | Vite default behavior |
| API base URL via VITE_API_PROXY_TARGET | ✅ | `vite.config.ts` |
| Admin routes require auth (ProtectedRoute) | ✅ | Frontend router guards |
