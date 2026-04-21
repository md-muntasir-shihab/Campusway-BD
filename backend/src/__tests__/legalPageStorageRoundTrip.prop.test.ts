import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import LegalPage from '../models/LegalPage';

/**
 * Feature: legal-pages-footer-founder, Property 1: Legal page storage round-trip
 *
 * Validates: Requirements 1.1, 1.2
 *
 * For any valid legal page data (with a valid slug, non-empty title, and arbitrary
 * htmlContent), storing the document and then retrieving it by slug SHALL return a
 * document with identical slug, title, htmlContent, metaTitle, and metaDescription values.
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

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Valid slug: lowercase alphanumeric segments separated by hyphens */
const validSlugArb = fc
    .array(
        fc.stringMatching(/^[a-z0-9]+$/).filter((s) => s.length >= 1 && s.length <= 20),
        { minLength: 1, maxLength: 4 },
    )
    .map((parts) => parts.join('-'));

/** Non-empty title */
const titleArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());

/** Arbitrary HTML content */
const htmlContentArb = fc.string({ minLength: 0, maxLength: 500 });

/** Arbitrary meta fields */
const metaTitleArb = fc.string({ minLength: 0, maxLength: 100 });
const metaDescriptionArb = fc.string({ minLength: 0, maxLength: 200 });

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: legal-pages-footer-founder, Property 1: Legal page storage round-trip', () => {
    it('storing a legal page and retrieving by slug returns identical field values', async () => {
        await fc.assert(
            fc.asyncProperty(
                validSlugArb,
                titleArb,
                htmlContentArb,
                metaTitleArb,
                metaDescriptionArb,
                async (slug, title, htmlContent, metaTitle, metaDescription) => {
                    // Clean up from previous iteration
                    await LegalPage.deleteMany({});

                    // Store the legal page
                    await LegalPage.create({
                        slug,
                        title,
                        htmlContent,
                        metaTitle,
                        metaDescription,
                    });

                    // Retrieve by slug
                    const retrieved = await LegalPage.findOne({ slug }).lean();

                    // Verify round-trip preserves all fields
                    expect(retrieved).not.toBeNull();
                    expect(retrieved!.slug).toBe(slug);
                    expect(retrieved!.title).toBe(title);
                    expect(retrieved!.htmlContent).toBe(htmlContent);
                    expect(retrieved!.metaTitle).toBe(metaTitle);
                    expect(retrieved!.metaDescription).toBe(metaDescription);
                },
            ),
            { numRuns: 100 },
        );
    });
});
