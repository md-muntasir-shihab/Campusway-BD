import crypto from 'crypto';

/**
 * Constant-time string comparison for security tokens (verify tokens, etc.).
 *
 * Unlike `a === b`, this does NOT short-circuit on the first differing byte,
 * so it does not leak timing information that could help an attacker brute
 * force a secret token. Both inputs are compared as UTF-8 bytes.
 *
 * A missing/empty expected or provided token returns `false` (never `true`),
 * so callers must treat `false` as "reject".
 */
export function safeTokenEqual(provided: string | undefined | null, expected: string | undefined | null): boolean {
    const a = provided === undefined || provided === null ? '' : String(provided);
    const b = expected === undefined || expected === null ? '' : String(expected);

    const ab = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');

    // Different lengths can never match. Check first; `timingSafeEqual` throws
    // on unequal lengths and would otherwise be observable via an error.
    if (ab.length !== bb.length) return false;

    // Equal lengths: compare in constant time so the verification does not
    // leak the expected token byte-by-byte via timing.
    return crypto.timingSafeEqual(ab, bb);
}
