🎯 **What:**
Removed the hardcoded fallback refresh secret ('fallback-refresh-secret-for-production-please-change-immediately-cw') from `backend/src/controllers/authController.ts` and `backend/src/controllers/secureUploadController.ts`.

⚠️ **Risk:**
If an attacker discovers or guesses the hardcoded refresh secret, they can forge valid refresh tokens. Since refresh tokens are used to issue new short-lived access tokens, an attacker can create an access token for ANY user, including super admins. This would effectively grant them full administrative control over the application, resulting in a total system compromise.

🛡️ **Solution:**
Replaced the hardcoded fallback with a strict failure mechanism:
`const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET || (() => { throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is required'); })();`

If the environment variable (`JWT_REFRESH_SECRET` or `REFRESH_SECRET`) is not provided at runtime, the application will throw a fatal error during startup rather than falling back to an insecure, hardcoded state.
