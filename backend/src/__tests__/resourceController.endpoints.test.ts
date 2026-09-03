/**
 * Behavioural unit tests for resourceController without a real database.
 * Mongoose model calls are mocked; controllers run for real so filters,
 * sorting, stats aggregation, slug fallback and tracking guards are verified.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

const resourceFind = vi.fn();
const resourceCountDocuments = vi.fn();
const resourceDistinct = vi.fn();
const resourceAggregate = vi.fn();
const resourceFindOne = vi.fn();
const resourceFindByIdAndUpdate = vi.fn();
const settingsFindOne = vi.fn();

vi.mock('../models/Resource', () => ({
    default: {
        find: (...args: unknown[]) => resourceFind(...(args as [])),
        countDocuments: (...args: unknown[]) => resourceCountDocuments(...(args as [])),
        distinct: (...args: unknown[]) => resourceDistinct(...(args as [])),
        aggregate: (...args: unknown[]) => resourceAggregate(...(args as [])),
        findOne: (...args: unknown[]) => resourceFindOne(...(args as [])),
        findByIdAndUpdate: (...args: unknown[]) => resourceFindByIdAndUpdate(...(args as [])),
    },
}));

vi.mock('../models/ResourceSettings', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../models/ResourceSettings')>();
    return {
        ...actual,
        default: {
            findOne: (...args: unknown[]) => settingsFindOne(...(args as [])),
        },
    };
});

import type { Request, Response } from 'express';
import {
    getPublicResources,
    getPublicResourceBySlug,
    incrementResourceView,
    incrementResourceDownload,
    getPublicResourceSettings,
} from '../controllers/resourceController';

function chain(rows: unknown[]) {
    const c: Record<string, unknown> = {};
    c.sort = vi.fn(() => c);
    c.skip = vi.fn(() => c);
    c.limit = vi.fn(() => c);
    c.lean = vi.fn(async () => rows);
    return c;
}

function buildRes() {
    const resMock: Record<string, unknown> = {};
    resMock.status = vi.fn(() => resMock);
    resMock.json = vi.fn((body: unknown) => body);
    return resMock as unknown as Response & { status: Mock; json: Mock };
}

/** findOne-style chain: resolves to the doc itself (or null) instead of an array. */
function chainOne(doc: unknown) {
    return { lean: vi.fn(async () => doc) };
}

function makeReq(over: { query?: Record<string, unknown>; params?: Record<string, unknown> } = {}) {
    return { query: over.query || {}, params: over.params || {} } as unknown as Request;
}

const now = new Date('2026-01-15T00:00:00Z');

const row = (over: Record<string, unknown>) => ({
    _id: new (require('mongoose').Types.ObjectId)(),
    title: 'Physics 1st Paper',
    description: 'Board question bank',
    type: 'pdf',
    category: 'Question Banks',
    tags: ['physics'],
    slug: 'physics-1st-paper',
    isPublic: true,
    isFeatured: false,
    views: 5,
    downloads: 2,
    publishDate: now,
    ...over,
});

const trackingOn = { lean: vi.fn(async () => ({ trackingEnabled: true })) };
const trackingOff = { lean: vi.fn(async () => ({ trackingEnabled: false })) };

beforeEach(() => {
    vi.clearAllMocks();
    settingsFindOne.mockReturnValue(trackingOn);
});

