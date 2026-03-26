import express, { type Request, type Response } from 'express';
import request from 'supertest';
import University from '../../src/models/University';
import {
    getUniversities,
    getUniversityCategories,
    getUniversityBySlug,
} from '../../src/controllers/universityController';

// Shared setup/teardown lives in tests/setup.ts (beforeAll/afterEach/afterAll)

function addDays(n: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
}

async function seedUni(overrides: Record<string, unknown> = {}) {
    return University.create({
        name: overrides.name ?? 'Test University',
        shortForm: overrides.shortForm ?? 'TU',
        slug: overrides.slug ?? `test-university-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        category: overrides.category ?? 'Individual Admission',
        address: 'Test Address, Dhaka',
        contactNumber: '01700000000',
        email: 'test@university.edu',
        website: 'http://test.edu',
        admissionWebsite: 'http://admission.test.edu',
        totalSeats: '100',
        scienceSeats: '50',
        artsSeats: '25',
        businessSeats: '25',
        isActive: true,
        ...overrides,
    });
}

function buildApp() {
    const app = express();
    app.use(express.json());
    app.get('/api/universities', (req: Request, res: Response) => getUniversities(req, res));
    app.get('/api/university-categories', (req: Request, res: Response) => getUniversityCategories(req, res));
    app.get('/api/universities/:slug', (req: Request, res: Response) => getUniversityBySlug(req, res));
    return app;
}

describe('/api/universities', () => {
    it('returns 400 + CATEGORY_REQUIRED when no category param', async () => {
        const app = buildApp();
        const res = await request(app).get('/api/universities');
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ code: 'CATEGORY_REQUIRED' });
        expect(typeof res.body.defaultCategory).toBe('string');
    });

    it('returns filtered universities by category', async () => {
        await seedUni({ name: 'Alpha University', slug: 'alpha-uni', category: 'Individual Admission' });
        await seedUni({ name: 'Beta University', slug: 'beta-uni', category: 'Cluster Admission' });

        const app = buildApp();
        const res = await request(app).get('/api/universities?category=Individual%20Admission');
        expect(res.status).toBe(200);
        const universities: Array<{ name: string }> = res.body.universities || res.body.items || [];
        expect(universities.some((u) => u.name === 'Alpha University')).toBe(true);
        expect(universities.every((u) => u.name !== 'Beta University')).toBe(true);
    });

    it('returns empty array for valid category with no data', async () => {
        const app = buildApp();
        const res = await request(app).get('/api/universities?category=Individual%20Admission');
        expect(res.status).toBe(200);
        const universities: unknown[] = res.body.universities || res.body.items || [];
        expect(Array.isArray(universities)).toBe(true);
        expect(universities.length).toBe(0);
    });

    it('returns 400 even when DB has data, if category param is absent', async () => {
        await seedUni({ name: 'Present University', slug: 'present-uni', category: 'Individual Admission' });
        const app = buildApp();
        const res = await request(app).get('/api/universities');
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('CATEGORY_REQUIRED');
    });

    it('GET /api/university-categories returns array with required shape', async () => {
        await seedUni({ name: 'Shape University', slug: 'shape-uni', category: 'Individual Admission' });
        const app = buildApp();
        const res = await request(app).get('/api/university-categories');
        expect(res.status).toBe(200);
        const categories: Array<{ categoryName: string; order: number; count: number; clusterGroups: unknown[] }> =
            res.body.categories || [];
        expect(Array.isArray(categories)).toBe(true);
        expect(categories.length).toBeGreaterThan(0);
        const cat = categories[0];
        expect(typeof cat.categoryName).toBe('string');
        expect(typeof cat.count).toBe('number');
        expect(Array.isArray(cat.clusterGroups)).toBe(true);
    });

    it('sort=closing_soon orders by applicationEndDate ascending', async () => {
        await seedUni({
            name: 'Far Deadline',
            slug: 'far-deadline',
            category: 'Individual Admission',
            applicationEndDate: addDays(10),
        });
        await seedUni({
            name: 'Near Deadline',
            slug: 'near-deadline',
            category: 'Individual Admission',
            applicationEndDate: addDays(2),
        });
        await seedUni({
            name: 'Mid Deadline',
            slug: 'mid-deadline',
            category: 'Individual Admission',
            applicationEndDate: addDays(5),
        });

        const app = buildApp();
        const res = await request(app).get('/api/universities?category=Individual%20Admission&sort=closing_soon');
        expect(res.status).toBe(200);
        const names: string[] = (res.body.universities || res.body.items || []).map((u: { name: string }) => u.name);
        const nearIdx = names.indexOf('Near Deadline');
        const midIdx = names.indexOf('Mid Deadline');
        const farIdx = names.indexOf('Far Deadline');
        expect(nearIdx).toBeLessThan(midIdx);
        expect(midIdx).toBeLessThan(farIdx);
    });

    it('sort=name_asc orders alphabetically ascending', async () => {
        await seedUni({ name: 'Zeta University', slug: 'zeta-uni', category: 'Individual Admission' });
        await seedUni({ name: 'Alpha University', slug: 'alpha-uni-sort', category: 'Individual Admission' });
        await seedUni({ name: 'Beta University', slug: 'beta-uni-sort', category: 'Individual Admission' });

        const app = buildApp();
        const res = await request(app).get('/api/universities?category=Individual%20Admission&sort=name_asc');
        expect(res.status).toBe(200);
        const names: string[] = (res.body.universities || res.body.items || []).map((u: { name: string }) => u.name);
        expect(names.indexOf('Alpha University')).toBeLessThan(names.indexOf('Beta University'));
        expect(names.indexOf('Beta University')).toBeLessThan(names.indexOf('Zeta University'));
    });

    it('sort=name_desc orders alphabetically descending', async () => {
        await seedUni({ name: 'Zeta University', slug: 'zeta-uni-desc', category: 'Individual Admission' });
        await seedUni({ name: 'Alpha University', slug: 'alpha-uni-desc', category: 'Individual Admission' });
        await seedUni({ name: 'Beta University', slug: 'beta-uni-desc', category: 'Individual Admission' });

        const app = buildApp();
        const res = await request(app).get('/api/universities?category=Individual%20Admission&sort=name_desc');
        expect(res.status).toBe(200);
        const names: string[] = (res.body.universities || res.body.items || []).map((u: { name: string }) => u.name);
        expect(names.indexOf('Zeta University')).toBeLessThan(names.indexOf('Beta University'));
        expect(names.indexOf('Beta University')).toBeLessThan(names.indexOf('Alpha University'));
    });

    it('GET /api/universities/:slug returns correct university', async () => {
        await seedUni({ name: 'Slug University', slug: 'slug-test-university', category: 'Individual Admission' });
        const app = buildApp();
        const res = await request(app).get('/api/universities/slug-test-university');
        expect(res.status).toBe(200);
        expect(res.body.university).toBeDefined();
        expect(res.body.university.slug).toBe('slug-test-university');
    });

    it('GET /api/universities/nonexistent returns 404', async () => {
        const app = buildApp();
        const res = await request(app).get('/api/universities/does-not-exist-anywhere-404');
        expect(res.status).toBe(404);
    });
});
