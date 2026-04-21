import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import LegalPage from '../models/LegalPage';
import { getPublicLegalPage } from '../controllers/legalPageController';

/**
 * Feature: legal-pages-footer-founder, Property 2: Non-existent slug returns 404
 *
 * Validates: Requirements 1.3
 *
 * For any slug string that does not correspond to a stored legal page document,
 * requesting that slug from the public API SHALL return a 404 status code with
 * a non-empty error message.
 */

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await LegalPage.deleteMany({});
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockReq(slug: string) {
    return { params: { slug } } as unknown as import('express').Request;
}

function createMockRes() {
    const res: any = {};
    res.statusCode = 200;
    res.body = null;
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.body = data;
        return res;
    };
    return res;
}

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Generate arbitrary slug-like strings (valid slug format) that won't exist in DB */
const nonExistentSlugArb = fc
    .array(
        fc.stringMatching(/^[a-z0-9]+$/).filter((s) => s.length >= 1 && s.length <= 20),
        { minLength: 1, maxLength: 4 },
    )
    .map((parts) => parts.join('-'));

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: legal-pages-footer-founder, Property 2: Non-existent slug returns 404', () => {
    it('requesting a non-existent slug returns 404 with a non-empty error message', async () => {
        await fc.assert(
            fc.asyncProperty(nonExistentSlugArb, async (slug) => {
                // Ensure the database is empty so no slug can match
                await LegalPage.deleteMany({});

                const req = createMockReq(slug);
                const res = createMockRes();

                await getPublicLegalPage(req, res);

                // Must return 404
                expect(res.statusCode).toBe(404);

                // Must return a non-empty error message
                expect(res.body).toBeDefined();
                expect(res.body.error).toBeDefined();
                expect(typeof res.body.error).toBe('string');
                expect(res.body.error.length).toBeGreaterThan(0);
            }),
            { numRuns: 100 },
        );
    });
});
