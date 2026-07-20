import { vi } from 'vitest';
import { randomUUID } from 'crypto';

class MockMongoMemoryServer {
    private dbName = `campusway_test_${randomUUID().replace(/-/g, '')}`;

    static async create() {
        return new MockMongoMemoryServer();
    }

    getUri() {
        const baseUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
        if (baseUri.endsWith('/') || !baseUri.includes('/', 10)) {
            return `${baseUri.replace(/\/$/, '')}/${this.dbName}`;
        }
        return baseUri;
    }

    async stop() {
        return true;
    }
}

vi.mock('mongodb-memory-server', () => {
    return {
        MongoMemoryServer: MockMongoMemoryServer,
    };
});
