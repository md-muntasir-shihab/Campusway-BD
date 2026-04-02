import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { markSecurityTokenConsumed, findValidSecurityToken, issueSecurityToken } from '../../src/services/securityTokenService';
import { buildTotpOtpAuthUrl, consumeBackupCode, generateBackupCodes, generateTotpSecret, verifyTotpCode } from '../../src/services/twoFactorService';
import { buildSecureUploadUrl, registerSecureUpload } from '../../src/services/secureUploadService';
import { needsTwoFactor } from '../../src/controllers/authController';
import { getSecurityConfig, invalidateSecurityConfigCache } from '../../src/services/securityConfigService';
import { getSecuritySettingsSnapshot, resetSecuritySettingsToDefault, updateSecuritySettingsSnapshot } from '../../src/services/securityCenterService';

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

    function generateTotpCodeAtCounter(secret: string, counter: number): string {
        const secretBuffer = base32Decode(secret);
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

    function generateCurrentTotpCode(secret: string): string {
        const counter = Math.floor(Date.now() / 1000 / 30);
        return generateTotpCodeAtCounter(secret, counter);
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
        expect(otpAuthUrl).toContain('issuer=CampusWay');
        expect(otpAuthUrl).toContain('algorithm=SHA1');
        expect(otpAuthUrl).toContain('digits=6');
        expect(otpAuthUrl).toContain('period=30');
        expect(decodeURIComponent(otpAuthUrl)).toContain('CampusWay:security-test@campusway.local');

        const code = generateCurrentTotpCode(secret);
        expect(code).toHaveLength(6);
        expect(verifyTotpCode(secret, code)).toBe(true);
        expect(verifyTotpCode(secret, '000000')).toBe(false);
    });

    test('normalizes secret format and accepts +-2 TOTP window by default', () => {
        const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
        try {
            const secret = generateTotpSecret();
            const counter = Math.floor(Date.now() / 1000 / 30);
            const normalizedVariant = `${secret.slice(0, 8)}-${secret.slice(8, 16)} ${secret.slice(16)}`.toLowerCase();

            const codeMinus2 = generateTotpCodeAtCounter(secret, counter - 2);
            const codePlus2 = generateTotpCodeAtCounter(secret, counter + 2);
            const codeMinus3 = generateTotpCodeAtCounter(secret, counter - 3);

            expect(verifyTotpCode(normalizedVariant, codeMinus2)).toBe(true);
            expect(verifyTotpCode(normalizedVariant, codePlus2)).toBe(true);
            expect(verifyTotpCode(normalizedVariant, codeMinus3)).toBe(false);
        } finally {
            nowSpy.mockRestore();
        }
    });

    test('consumes alphanumeric backup codes without digit stripping', () => {
        const backupCodes = generateBackupCodes(4);
        const targetCode = backupCodes.plainCodes[0];
        const lowerCaseVariant = targetCode.toLowerCase();

        const result = consumeBackupCode(backupCodes.hashedCodes, lowerCaseVariant);
        expect(result.ok).toBe(true);
        expect(result.nextCodes[0]?.usedAt).toBeTruthy();
    });

    test('enforces enabled 2FA even for superadmin users', () => {
        const user = {
            role: 'superadmin',
            twoFactorEnabled: true,
        } as any;
        const security = {
            testingAccessMode: false,
            enable2faAdmin: false,
            enable2faStudent: false,
        } as any;

        expect(needsTwoFactor(user, security)).toBe(true);
    });

    test('round-trips canonical security settings and enforces exact required roles', async () => {
        await resetSecuritySettingsToDefault('security-hardening-test');
        invalidateSecurityConfigCache();

        const updated = await updateSecuritySettingsSnapshot({
            passwordPolicies: {
                default: {
                    minLength: 14,
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumber: true,
                    requireSpecial: true,
                    denyCommonPasswords: true,
                    preventReuseCount: 7,
                    expiryDays: 45,
                    forceResetOnFirstLogin: false,
                },
                admin: {
                    minLength: 18,
                    requireUppercase: true,
                    requireLowercase: true,
                    requireNumber: true,
                    requireSpecial: true,
                    denyCommonPasswords: true,
                    preventReuseCount: 10,
                    expiryDays: 30,
                    forceResetOnFirstLogin: true,
                },
            },
            twoFactor: {
                requireForRoles: ['superadmin', 'chairman', 'student'],
                allowedMethods: ['authenticator', 'email'],
                defaultMethod: 'authenticator',
                otpExpiryMinutes: 7,
                maxAttempts: 4,
                stepUpForSensitiveActions: true,
            },
            verificationRecovery: {
                requireVerifiedEmailForAdmins: true,
                requireVerifiedEmailForStudents: false,
                emailVerificationExpiryHours: 12,
                passwordResetExpiryMinutes: 20,
            },
            twoPersonApproval: {
                enabled: true,
                approvalExpiryMinutes: 75,
                riskyActions: [
                    'students.export',
                    'providers.credentials_change',
                    'security.settings_change',
                    'backups.restore',
                ],
            },
            accessControl: {
                exportAllowedRoles: ['superadmin', 'finance_agent'],
                sensitiveActionReasonRequired: true,
            },
        }, 'security-hardening-test');

        expect(updated.passwordPolicies.default.minLength).toBe(14);
        expect(updated.passwordPolicies.admin.minLength).toBe(18);
        expect(updated.twoFactor.requireForRoles).toEqual(expect.arrayContaining(['superadmin', 'chairman', 'student']));
        expect(updated.twoFactor.allowedMethods).toEqual(['authenticator', 'email']);
        expect(updated.twoFactor.defaultMethod).toBe('authenticator');
        expect(updated.twoFactor.otpExpiryMinutes).toBe(7);
        expect(updated.twoFactor.maxAttempts).toBe(4);
        expect(updated.verificationRecovery.emailVerificationExpiryHours).toBe(12);
        expect(updated.verificationRecovery.passwordResetExpiryMinutes).toBe(20);
        expect(updated.twoPersonApproval.riskyActions).toEqual(expect.arrayContaining([
            'students.export',
            'providers.credentials_change',
            'security.settings_change',
            'backups.restore',
        ]));
        expect(updated.accessControl.exportAllowedRoles).toEqual(['superadmin', 'finance_agent']);
        expect(updated.exportSecurity.allowedRoles).toEqual(expect.arrayContaining(['superadmin', 'finance_agent']));
        expect(updated.exportSecurity.requireReason).toBe(true);
        expect(updated.backupRestore.requireRestoreApproval).toBe(true);

        const snapshot = await getSecuritySettingsSnapshot(true);
        expect(snapshot.passwordPolicies.default.preventReuseCount).toBe(7);
        expect(snapshot.twoPersonApproval.enabled).toBe(true);

        invalidateSecurityConfigCache();
        const config = await getSecurityConfig(true);
        expect(config.requiredTwoFactorRoles).toEqual(expect.arrayContaining(['superadmin', 'chairman', 'student']));
        expect(config.allowedTwoFactorMethods).toEqual(['authenticator', 'email']);
        expect(config.default2faMethod).toBe('authenticator');
        expect(config.otpExpiryMinutes).toBe(7);
        expect(config.maxOtpAttempts).toBe(4);

        expect(needsTwoFactor({ role: 'chairman', twoFactorEnabled: false } as any, config)).toBe(true);
        expect(needsTwoFactor({ role: 'student', twoFactorEnabled: false } as any, config)).toBe(true);
        expect(needsTwoFactor({ role: 'viewer', twoFactorEnabled: false } as any, config)).toBe(false);

        await resetSecuritySettingsToDefault('security-hardening-test');
        invalidateSecurityConfigCache();
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
