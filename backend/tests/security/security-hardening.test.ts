import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { markSecurityTokenConsumed, findValidSecurityToken, issueSecurityToken } from '../../src/services/securityTokenService';
import { buildTotpOtpAuthUrl, generateTotpSecret, verifyTotpCode } from '../../src/services/twoFactorService';
import { buildSecureUploadUrl, registerSecureUpload } from '../../src/services/secureUploadService';

describe('security hardening primitives', () => {
    function base32Decode(input: string): Buffer {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const sanitized = String(input || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
        let bits = 0;
        let value = 0;
        const bytes: number[] = [];
        for (const char of sanitized) {
            const index = alphabet.indexOf(char);
            if (index === -1) continue;
            value = (value << 5) | index;
            bits += 5;
            if (bits >= 8) {
                bytes.push((value >>> (bits - 8)) & 0xff);
                bits -= 8;
            }
        }
        return Buffer.from(bytes);
    }

    function generateCurrentTotpCode(secret: string): string {
        const secretBuffer = base32Decode(secret);
        const counter = Math.floor(Date.now() / 1000 / 30);
        const counterBuffer = Buffer.alloc(8);
        counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
        counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);
        const hmac = crypto.createHmac('sha1', secretBuffer).update(counterBuffer).digest();
        const offset = hmac[hmac.length - 1] & 0x0f;
        const binary = ((hmac[offset] & 0x7f) << 24)
            | ((hmac[offset + 1] & 0xff) << 16)
            | ((hmac[offset + 2] & 0xff) << 8)
            | (hmac[offset + 3] & 0xff);
        return String(binary % 1_000_000).padStart(6, '0');
    }

    test('issues and resolves hashed security tokens', async () => {
        const userId = '507f1f77bcf86cd799439011';
        const expiresAt = new Date(Date.now() + 60_000);
        const { rawToken } = await issueSecurityToken({
            userId,
            purpose: 'password_reset',
            expiresAt,
            channel: 'email',
            replaceExisting: true,
        });

        const tokenDoc = await findValidSecurityToken(rawToken, 'password_reset');
        expect(tokenDoc).toBeTruthy();
        expect(String(tokenDoc?.userId)).toBe(userId);
        expect(tokenDoc?.tokenHash).not.toBe(rawToken);

        if (!tokenDoc) {
            throw new Error('Expected token to exist');
        }

        await markSecurityTokenConsumed(tokenDoc);
        const consumed = await findValidSecurityToken(rawToken, 'password_reset');
        expect(consumed).toBeNull();
    });

    test('generates a valid totp secret and verifies codes', () => {
        const secret = generateTotpSecret();
        expect(secret).toMatch(/^[A-Z2-7]+$/);

        const otpAuthUrl = buildTotpOtpAuthUrl({
            secret,
            accountName: 'security-test@campusway.local',
        });
        expect(otpAuthUrl).toContain('otpauth://totp/');
        expect(otpAuthUrl).toContain('CampusWay');

        const code = generateCurrentTotpCode(secret);
        expect(code).toHaveLength(6);
        expect(verifyTotpCode(secret, code)).toBe(true);
        expect(verifyTotpCode(secret, '000000')).toBe(false);
    });

    test('registers secure upload metadata for protected files', async () => {
        const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'campusway-secure-upload-'));
        const filePath = path.join(tmpDir, 'proof.pdf');
        await fs.promises.writeFile(filePath, 'secure-proof');

        const upload = await registerSecureUpload({
            file: {
                fieldname: 'file',
                originalname: 'proof.pdf',
                encoding: '7bit',
                mimetype: 'application/pdf',
                destination: tmpDir,
                filename: 'stored-proof.pdf',
                path: filePath,
                size: 12,
                stream: fs.createReadStream(filePath),
                buffer: Buffer.from('secure-proof'),
            },
            category: 'payment_proof',
            visibility: 'protected',
            ownerUserId: '507f1f77bcf86cd799439011',
            ownerRole: 'student',
            uploadedBy: '507f1f77bcf86cd799439011',
            accessRoles: ['student', 'finance_agent'],
        });

        expect(upload.storedName).toBe('stored-proof.pdf');
        expect(upload.visibility).toBe('protected');
        expect(upload.fileHash).toMatch(/^[a-f0-9]{64}$/);
        expect(buildSecureUploadUrl(upload.storedName)).toBe('/uploads/stored-proof.pdf');

        await fs.promises.rm(tmpDir, { recursive: true, force: true });
    });
});
