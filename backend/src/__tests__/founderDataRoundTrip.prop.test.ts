import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import FounderProfile from '../models/FounderProfile';
import { upsertFounder, getPublicFounder } from '../controllers/founderController';

/**
 * Feature: legal-pages-footer-founder, Property 6: Founder data round-trip
 *
 * Validates: Requirements 6.1, 6.3, 6.4
 *
 * For any valid founder profile data (with non-empty name, arbitrary skills array,
 * education array, and experience array), storing via PUT and then retrieving via
 * public GET SHALL return a document with identical name, tagline, role, aboutText,
 * location, contactDetails, skills, education, and experience values.
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
    await FounderProfile.deleteMany({});
});

// ─── Mock Request/Response Helpers ───────────────────────────────────────────

function mockReq(body: Record<string, unknown> = {}) {
    return { body, user: { _id: new mongoose.Types.ObjectId() } } as any;
}

function mockRes() {
    const res: any = {};
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (data: unknown) => { res.data = data; return res; };
    return res;
}

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Non-empty name */
const nameArb = fc
    .string({ minLength: 1, maxLength: 80 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());

/** Arbitrary string fields */
const strArb = fc.string({ minLength: 0, maxLength: 100 });

/** Arbitrary phone numbers */
const phoneArb = fc.string({ minLength: 1, maxLength: 20 });

/** Arbitrary skills array */
const skillsArb = fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 8 });

/** Arbitrary education entry */
const educationEntryArb = fc.record({
    institution: fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim().length > 0),
    degree: strArb,
    field: strArb,
    startYear: fc.integer({ min: 1950, max: 2030 }),
    endYear: fc.option(fc.integer({ min: 1950, max: 2030 }), { nil: undefined }),
    description: fc.option(strArb, { nil: undefined }),
});

/** Arbitrary education array */
const educationArb = fc.array(educationEntryArb, { minLength: 0, maxLength: 5 });

/** Arbitrary experience entry */
const experienceEntryArb = fc.record({
    company: fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim().length > 0),
    role: strArb,
    startYear: fc.integer({ min: 1950, max: 2030 }),
    endYear: fc.option(fc.integer({ min: 1950, max: 2030 }), { nil: undefined }),
    description: fc.option(strArb, { nil: undefined }),
    current: fc.option(fc.boolean(), { nil: undefined }),
});

/** Arbitrary experience array */
const experienceArb = fc.array(experienceEntryArb, { minLength: 0, maxLength: 5 });

/** Arbitrary contact details */
const contactDetailsArb = fc.record({
    phones: fc.array(phoneArb, { minLength: 0, maxLength: 3 }),
    email: strArb,
    website: strArb,
});

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: legal-pages-footer-founder, Property 6: Founder data round-trip', () => {
    it('storing founder data via upsertFounder and retrieving via getPublicFounder returns identical values', async () => {
        await fc.assert(
            fc.asyncProperty(
                nameArb,
                strArb, // tagline
                strArb, // role
                strArb, // aboutText
                strArb, // location
                contactDetailsArb,
                skillsArb,
                educationArb,
                experienceArb,
                async (name, tagline, role, aboutText, location, contactDetails, skills, education, experience) => {
                    // Clean up from previous iteration
                    await FounderProfile.deleteMany({});

                    // Store via upsertFounder controller
                    const req = mockReq({
                        name,
                        tagline,
                        role,
                        aboutText,
                        location,
                        contactDetails,
                        skills,
                        education,
                        experience,
                    });
                    const putRes = mockRes();
                    await upsertFounder(req, putRes);

                    expect(putRes.statusCode).not.toBe(400);
                    expect(putRes.statusCode).not.toBe(500);

                    // Retrieve via getPublicFounder controller
                    const getReq = mockReq();
                    const getRes = mockRes();
                    await getPublicFounder(getReq, getRes);

                    expect(getRes.statusCode).not.toBe(404);
                    expect(getRes.statusCode).not.toBe(500);

                    const retrieved = getRes.data;

                    // Verify round-trip preserves all specified fields
                    expect(retrieved.name).toBe(name);
                    expect(retrieved.tagline).toBe(tagline);
                    expect(retrieved.role).toBe(role);
                    expect(retrieved.aboutText).toBe(aboutText);
                    expect(retrieved.location).toBe(location);

                    // Contact details
                    expect(retrieved.contactDetails.phones).toEqual(contactDetails.phones);
                    expect(retrieved.contactDetails.email).toBe(contactDetails.email);
                    expect(retrieved.contactDetails.website).toBe(contactDetails.website);

                    // Arrays
                    expect(retrieved.skills).toEqual(skills);

                    // Education - compare relevant fields
                    expect(retrieved.education.length).toBe(education.length);
                    for (let i = 0; i < education.length; i++) {
                        expect(retrieved.education[i].institution).toBe(education[i].institution);
                        expect(retrieved.education[i].degree).toBe(education[i].degree);
                        expect(retrieved.education[i].field).toBe(education[i].field);
                        expect(retrieved.education[i].startYear).toBe(education[i].startYear);
                        if (education[i].endYear !== undefined) {
                            expect(retrieved.education[i].endYear).toBe(education[i].endYear);
                        }
                        if (education[i].description !== undefined) {
                            expect(retrieved.education[i].description).toBe(education[i].description);
                        }
                    }

                    // Experience - compare relevant fields
                    expect(retrieved.experience.length).toBe(experience.length);
                    for (let i = 0; i < experience.length; i++) {
                        expect(retrieved.experience[i].company).toBe(experience[i].company);
                        expect(retrieved.experience[i].role).toBe(experience[i].role);
                        expect(retrieved.experience[i].startYear).toBe(experience[i].startYear);
                        if (experience[i].endYear !== undefined) {
                            expect(retrieved.experience[i].endYear).toBe(experience[i].endYear);
                        }
                        if (experience[i].description !== undefined) {
                            expect(retrieved.experience[i].description).toBe(experience[i].description);
                        }
                        if (experience[i].current !== undefined) {
                            expect(retrieved.experience[i].current).toBe(experience[i].current);
                        }
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
