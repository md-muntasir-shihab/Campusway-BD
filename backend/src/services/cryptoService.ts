import crypto from 'crypto';

/**
 * AES-256-GCM encryption/decryption for provider credentials.
 *
 * The encryption key is loaded from ENCRYPTION_KEY env var (must be a 64-char hex string
 * representing 32 bytes). If absent, it is derived deterministically from JWT_SECRET using
 * SHA-256 so the service still boots in development environments.
 *
 * Wire format: <iv_hex>:<authTag_hex>:<ciphertext_hex>  (all colon-separated hex strings)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_BYTES = 16;

function resolveKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;
    if (envKey && envKey.length === 64) {
        return Buffer.from(envKey, 'hex');
    }
    // Derive from JWT_SECRET as fallback (development only)
    const jwtSecret = process.env.JWT_SECRET ?? 'campusway-default-dev-secret';
    return crypto.createHash('sha256').update(jwtSecret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a colon-delimited hex string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
    const key = resolveKey();
    const iv = crypto.randomBytes(IV_BYTES);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypt a ciphertext string that was produced by `encrypt`.
 * Throws if the input is malformed or the auth tag does not verify.
 */
export function decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted payload format. Expected iv:authTag:ciphertext');
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = resolveKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encryptedData = Buffer.from(encryptedHex, 'hex');

    if (iv.length !== IV_BYTES) {
        throw new Error('Invalid IV length in encrypted payload');
    }
    if (authTag.length !== AUTH_TAG_BYTES) {
        throw new Error('Invalid auth tag length in encrypted payload');
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString('utf8');
}
