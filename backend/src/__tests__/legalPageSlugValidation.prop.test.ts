import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import LegalPage from '../models/LegalPage';
import { createLegalPage } from '../controllers/legalPageController';

/**
 * Feature: legal-pages-footer-founder, Property 3: Slug validation accepts only valid patterns
 *
 * Validates: Requirements 2.6
 *
 * For any string, the slug validation function SHALL accept it if and only if it
 * matches the pattern `^[a-z0-9]+(?:-[a-z0-9]+)*$` (lowercase alphanumeric characters
 * and hyphens, not starting or ending with a hyphen). All other strings SHALL be rejected.
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

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function createMockReq(body: Record<string, unknown>) {
    return { body, user: { _id: new mongoose.Types.ObjectId() } } as unknown as import('../middlewares/auth').AuthRequest;
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

/** Valid slug: lowercase alphanumeric segments separated by single hyphens */
const validSlugArb = fc
    .array(
        fc.stringMatching(/^[a-z0-9]+$/).filter((s) => s.length >= 1 && s.length <= 10),
        { minLength: 1, maxLength: 4 },
    )
    .map((parts) => parts.join('-'));

/** Invalid slug: strings that do NOT match the slug pattern */
const invalidSlugArb = fc
    .oneof(
        // Starts with a hyphen
        fc.string({ minLength: 1, maxLength: 20 }).map((s) => '-' + s.replace(/[^a-z0-9-]/g, 'a')),
        // Ends with a hyphen
        fc.string({ minLength: 1, maxLength: 20 }).map((s) => s.replace(/[^a-z0-9-]/g, 'a') + '-'),
        // Contains uppercase letters
        fc.stringMatching(/^[a-z0-9]+$/).filter((s) => s.length >= 1).map((s) => s + 'A' + s),
        // Contains consecutive hyphens
        fc.stringMatching(/^[a-z0-9]+$/).filter((s) => s.length >= 1).map((s) => s + '--' + s),
        // Contains spaces
        fc.string({ minLength: 1, maxLength: 10 }).map((s) => 'valid ' + s.replace(/[^a-z0-9]/g, 'a')),
        // Contains special characters
        fc.stringMatching(/^[a-z0-9]+$/).filter((s) => s.length >= 1).map((s) => s + '@' + s),
        // Empty string
        fc.constant(''),
    )
    .filter((s) => !SLUG_REGEX.test(s));

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: legal-pages-footer-founder, Property 3: Slug validation accepts only valid patterns', () => {
    it('valid slugs matching the pattern are accepted by the controller', async () => {
        await fc.assert(
            fc.asyncProperty(validSlugArb, async (slug) => {
                // Clean up to avoid duplicate slug conflicts
                await LegalPage.deleteMany({});

                const req = createMockReq({ slug, title: 'Test Page' });
                const res = createMockRes();

                await createLegalPage(req, res);

                // Valid slug should result in 201 (created)
                expect(res.statusCode).toBe(201);
                expect(res.body.page).toBeDefined();
                expect(res.body.page.slug).toBe(slug);
            }),
            { numRuns: 100 },
        );
    });

    it('invalid slugs not matching the pattern are rejected by the controller', async () => {
        await fc.assert(
            fc.asyncProperty(invalidSlugArb, async (slug) => {
                const req = createMockReq({ slug, title: 'Test Page' });
                const res = createMockRes();

                await createLegalPage(req, res);

                // Invalid slug should result in 400
                expect(res.statusCode).toBe(400);
                expect(res.body).toBeDefined();
                expect(res.body.error).toBeDefined();
                expect(typeof res.body.error).toBe('string');
                expect(res.body.error.length).toBeGreaterThan(0);
            }),
            { numRuns: 100 },
        );
    });
});
