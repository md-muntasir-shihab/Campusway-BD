import express, { Response } from 'express';
import request from 'supertest';
import { getAggregatedHomeData } from '../../src/controllers/homeAggregateController';
import HomeSettings, { createHomeSettingsDefaults, type HomeSettingsShape } from '../../src/models/HomeSettings';
import University from '../../src/models/University';
import UniversityCategory from '../../src/models/UniversityCategory';
import UniversityCluster from '../../src/models/UniversityCluster';
import UniversitySettingsModel from '../../src/models/UniversitySettings';
import HomeConfig from '../../src/models/HomeConfig';

function addDays(days: number): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date;
}

async function seedHomeSettings(
    previewOverrides: Partial<HomeSettingsShape['universityPreview']> = {},
): Promise<void> {
    const defaults = createHomeSettingsDefaults();
    defaults.universityPreview = {
        ...defaults.universityPreview,
        ...previewOverrides,
    };
    await HomeSettings.create(defaults);
}

async function seedUniversity(params: {
    name: string;
    shortForm: string;
    slug: string;
    category: string;
    deadlineInDays: number;
    examInDays?: number;
}): Promise<void> {
    await University.create({
        name: params.name,
        shortForm: params.shortForm,
        slug: params.slug,
        category: params.category,
        clusterGroup: '',
        website: 'https://example.edu',
        admissionWebsite: 'https://admission.example.edu',
        address: 'Dhaka, Bangladesh',
        contactNumber: '01700000000',
        email: 'admission@example.edu',
        totalSeats: '1200',
        scienceSeats: '500',
        artsSeats: '300',
        businessSeats: '400',
        applicationStartDate: addDays(-5),
        applicationEndDate: addDays(params.deadlineInDays),
        scienceExamDate: addDays(params.examInDays ?? params.deadlineInDays + 1).toISOString(),
        artsExamDate: '',
        businessExamDate: '',
        isActive: true,
        isArchived: false,
    });
}

function buildTestApp() {
    const app = express();
    app.get('/api/home', (req, res: Response) => {
        void getAggregatedHomeData(req as any, res as any);
    });
    return app;
}

