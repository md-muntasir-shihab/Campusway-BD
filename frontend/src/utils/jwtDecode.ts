/**
 * JWT decoding utility for extracting payload information from JWT tokens
 * Used primarily for reading token expiry (exp) for proactive token refresh
 */

/**
 * Decode the payload from a JWT token
 * @param token - The JWT token string
 * @returns The decoded payload object with exp field, or null if token is malformed
 */
export function decodeJwtPayload(token: string): { exp?: number;[key: string]: any } | null {
    if (!token || typeof token !== 'string') {
        return null;
    }

    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }

    const payloadPart = parts[1];
    if (!payloadPart) {
        return null;
    }

    try {
        // Decode base64url to base64
        // Base64url uses - instead of + and _ instead of /, and omits padding =
        const base64 = payloadPart
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        // Add padding if needed
        const padded = base64 + '==='.slice((base64.length + 3) % 4);

        // Decode base64 to string
        const jsonString = atob(padded);

        // Parse JSON
        const payload = JSON.parse(jsonString);

        return payload;
    } catch (error) {
        // Handle malformed base64 or invalid JSON
        return null;
    }
}

/**
 * Check if a JWT token is expired
 * @param token - The JWT token string
 * @returns true if token is expired, false if valid, null if token is malformed or has no exp
 */
export function isJwtExpired(token: string): boolean | null {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
        return null;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp < nowInSeconds;
}

/**
 * Get the remaining time until a JWT token expires
 * @param token - The JWT token string
 * @returns Remaining time in milliseconds, or null if token is malformed or has no exp
 */
export function getJwtRemainingTime(token: string): number | null {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
        return null;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const remainingSeconds = payload.exp - nowInSeconds;

    // Return 0 if already expired, otherwise return remaining time in ms
    return Math.max(0, remainingSeconds * 1000);
}
