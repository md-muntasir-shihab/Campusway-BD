import crypto from 'crypto';
import mongoose from 'mongoose';
import SecurityToken, { ISecurityToken, SecurityTokenPurpose } from '../models/SecurityToken';

export function generateRawSecurityToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

export function hashSecurityToken(rawToken: string): string {
    return crypto.createHash('sha256').update(String(rawToken || '')).digest('hex');
}

export async function issueSecurityToken(params: {
    userId: string | mongoose.Types.ObjectId;
    purpose: SecurityTokenPurpose;
    expiresAt: Date;
    channel?: string | null;
    meta?: Record<string, unknown>;
    maxAttempts?: number;
    createdBy?: string | mongoose.Types.ObjectId | null;
    replaceExisting?: boolean;
}): Promise<{ rawToken: string; tokenDoc: ISecurityToken }> {
    const userId = typeof params.userId === 'string' ? new mongoose.Types.ObjectId(params.userId) : params.userId;
    if (params.replaceExisting) {
        await SecurityToken.updateMany(
            {
                userId,
                purpose: params.purpose,
                consumedAt: null,
                invalidatedAt: null,
            },
            { $set: { invalidatedAt: new Date() } },
        );
    }

    const rawToken = generateRawSecurityToken();
    const tokenDoc = await SecurityToken.create({
        userId,
        purpose: params.purpose,
        tokenHash: hashSecurityToken(rawToken),
        tokenHint: rawToken.slice(0, 6),
        channel: params.channel || null,
        meta: params.meta || {},
        maxAttempts: params.maxAttempts || 10,
        expiresAt: params.expiresAt,
        createdBy: params.createdBy && mongoose.Types.ObjectId.isValid(String(params.createdBy))
            ? new mongoose.Types.ObjectId(String(params.createdBy))
            : null,
    });

    return { rawToken, tokenDoc };
}

export async function findValidSecurityToken(rawToken: string, purpose: SecurityTokenPurpose): Promise<ISecurityToken | null> {
    const tokenDoc = await SecurityToken.findOne({
        tokenHash: hashSecurityToken(rawToken),
        purpose,
        consumedAt: null,
        invalidatedAt: null,
    });
    if (!tokenDoc) return null;
    if (tokenDoc.expiresAt.getTime() <= Date.now()) return null;
    return tokenDoc;
}

export async function markSecurityTokenConsumed(tokenDoc: ISecurityToken): Promise<void> {
    tokenDoc.consumedAt = new Date();
    await tokenDoc.save();
}

export async function incrementSecurityTokenAttempts(tokenDoc: ISecurityToken): Promise<ISecurityToken> {
    tokenDoc.attempts += 1;
    await tokenDoc.save();
    return tokenDoc;
}

export async function invalidateSecurityTokens(params: {
    userId?: string | mongoose.Types.ObjectId;
    purpose?: SecurityTokenPurpose;
    tokenId?: string | mongoose.Types.ObjectId;
}): Promise<void> {
    const filter: Record<string, unknown> = {
        consumedAt: null,
        invalidatedAt: null,
    };
    if (params.userId) {
        filter.userId = typeof params.userId === 'string' ? new mongoose.Types.ObjectId(params.userId) : params.userId;
    }
    if (params.purpose) filter.purpose = params.purpose;
    if (params.tokenId) {
        filter._id = typeof params.tokenId === 'string' ? new mongoose.Types.ObjectId(params.tokenId) : params.tokenId;
    }
    await SecurityToken.updateMany(filter, { $set: { invalidatedAt: new Date() } });
}
