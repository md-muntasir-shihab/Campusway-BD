/**
 * MongoDB Memory Server test setup helper.
 *
 * Provides connect / disconnect / cleanup utilities for backend integration tests.
 * Usage:
 *   import { setupTestDb, teardownTestDb, clearTestDb } from './helpers/mongoTestSetup';
 *
 *   beforeAll(() => setupTestDb());
 *   afterEach(() => clearTestDb());
 *   afterAll(() => teardownTestDb());
 *
 * Requirements: 14.3
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

/**
 * Start an in-memory MongoDB instance and connect Mongoose.
 * Safe to call multiple times — reuses existing server if already running.
 */
export async function setupTestDb(): Promise<void> {
    if (!mongoServer) {
        mongoServer = await MongoMemoryServer.create();
    }
    const uri = mongoServer.getUri();

    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }

    await mongoose.connect(uri);
}

/**
 * Drop all collections in the test database.
 * Call in afterEach to isolate tests.
 */
export async function clearTestDb(): Promise<void> {
    if (!mongoose.connection.db) return;
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
}

/**
 * Disconnect Mongoose and stop the in-memory server.
 * Call in afterAll.
 */
export async function teardownTestDb(): Promise<void> {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
        mongoServer = null;
    }
}

/**
 * Get the URI of the running in-memory MongoDB instance.
 */
export function getTestDbUri(): string {
    if (!mongoServer) throw new Error('Test DB not started. Call setupTestDb() first.');
    return mongoServer.getUri();
}