describe('/api/home (Home Step1)', () => {
    test('returns required top-level keys', async () => {
        await seedHomeSettings();
        await seedUniversity({
            name: 'Test University',
            shortForm: 'TU',
            slug: 'test-university',
            category: 'Individual Admission',
            deadlineInDays: 3,
        });

        const app = buildTestApp();
        const response = await request(app).get('/api/home').expect(200);
        const body = response.body as Record<string, unknown>;

        const requiredKeys = [
            'siteSettings',
            'homeSettings',
            'campaignBannersActive',
            'featuredUniversities',
            'universityCategories',
            'deadlineUniversities',
            'upcomingExamUniversities',
            'onlineExamsPreview',
            'newsPreviewItems',
            'resourcePreviewItems',
        ];

        for (const key of requiredKeys) {
            expect(body).toHaveProperty(key);
        }
    });

    test('preserves featured ordering from admin featuredUniversitySlugs', async () => {
        await seedHomeSettings({ featuredMode: 'manual', maxFeaturedItems: 5 });
        await seedUniversity({
            name: 'Alpha University',
            shortForm: 'AU',
            slug: 'alpha-university',
            category: 'Individual Admission',
            deadlineInDays: 3,
        });
        await seedUniversity({
            name: 'Beta University',
            shortForm: 'BU',
            slug: 'beta-university',
            category: 'Individual Admission',
            deadlineInDays: 4,
        });

        await UniversitySettingsModel.create({
            featuredUniversitySlugs: ['beta-university', 'alpha-university'],
            maxFeaturedItems: 5,
        });

        const app = buildTestApp();
        const response = await request(app).get('/api/home').expect(200);
        const featured = Array.isArray(response.body.featuredUniversities)
            ? response.body.featuredUniversities
            : [];

        const slugs = featured.map((item: { slug?: string }) => String(item.slug || ''));
        expect(slugs.slice(0, 2)).toEqual(['beta-university', 'alpha-university']);
    });

    test('applies deadlineWithinDays threshold for deadlineUniversities', async () => {
        await seedHomeSettings({ deadlineWithinDays: 5, maxDeadlineItems: 10 });

        await seedUniversity({
            name: 'Near Deadline University',
            shortForm: 'NDU',
            slug: 'near-deadline-university',
            category: 'Individual Admission',
            deadlineInDays: 2,
        });
        await seedUniversity({
            name: 'Far Deadline University',
            shortForm: 'FDU',
            slug: 'far-deadline-university',
            category: 'Individual Admission',
            deadlineInDays: 9,
        });
        await seedUniversity({
            name: 'Past Deadline University',
            shortForm: 'PDU',
            slug: 'past-deadline-university',
            category: 'Individual Admission',
            deadlineInDays: -1,
        });

        const app = buildTestApp();
        const response = await request(app).get('/api/home').expect(200);
        const deadlineItems = Array.isArray(response.body.deadlineUniversities)
            ? response.body.deadlineUniversities
            : [];
        const slugs = deadlineItems.map((item: { slug?: string }) => String(item.slug || ''));

        expect(slugs).toContain('near-deadline-university');
        expect(slugs).not.toContain('far-deadline-university');
        expect(slugs).not.toContain('past-deadline-university');
    });

    test('includes universities whose deadline is today', async () => {
        await seedHomeSettings({ deadlineWithinDays: 5, maxDeadlineItems: 10 });

        await seedUniversity({
            name: 'Today Deadline University',
            shortForm: 'TDU',
            slug: 'today-deadline-university',
            category: 'Individual Admission',
            deadlineInDays: 0,
        });

        const app = buildTestApp();
        const response = await request(app).get('/api/home').expect(200);
        const deadlineItems = Array.isArray(response.body.deadlineUniversities)
            ? response.body.deadlineUniversities
            : [];
        const slugs = deadlineItems.map((item: { slug?: string }) => String(item.slug || ''));

        expect(slugs).toContain('today-deadline-university');
    });

    test('groups clustered universities into deadlineClusters and hides child cards', async () => {
        await seedHomeSettings({ deadlineWithinDays: 7, maxDeadlineItems: 10, maxExamItems: 10 });

        const cluster = await UniversityCluster.create({
            name: 'GST Mega Cluster',
            slug: 'gst-mega-cluster',
            description: 'Shared cluster timeline',
            isActive: true,
            homeVisible: true,
            homeOrder: 1,
            dates: {
                applicationStartDate: addDays(-6),
                applicationEndDate: addDays(4),
                scienceExamDate: addDays(6).toISOString(),
                artsExamDate: addDays(7).toISOString(),
                commerceExamDate: addDays(8).toISOString(),
                admissionWebsite: 'https://cluster-admission.example.edu',
                examCenters: [{ city: 'Dhaka', address: 'BUET Campus' }],
            },
        });

        await University.create({
            name: 'Cluster Member One',
            shortForm: 'CM1',
            slug: 'cluster-member-one',
            category: 'Engineering Cluster',
            clusterId: cluster._id,
            clusterGroup: 'GST Mega Cluster',
            website: 'https://example.edu',
            admissionWebsite: 'https://admission.example.edu',
            address: 'Dhaka, Bangladesh',
            contactNumber: '01700000000',
            email: 'member1@example.edu',
            totalSeats: '1000',
            scienceSeats: '400',
            artsSeats: '300',
            businessSeats: '300',
            applicationStartDate: addDays(-3),
            applicationEndDate: addDays(2),
            scienceExamDate: addDays(4).toISOString(),
            examCenters: [{ city: 'Dhaka', address: 'BUET Campus' }],
            isActive: true,
            isArchived: false,
        });

        await University.create({
            name: 'Cluster Member Two',
            shortForm: 'CM2',
            slug: 'cluster-member-two',
            category: 'Engineering Cluster',
            clusterId: cluster._id,
            clusterGroup: 'GST Mega Cluster',
            website: 'https://example.edu',
            admissionWebsite: 'https://admission.example.edu',
            address: 'Rajshahi, Bangladesh',
            contactNumber: '01700000001',
            email: 'member2@example.edu',
            totalSeats: '900',
            scienceSeats: '350',
            artsSeats: '250',
            businessSeats: '300',
            applicationStartDate: addDays(-3),
            applicationEndDate: addDays(3),
            scienceExamDate: addDays(5).toISOString(),
            examCenters: [{ city: 'Rajshahi', address: 'RUET Campus' }],
            isActive: true,
            isArchived: false,
        });

        const app = buildTestApp();
        const response = await request(app).get('/api/home').expect(200);

        const deadlineUniversities = Array.isArray(response.body.deadlineUniversities) ? response.body.deadlineUniversities : [];
        const deadlineClusters = Array.isArray(response.body.deadlineClusters) ? response.body.deadlineClusters : [];
        const featuredClusters = Array.isArray(response.body.featuredClusters) ? response.body.featuredClusters : [];

        expect(deadlineUniversities.map((item: { slug?: string }) => item.slug)).not.toContain('cluster-member-one');
        expect(deadlineUniversities.map((item: { slug?: string }) => item.slug)).not.toContain('cluster-member-two');
        expect(deadlineClusters).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    slug: 'gst-mega-cluster',
                    name: 'GST Mega Cluster',
                    memberCount: 2,
                    applicationStartDate: addDays(-6).toISOString(),
                    applicationEndDate: addDays(4).toISOString(),
                    scienceExamDate: addDays(6).toISOString(),
                    artsExamDate: addDays(7).toISOString(),
                    businessExamDate: addDays(8).toISOString(),
                    admissionWebsite: 'https://cluster-admission.example.edu',
                }),
            ]),
        );
        expect(featuredClusters).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    slug: 'gst-mega-cluster',
                }),
            ]),
        );
    });

    test('returns highlighted category cards and hides their universities from home sections', async () => {
        await seedHomeSettings({ deadlineWithinDays: 7, maxDeadlineItems: 10, maxExamItems: 10, maxFeaturedItems: 10 });

        await UniversityCategory.create({
            name: 'Science & Technology',
            slug: 'science-technology',
            isActive: true,
            homeHighlight: true,
            homeOrder: 1,
        });

        await University.create({
            name: 'Highlighted Category University One',
            shortForm: 'HCU1',
            slug: 'highlighted-category-university-one',
            category: 'Science & Technology',
            clusterGroup: '',
            website: 'https://example.edu',
            admissionWebsite: 'https://admission.example.edu',
            address: 'Dhaka, Bangladesh',
            contactNumber: '01700000010',
            email: 'hcu1@example.edu',
            totalSeats: '1000',
            scienceSeats: '450',
            artsSeats: '250',
            businessSeats: '300',
            applicationStartDate: addDays(-4),
            applicationEndDate: addDays(3),
            scienceExamDate: addDays(5).toISOString(),
            examCenters: [{ city: 'Dhaka', address: 'BUET Campus' }],
            isActive: true,
            isArchived: false,
        });

        await University.create({
            name: 'Highlighted Category University Two',
            shortForm: 'HCU2',
            slug: 'highlighted-category-university-two',
            category: 'Science & Technology',
            clusterGroup: '',
            website: 'https://example.edu',
            admissionWebsite: 'https://admission.example.edu',
            address: 'Sylhet, Bangladesh',
            contactNumber: '01700000011',
            email: 'hcu2@example.edu',
            totalSeats: '950',
            scienceSeats: '400',
            artsSeats: '250',
            businessSeats: '300',
            applicationStartDate: addDays(-4),
            applicationEndDate: addDays(4),
            scienceExamDate: addDays(6).toISOString(),
            examCenters: [{ city: 'Sylhet', address: 'SUST Campus' }],
            isActive: true,
            isArchived: false,
        });

        const app = buildTestApp();
        const response = await request(app).get('/api/home').expect(200);

        const featuredCategories = Array.isArray(response.body.featuredCategories) ? response.body.featuredCategories : [];
        const deadlineCategories = Array.isArray(response.body.deadlineCategories) ? response.body.deadlineCategories : [];
        const upcomingExamCategories = Array.isArray(response.body.upcomingExamCategories) ? response.body.upcomingExamCategories : [];
        const featuredUniversities = Array.isArray(response.body.featuredUniversities) ? response.body.featuredUniversities : [];
        const deadlineUniversities = Array.isArray(response.body.deadlineUniversities) ? response.body.deadlineUniversities : [];

        expect(featuredCategories).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    slug: 'science-technology',
                    name: 'Science & Technology',
                    memberCount: 2,
                }),
            ]),
        );
        expect(deadlineCategories).toEqual([]);
        expect(upcomingExamCategories).toEqual([]);
        expect(featuredUniversities.map((item: { slug?: string }) => item.slug)).not.toContain('highlighted-category-university-one');
        expect(featuredUniversities.map((item: { slug?: string }) => item.slug)).not.toContain('highlighted-category-university-two');
        expect(deadlineUniversities.map((item: { slug?: string }) => item.slug)).not.toContain('highlighted-category-university-one');
        expect(deadlineUniversities.map((item: { slug?: string }) => item.slug)).not.toContain('highlighted-category-university-two');
    });

    test('keeps manually featured universities visible even when category highlight would normally suppress them', async () => {
        await seedHomeSettings({ deadlineWithinDays: 7, maxDeadlineItems: 10, maxExamItems: 10, maxFeaturedItems: 10 });

        await UniversityCategory.create({
            name: 'Engineering Cluster',
            slug: 'engineering-cluster',
            isActive: true,
            homeHighlight: true,
            homeOrder: 1,
        });

        const university = await University.create({
            name: 'Manual Featured Cluster University',
            shortForm: 'MFCU',
            slug: 'manual-featured-cluster-university',
            category: 'Engineering Cluster',
            clusterGroup: '',
            website: 'https://example.edu',
            admissionWebsite: 'https://admission.example.edu',
            address: 'Dhaka, Bangladesh',
            contactNumber: '01700000099',
            email: 'mfcu@example.edu',
            totalSeats: '900',
            scienceSeats: '400',
            artsSeats: '250',
            businessSeats: '250',
            applicationStartDate: addDays(-3),
            applicationEndDate: addDays(3),
            scienceExamDate: addDays(5).toISOString(),
            isActive: true,
            isArchived: false,
        });

        await HomeSettings.findOneAndUpdate(
            {},
            {
                $set: {
                    featuredUniversities: [
                        {
                            universityId: String(university._id),
                            order: 1,
                            badgeText: 'Featured',
                            enabled: true,
                        },
                    ],
                },
            },
            { new: true },
        );

        const app = buildTestApp();
        const response = await request(app).get('/api/home').expect(200);

        const featuredUniversities = Array.isArray(response.body.featuredUniversities) ? response.body.featuredUniversities : [];
        const deadlineUniversities = Array.isArray(response.body.deadlineUniversities) ? response.body.deadlineUniversities : [];

        expect(featuredUniversities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    slug: 'manual-featured-cluster-university',
                }),
            ]),
        );
        expect(deadlineUniversities.map((item: { slug?: string }) => item.slug)).not.toContain('manual-featured-cluster-university');
    });

    test('normalizes legacy home section IDs so news/resources/exams stay visible', async () => {
        await seedHomeSettings();
        await HomeConfig.create({
            sections: [
                { id: 'SearchBar', title: 'Search', isActive: true, order: 0 },
                { id: 'HeroBanner', title: 'Hero', isActive: true, order: 1 },
                { id: 'FeaturedUniversities', title: 'Featured', isActive: true, order: 2 },
                { id: 'UpcomingExams', title: 'Upcoming Exams', isActive: true, order: 3 },
                { id: 'OnlineExamPreview', title: 'Online Exams', isActive: true, order: 4 },
                { id: 'LatestNews', title: 'Latest News', isActive: true, order: 5 },
                { id: 'ResourcesPreview', title: 'Resources', isActive: true, order: 6 },
            ],
            selectedUniversityCategories: [],
            highlightCategoryIds: [],
        });

        const app = buildTestApp();
        const response = await request(app).get('/api/home').expect(200);
        const sectionOrder = Array.isArray(response.body.sectionOrder) ? response.body.sectionOrder : [];
        const ids = sectionOrder.map((item: { id?: string }) => String(item.id || ''));

        expect(ids).toEqual(expect.arrayContaining(['news', 'resources', 'upcoming_exams', 'online_exam_preview']));
        expect(ids).not.toContain('LatestNews');
        expect(ids).not.toContain('ResourcesPreview');
        expect(ids).not.toContain('UpcomingExams');
    });
});
