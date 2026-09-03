import mongoose from 'mongoose';
import { getRuntimeSettingsSnapshot } from './runtimeSettingsService';

/**
 * withOptionalTransaction — opt-in MongoDB transaction helper (audit step 2).
 *
 * WHY: MongoDB transactions only work on a replica set / Atlas (or with a
 * sharded cluster). On a standalone mongod, `session.startTransaction()` throws
 * "Transaction numbers are only allowed on a replica set member". Many
 * deployments of this project run standalone, so we must NEVER assume
 * transactions are available.
 *
 * BEHAVIOUR:
 *  - If `force` is true AND the server supports transactions, runs inside a
 *    real `withTransaction` (retried, committed on success).
 *  - Otherwise, runs the callback WITHOUT a transaction (same code path, no
 *    atomicity). This keeps standalone deployments working.
 *  - A runtime feature flag (`dbTransactionsEnabled`, default false) gates the
 *    opt-in; pass `force: true` from code paths that have verified a replica
 *    set is in use and want strong atomicity.
 *
 * The callback receives the active mongoose session (or `null` when running
 * outside a transaction) and MUST pass it to every model operation so those
 * operations participate in the transaction when one is active.
 */

export interface WithTxnOptions {
    /** Logical name for logs/metrics (e.g. 'exam.submit'). */
    name?: string;
    /** Ignore the feature flag and try a real transaction regardless. */
    force?: boolean;
    /** Override the runtime feature flag (mainly for tests). */
    enabled?: boolean;
}

export async function withOptionalTransaction<T>(
    fn: (session: mongoose.ClientSession | null) => Promise<T>,
    options: WithTxnOptions = {},
): Promise<T> {
    const flagEnabled = options.enabled ?? (await getDbTransactionsEnabled());
    const wantTransaction = Boolean(options.force) || flagEnabled;

    // Even when "wanted", only proceed if the connected server actually supports
    // transactions. On standalone mongod `supportsTransaction` is false and
    // startTransaction() would throw, so we fall back to no-transaction.
    if (!wantTransaction || !supportsTransactions()) {
        if (wantTransaction && !supportsTransactions()) {
            console.warn(
                `[txn] '${options.name ?? 'unnamed'}' requested a transaction but the ` +
                `database does not support transactions (standalone mongod?). Running without one.`,
            );
        }
        return fn(null);
    }

    const session = await mongoose.startSession();
    try {
        // withTransaction handles start/commit/abort + retry-on-transient errors.
        return await session.withTransaction(async () => fn(session));
    } finally {
        await session.endSession().catch(() => undefined);
    }
}

let cachedSupport: boolean | null = null;

/** True when connected to a replica set / Atlas that supports transactions. */
export function supportsTransactions(): boolean {
    if (cachedSupport !== null) return cachedSupport;
    const connection = mongoose.connection as any;
    const topology = connection?.client?.topology;
    const topologyType = topology?.description?.type ?? topology?.constructor?.name ?? '';
    const isReplicaSet =
        typeof topologyType === 'string' &&
        (topologyType.includes('ReplicaSet') || topologyType.includes('Mongos') || topologyType === 'sharded');
    // A connected mongoose always has a `client`; readyState can be misleading in
    // some test/edge environments, so we treat a present client + replica topology
    // as transaction-capable.
    const connected = Boolean(connection?.client);
    cachedSupport = Boolean(isReplicaSet && connected);
    return cachedSupport;
}

/** Cache-busting helper for tests / reconnects. */
export function resetTransactionSupportCache(): void {
    cachedSupport = null;
}

async function getDbTransactionsEnabled(): Promise<boolean> {
    try {
        const snapshot = await getRuntimeSettingsSnapshot(false);
        return Boolean((snapshot?.featureFlags as unknown as Record<string, unknown> | undefined)?.dbTransactionsEnabled);
    } catch {
        return false;
    }
}
