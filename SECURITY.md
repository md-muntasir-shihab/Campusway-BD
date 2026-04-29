# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public issue
2. Contact the repository owner directly
3. Include: description, steps to reproduce, potential impact

We will respond within 48 hours.

## Security Measures

- JWT authentication with refresh token rotation
- CSRF double-submit cookie protection
- Rate limiting on all auth and API endpoints
- Input sanitization via express-mongo-sanitize
- Zod validation on all request bodies
- Helmet security headers
- IP allowlisting for admin panel
- Anti-cheat monitoring for exam sessions
- Audit logging for sensitive operations