describe('getPublicResources', () => {
    it('returns the full public payload with stats, categories and pagination', async () => {
        const rows = [row({}), row({ type: 'video', isFeatured: true, title: 'Algebra video' })];
        resourceFind.mockReturnValue(chain(rows));
        resourceCountDocuments.mockResolvedValue(11);
        resourceDistinct.mockResolvedValue(['Question Banks', 'Study Materials']);
        resourceAggregate.mockResolvedValue([
            { _id: { type: 'pdf', featured: false }, count: 7 },
            { _id: { type: 'video', featured: true }, count: 4 },
        ]);

        const res = buildRes();
        await getPublicResources(makeReq({ query: { page: '2', limit: '10' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0] as { success: boolean; data: Record<string, unknown> };
        expect(body.success).toBe(true);
        expect(body.data.resources).toHaveLength(2);
        expect(body.data.total).toBe(11);
        expect(body.data.page).toBe(2);
        expect(body.data.pages).toBe(2);
        expect(body.data.categories).toEqual(['Question Banks', 'Study Materials']);
        expect(body.data.stats).toEqual({ total: 11, pdfs: 7, videos: 4, featured: 4 });
        // every resource row gets a public slug
        expect((body.data.resources as { slug: string }[]).every((r) => r.slug && String(r.slug).length > 0)).toBe(true);
    });

    it('always filters to public, non-expired resources', async () => {
        resourceFind.mockReturnValue(chain([]));
        resourceCountDocuments.mockResolvedValue(0);
        resourceDistinct.mockResolvedValue([]);
        resourceAggregate.mockResolvedValue([]);

        const res = buildRes();
        await getPublicResources(makeReq(), res);

        const filter = resourceFind.mock.calls[0][0] as { $and: Record<string, unknown>[] };
        expect(JSON.stringify(filter)).toContain('"isPublic":true');
        expect(JSON.stringify(filter)).toContain('expiryDate');
    });

    it('escapes regex-special characters in search queries', async () => {
        resourceFind.mockReturnValue(chain([]));
        resourceCountDocuments.mockResolvedValue(0);
        resourceDistinct.mockResolvedValue([]);
        resourceAggregate.mockResolvedValue([]);

        const res = buildRes();
        await getPublicResources(makeReq({ query: { q: '(HSC 2025) [physics]' } }), res);

        const filter = resourceFind.mock.calls[0][0] as { $and: Record<string, unknown>[] };
        const titleCond = filter.$and
            .flatMap((entry) => ((entry && typeof entry === 'object' && '$or' in entry) ? (entry.$or as { title?: { $regex: string } }[]) : []))
            .find((cond) => cond.title);
        expect(titleCond?.title.$regex).toBe('\\(HSC 2025\\) \\[physics\\]');
        // searching must not throw even with dangerous input
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('honours type, category and featured filters', async () => {
        resourceFind.mockReturnValue(chain([]));
        resourceCountDocuments.mockResolvedValue(0);
        resourceDistinct.mockResolvedValue([]);
        resourceAggregate.mockResolvedValue([]);

        await getPublicResources(makeReq({ query: { type: 'pdf', category: 'Question Banks', featured: 'true' } }), buildRes());

        const serialized = JSON.stringify(resourceFind.mock.calls[0][0]);
        expect(serialized).toContain('"type":"pdf"');
        expect(serialized).toContain('"category":"Question Banks"');
        expect(serialized).toContain('"isFeatured":true');
    });

    it('supports sort=title and sort=downloads', async () => {
        const c1 = chain([]);
        resourceFind.mockReturnValueOnce(c1 as unknown as ReturnType<typeof chain>);
        resourceCountDocuments.mockResolvedValueOnce(0);
        resourceDistinct.mockResolvedValueOnce([]);
        resourceAggregate.mockResolvedValueOnce([]);
        await getPublicResources(makeReq({ query: { sort: 'title' } }), buildRes());
        expect((c1.sort as Mock).mock.calls[0][0]).toEqual({ title: 1 });

        const c2 = chain([]);
        resourceFind.mockReturnValueOnce(c2 as unknown as ReturnType<typeof chain>);
        resourceCountDocuments.mockResolvedValueOnce(0);
        resourceDistinct.mockResolvedValueOnce([]);
        resourceAggregate.mockResolvedValueOnce([]);
        await getPublicResources(makeReq({ query: { sort: 'downloads' } }), buildRes());
        expect((c2.sort as Mock).mock.calls[0][0]).toEqual({ downloads: -1 });
    });

    it('caps limit at 100 and defaults page to 1', async () => {
        const c = chain([]);
        resourceFind.mockReturnValue(c as unknown as ReturnType<typeof chain>);
        resourceCountDocuments.mockResolvedValue(0);
        resourceDistinct.mockResolvedValue([]);
        resourceAggregate.mockResolvedValue([]);

        const res = buildRes();
        await getPublicResources(makeReq({ query: { limit: '5000', page: '-3' } }), res);

        expect((c.limit as Mock).mock.calls[0][0]).toBe(100);
        expect((c.skip as Mock).mock.calls[0][0]).toBe(0);
        expect((res.json.mock.calls[0][0] as { data: { page: number } }).data.page).toBe(1);
    });
});

describe('tracking endpoints', () => {
    it('increments views for a valid id', async () => {
        settingsFindOne.mockReturnValue(trackingOn);
        resourceFindByIdAndUpdate.mockResolvedValue({});
        const res = buildRes();
        await incrementResourceView(makeReq({ params: { id: '507f1f77bcf86cd799439011' } }), res);
        expect(resourceFindByIdAndUpdate).toHaveBeenCalledWith('507f1f77bcf86cd799439011', { $inc: { views: 1 } });
        const body = res.json.mock.calls[0][0] as { data: { ok: boolean } };
        expect(body.data.ok).toBe(true);
    });

    it('returns ok:false — never a 500 — for invalid ids', async () => {
        settingsFindOne.mockReturnValue(trackingOn);
        const res = buildRes();
        await incrementResourceView(makeReq({ params: { id: 'not-an-object-id(' } }), res);
        expect(resourceFindByIdAndUpdate).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect((res.json.mock.calls[0][0] as { data: { ok: boolean } }).data.ok).toBe(false);
    });

    it('is a no-op when trackingEnabled is off', async () => {
        settingsFindOne.mockReturnValue(trackingOff);
        const res = buildRes();
        await incrementResourceDownload(makeReq({ params: { id: '507f1f77bcf86cd799439011' } }), res);
        expect(resourceFindByIdAndUpdate).not.toHaveBeenCalled();
        const body = res.json.mock.calls[0][0] as { data: { ok: boolean; trackingEnabled: boolean } };
        expect(body.data).toEqual({ ok: true, trackingEnabled: false });
    });

    it('increments downloads for a valid id', async () => {
        settingsFindOne.mockReturnValue(trackingOn);
        resourceFindByIdAndUpdate.mockResolvedValue({});
        const res = buildRes();
        await incrementResourceDownload(makeReq({ params: { id: '507f1f77bcf86cd799439011' } }), res);
        expect(resourceFindByIdAndUpdate).toHaveBeenCalledWith('507f1f77bcf86cd799439011', { $inc: { downloads: 1 } });
    });
});

describe('getPublicResourceBySlug', () => {
    it('returns the resource and backfills related items with same-type when the category is thin', async () => {
        const base = row({});
        const sameCategory = row({ title: 'Same category', category: 'Question Banks' });
        const sameTypeA = row({ title: 'Type A', category: 'Other' });
        const sameTypeB = row({ title: 'Type B', category: 'Other' });

        resourceFindOne.mockImplementationOnce(() => chainOne(base));
        // second findOne (fallback by id) is never reached because the first hit succeeds
        const relatedChain = chain([sameCategory]);
        const fallbackChain = chain([sameTypeA, sameTypeB]);
        resourceFind.mockReturnValueOnce(relatedChain as unknown as ReturnType<typeof chain>)
            .mockReturnValueOnce(fallbackChain as unknown as ReturnType<typeof chain>);

        const res = buildRes();
        await getPublicResourceBySlug(makeReq({ params: { slug: 'physics-1st-paper' } }), res);

        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0] as { data: { resource: { slug: string }; relatedResources: unknown[] } };
        expect(body.data.resource.slug).toBe('physics-1st-paper');
        expect(body.data.relatedResources).toHaveLength(3);
        // fallback query excludes the main resource + already-selected related rows
        const fallbackFilter = resourceFind.mock.calls[1][0] as { _id: { $nin: unknown[] }; type: string };
        expect(fallbackFilter.type).toBe('pdf');
        expect(fallbackFilter._id.$nin).toHaveLength(2);
    });

    it('404s for unknown slugs', async () => {
        resourceFindOne.mockImplementationOnce(() => chainOne(null));
        // no ObjectId fallback inside slug either
        const res = buildRes();
        await getPublicResourceBySlug(makeReq({ params: { slug: 'does-not-exist' } }), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});

describe('getPublicResourceSettings', () => {
    it('passes through SEO fields and clamps numeric settings', async () => {
        settingsFindOne.mockReturnValue({
            lean: vi.fn(async () => ({
                metaTitle: 'Custom SEO Title',
                metaDescription: 'Custom description',
                metaKeywords: 'a, b, c',
                ogImageUrl: 'https://cdn.example.com/og.png',
                featuredLimit: 999,
                itemsPerPage: 0,
            })),
        });
        const res = buildRes();
        await getPublicResourceSettings(makeReq(), res);

        const settings = (res.json.mock.calls[0][0] as { data: { settings: Record<string, unknown> } }).data.settings;
        expect(settings.metaTitle).toBe('Custom SEO Title');
        expect(settings.metaDescription).toBe('Custom description');
        expect(settings.metaKeywords).toBe('a, b, c');
        expect(settings.ogImageUrl).toBe('https://cdn.example.com/og.png');
        expect(settings.featuredLimit).toBe(24); // clamped
        expect(settings.itemsPerPage).toBeGreaterThanOrEqual(4); // clamped
    });

    it('falls back to defaults when nothing is saved yet', async () => {
        settingsFindOne.mockReturnValue({ lean: vi.fn(async () => null) });
        const res = buildRes();
        await getPublicResourceSettings(makeReq(), res);
        const settings = (res.json.mock.calls[0][0] as { data: { settings: Record<string, unknown> } }).data.settings;
        expect(settings.trackingEnabled).toBe(true);
        expect(settings.showSearch).toBe(true);
        expect(typeof settings.searchPlaceholder).toBe('string');
    });
});
