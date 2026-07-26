import { vi } from 'vitest';
import { randomUUID } from 'crypto';
import net from 'net';

// ─── Port probe ──────────────────────────────────────────────────────────────

/**
 * Returns true if 127.0.0.1:27017 is accepting TCP connections within 1 s.
 * Avoids hanging the entire test suite waiting for a 30 s Mongoose timeout.
 */
async function isLocalMongoAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        let settled = false;
        const done = (result: boolean) => {
            if (settled) return;
            settled = true;
            socket.destroy();
            resolve(result);
        };
        socket.setTimeout(1000);
        socket.once('connect', () => done(true));
        socket.once('error', () => done(false));
        socket.once('timeout', () => done(false));
        socket.connect(27017, '127.0.0.1');
    });
}

// ─── Mock MongoMemoryServer ───────────────────────────────────────────────────

/**
 * Replaces MongoMemoryServer with a lightweight mock that redirects tests
 * to a real MongoDB without downloading binaries.
 *
 * Resolution order:
 *   1. MONGODB_URI env var (Atlas or any remote)
 *   2. Local mongod on 127.0.0.1:27017 — each test gets an isolated database name
 *
 * When neither is available, create() resolves to a mock whose getUri()
 * returns an invalid URI.  The subsequent mongoose.connect() in the test's
 * own beforeAll will fail, and Vitest will report those tests as failed with
 * a clear "connection refused" message.  This preserves the original
 * behaviour (silent skip/fail) while still giving a meaningful error.
 */
class MockMongoMemoryServer {
    private uri: string;

    private constructor(uri: string) {
        this.uri = uri;
    }

    static async create(_options?: unknown): Promise<MockMongoMemoryServer> {
        // 1. Explicit Atlas / remote URI
        if (process.env.MONGODB_URI) {
            return new MockMongoMemoryServer(process.env.MONGODB_URI);
        }

        // 2. Local mongod (fast probe — avoids 30 s Mongoose timeout)
        const localUp = await isLocalMongoAvailable();
        if (localUp) {
            const dbName = `campusway_test_${randomUUID().replace(/-/g, '')}`;
            return new MockMongoMemoryServer(`mongodb://127.0.0.1:27017/${dbName}`);
        }

        // 3. No database available — return a stub URI with a fast timeout
        //    so the test's mongoose.connect() fails in ~2 s instead of 30 s.
        return new MockMongoMemoryServer('mongodb://127.0.0.1:27017/no_db_available?serverSelectionTimeoutMS=2000');
    }

    getUri(): string {
        return this.uri;
    }

    async stop(): Promise<boolean> {
        return true;
    }
}

vi.mock('mongodb-memory-server', () => {
    return {
        MongoMemoryServer: MockMongoMemoryServer,
    };
});
