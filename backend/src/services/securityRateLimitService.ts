import SecurityRateLimitEvent, { SecurityRateLimitBucket } from '../models/SecurityRateLimitEvent';

export async function consumePersistentRateLimit(params: {
    bucket: SecurityRateLimitBucket;
    scopeKey: string;
    maxAllowed: number;
    windowMs: number;
    metadata?: Record<string, unknown>;
}): Promise<{ allowed: boolean; retryAfterMs: number; count: number }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Math.max(1_000, params.windowMs));
    const existing = await SecurityRateLimitEvent.findOne({
        bucket: params.bucket,
        scopeKey: params.scopeKey,
    });

    if (!existing || existing.windowExpiresAt.getTime() <= now.getTime()) {
        await SecurityRateLimitEvent.findOneAndUpdate(
            { bucket: params.bucket, scopeKey: params.scopeKey },
            {
                $set: {
                    count: 1,
                    maxAllowed: params.maxAllowed,
                    windowStartedAt: now,
                    windowExpiresAt: expiresAt,
                    lastSeenAt: now,
                    metadata: params.metadata || {},
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        return { allowed: true, retryAfterMs: params.windowMs, count: 1 };
    }

    if (existing.count >= params.maxAllowed) {
        return {
            allowed: false,
            retryAfterMs: Math.max(1_000, existing.windowExpiresAt.getTime() - now.getTime()),
            count: existing.count,
        };
    }

    existing.count += 1;
    existing.maxAllowed = params.maxAllowed;
    existing.lastSeenAt = now;
    existing.metadata = { ...(existing.metadata || {}), ...(params.metadata || {}) };
    await existing.save();

    return {
        allowed: true,
        retryAfterMs: Math.max(1_000, existing.windowExpiresAt.getTime() - now.getTime()),
        count: existing.count,
    };
}

export async function clearPersistentRateLimit(bucket: SecurityRateLimitBucket, scopeKey: string): Promise<void> {
    await SecurityRateLimitEvent.deleteOne({ bucket, scopeKey });
}
