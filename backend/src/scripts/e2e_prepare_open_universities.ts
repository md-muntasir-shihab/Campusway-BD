import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import HomeSettings, { createHomeSettingsDefaults } from '../models/HomeSettings';
import University from '../models/University';
import UniversityCategory from '../models/UniversityCategory';
import UniversityCluster from '../models/UniversityCluster';
import UniversitySettings from '../models/UniversitySettings';
import User from '../models/User';
import {
    ensureUniversityCategoryByName,
    ensureUniversityClusterByName,
    normalizeExamCenters,
    reconcileUniversityClusterAssignments,
    syncManualClusterMembership,
    syncUniversityClusterSharedConfig,
} from '../services/universitySyncService';

const DAY_MS = 24 * 60 * 60 * 1000;
const SHOULD_OVERRIDE_HOME_HERO = String(process.env.E2E_PREPARE_OVERRIDE_HOME_HERO || 'false').toLowerCase() === 'true';

function nowPlusDays(days: number): Date {
    return new Date(Date.now() + days * DAY_MS);
}

function buildDataLogo(label: string, bg: string): string {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
            <rect width="120" height="120" rx="24" fill="${bg}" />
            <text x="60" y="70" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${label}</text>
        </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function toSlug(value: string): string {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function buildReachableExampleUrl(slug: string, kind: 'website' | 'admission'): string {
    const safeSlug = encodeURIComponent(slug);
    return kind === 'admission'
        ? `https://example.com/admission/${safeSlug}`
        : `https://example.com/universities/${safeSlug}`;
}

type QaUniversitySeed = {
    name: string;
    shortForm: string;
    category: string;
    clusterGroup?: string;
    logoUrl?: string;
    website?: string;
    admissionWebsite?: string;
    description?: string;
    shortDescription?: string;
    address?: string;
    contactNumber?: string;
    email?: string;
    totalSeats?: string;
    scienceSeats?: string;
    artsSeats?: string;
    businessSeats?: string;
    applicationStartDate?: Date | null;
    applicationEndDate?: Date | null;
    scienceExamDate?: string;
    artsExamDate?: string;
    businessExamDate?: string;
    examCenters?: Array<{ city: string; address: string }>;
    featured?: boolean;
    featuredOrder?: number;
    rawShortForm?: string;
};

async function upsertUniversity(seed: QaUniversitySeed): Promise<mongoose.Types.ObjectId> {
    const categoryDoc = await ensureUniversityCategoryByName(seed.category);
    const slug = toSlug(seed.name);
    const doc = await University.findOneAndUpdate(
        { slug },
        {
            $set: {
                name: seed.name,
                shortForm: seed.shortForm,
                category: categoryDoc.name,
                categoryId: categoryDoc._id,
                clusterGroup: seed.clusterGroup || '',
                clusterName: seed.clusterGroup || '',
                established: 2000,
                establishedYear: 2000,
                address: seed.address || 'Dhaka, Bangladesh',
                contactNumber: seed.contactNumber || '01700000000',
                email: seed.email || `${slug}@campusway.local`,
                website: seed.website || buildReachableExampleUrl(slug, 'website'),
                websiteUrl: seed.website || buildReachableExampleUrl(slug, 'website'),
                admissionWebsite: seed.admissionWebsite || buildReachableExampleUrl(slug, 'admission'),
                admissionUrl: seed.admissionWebsite || buildReachableExampleUrl(slug, 'admission'),
                totalSeats: seed.totalSeats || '1200',
                scienceSeats: seed.scienceSeats || '450',
                seatsScienceEng: seed.scienceSeats || '450',
                artsSeats: seed.artsSeats || '320',
                seatsArtsHum: seed.artsSeats || '320',
                businessSeats: seed.businessSeats || '260',
                seatsBusiness: seed.businessSeats || '260',
                shortDescription: seed.shortDescription || `${seed.name} open-university QA fixture.`,
                description: seed.description || `${seed.name} is included in the Open Universities QA dataset.`,
                applicationStartDate: seed.applicationStartDate ?? nowPlusDays(-7),
                applicationEndDate: seed.applicationEndDate ?? nowPlusDays(12),
                applicationStart: seed.applicationStartDate ?? nowPlusDays(-7),
                applicationEnd: seed.applicationEndDate ?? nowPlusDays(12),
                scienceExamDate: seed.scienceExamDate || nowPlusDays(18).toISOString(),
                examDateScience: seed.scienceExamDate || nowPlusDays(18).toISOString(),
                artsExamDate: seed.artsExamDate || '',
                examDateArts: seed.artsExamDate || '',
                businessExamDate: seed.businessExamDate || '',
                examDateBusiness: seed.businessExamDate || '',
                examCenters: seed.examCenters || [],
                logoUrl: seed.logoUrl || '',
                unitLayout: 'compact',
                featured: Boolean(seed.featured),
                featuredOrder: Number(seed.featuredOrder || 0),
                isActive: true,
                isArchived: false,
                slug,
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    if (seed.rawShortForm !== undefined) {
        await University.collection.updateOne({ _id: doc._id }, { $set: { shortForm: seed.rawShortForm } });
    }

    return doc._id;
}

async function run(): Promise<void> {
    try {
        await connectDB();

        const admin = await User.findOne({ role: { $in: ['superadmin', 'admin'] } }).sort({ createdAt: 1 }).lean();
        const adminId = admin?._id ? new mongoose.Types.ObjectId(String(admin._id)) : null;

        const highlightedCategories = [
            'Science & Technology',
            'Individual Admission',
            'GST (General/Public)',
            'Medical College',
        ];

        for (let index = 0; index < highlightedCategories.length; index += 1) {
            const name = highlightedCategories[index];
            await UniversityCategory.findOneAndUpdate(
                { name },
                {
                    $set: {
                        name,
                        slug: toSlug(name),
                        isActive: true,
                        homeHighlight: true,
                        homeOrder: index + 1,
                    },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true },
            );
        }

        const engineeringCenters = normalizeExamCenters('Dhaka - BUET Campus | Rajshahi - RUET Campus | Khulna - KUET Campus');
        const gstCenters = normalizeExamCenters('Sylhet - SUST Campus | Dinajpur - HSTU Campus');
        const medicalCenters = normalizeExamCenters('Dhaka - DMC Campus | Chattogram - CMC Campus');

        const fixtureIds: mongoose.Types.ObjectId[] = [];

        const universities: QaUniversitySeed[] = [
            {
                name: 'Bangladesh University of Engineering and Technology',
                shortForm: 'BUET',
                category: 'Science & Technology',
                clusterGroup: 'Engineering Alliance',
                logoUrl: buildDataLogo('BUET', '#1d4ed8'),
                featured: true,
                featuredOrder: 1,
                examCenters: engineeringCenters,
            },
            {
                name: 'Rajshahi University of Engineering & Technology',
                shortForm: 'RUET',
                category: 'Science & Technology',
                clusterGroup: 'Engineering Alliance',
                logoUrl: buildDataLogo('RUET', '#0f766e'),
                featured: true,
                featuredOrder: 2,
                examCenters: engineeringCenters,
            },
            {
                name: 'Khulna University of Engineering & Technology',
                shortForm: 'KUET',
                category: 'Science & Technology',
                clusterGroup: 'Engineering Alliance',
                logoUrl: buildDataLogo('KUET', '#7c3aed'),
                featured: true,
                featuredOrder: 3,
                examCenters: engineeringCenters,
            },
            {
                name: 'Chittagong University of Engineering & Technology',
                shortForm: 'CUET',
                category: 'Science & Technology',
                clusterGroup: 'Engineering Alliance',
                examCenters: engineeringCenters,
            },
            {
                name: 'Dhaka University of Engineering & Technology',
                shortForm: 'DUET',
                category: 'Science & Technology',
                clusterGroup: 'Engineering Alliance',
                examCenters: engineeringCenters,
            },
            {
                name: 'Islamic University of Technology',
                shortForm: 'IUT',
                category: 'Science & Technology',
                clusterGroup: 'Engineering Alliance',
                examCenters: engineeringCenters,
            },
            {
                name: 'Shahjalal University of Science and Technology',
                shortForm: 'SUST',
                category: 'Science & Technology',
                clusterGroup: 'GST Mega Cluster',
                logoUrl: buildDataLogo('SUST', '#ea580c'),
                featured: true,
                featuredOrder: 4,
                examCenters: gstCenters,
            },
            {
                name: 'Hajee Mohammad Danesh Science & Technology University',
                shortForm: 'HSTU',
                category: 'Science & Technology',
                clusterGroup: 'GST Mega Cluster',
                examCenters: gstCenters,
            },
            {
                name: 'University of Dhaka',
                shortForm: 'DU',
                category: 'Individual Admission',
                clusterGroup: 'Dhaka Metro',
                logoUrl: buildDataLogo('DU', '#be123c'),
                featured: true,
                featuredOrder: 5,
                applicationEndDate: nowPlusDays(8),
                scienceExamDate: nowPlusDays(16).toISOString(),
                examCenters: normalizeExamCenters('Dhaka - Curzon Hall'),
            },
            {
                name: 'Jahangirnagar University',
                shortForm: 'JU',
                category: 'Individual Admission',
                clusterGroup: 'Dhaka Metro',
                applicationEndDate: nowPlusDays(10),
                scienceExamDate: nowPlusDays(19).toISOString(),
                examCenters: normalizeExamCenters('Savar - JU Main Campus'),
            },
            {
                name: 'Dhaka Medical College',
                shortForm: 'DMC',
                category: 'Medical College',
                clusterGroup: 'Medical Combined',
                applicationEndDate: nowPlusDays(6),
                scienceExamDate: nowPlusDays(11).toISOString(),
                examCenters: medicalCenters,
            },
            {
                name: 'Chittagong Medical College',
                shortForm: 'CMC',
                category: 'Medical College',
                clusterGroup: 'Medical Combined',
                applicationEndDate: nowPlusDays(7),
                scienceExamDate: nowPlusDays(12).toISOString(),
                examCenters: medicalCenters,
            },
            {
                name: 'Open QA Long Name University for Advanced Science and Interdisciplinary Engineering Studies',
                shortForm: 'OQLNAIES-2026',
                category: 'Science & Technology',
                logoUrl: '',
                applicationEndDate: nowPlusDays(15),
                scienceExamDate: nowPlusDays(22).toISOString(),
                examCenters: normalizeExamCenters('Dhaka - QA North Campus'),
            },
            {
                name: 'Open QA Broken Logo University',
                shortForm: 'OBLU',
                category: 'Science & Technology',
                logoUrl: 'https://broken.local/logo-does-not-exist.png',
                applicationEndDate: nowPlusDays(14),
                scienceExamDate: nowPlusDays(20).toISOString(),
                examCenters: normalizeExamCenters('Khulna - QA South Campus'),
            },
            {
                name: 'Open QA No Short Name Institute',
                shortForm: 'NOSHORT',
                rawShortForm: '',
                category: 'Individual Admission',
                logoUrl: '',
                applicationEndDate: nowPlusDays(13),
                scienceExamDate: nowPlusDays(21).toISOString(),
            },
            {
                name: 'Open QA No Deadline University',
                shortForm: 'NODL',
                category: 'GST (General/Public)',
                applicationEndDate: null,
                scienceExamDate: nowPlusDays(24).toISOString(),
                examCenters: normalizeExamCenters('Sylhet - QA East Campus'),
            },
            {
                name: 'Open QA Expired Deadline University',
                shortForm: 'EXDL',
                category: 'GST (General/Public)',
                applicationStartDate: nowPlusDays(-30),
                applicationEndDate: nowPlusDays(-2),
                scienceExamDate: nowPlusDays(2).toISOString(),
            },
            {
                name: 'Open QA Passed Exam University',
                shortForm: 'PSEXM',
                category: 'Science & Technology',
                applicationStartDate: nowPlusDays(-20),
                applicationEndDate: nowPlusDays(5),
                scienceExamDate: nowPlusDays(-1).toISOString(),
            },
            {
                name: 'Open QA Invalid Link University',
                shortForm: 'BADLINK',
                category: 'Science & Technology',
                website: 'not-a-valid-url',
                admissionWebsite: 'invalid-link',
                applicationEndDate: nowPlusDays(17),
                scienceExamDate: nowPlusDays(27).toISOString(),
            },
        ];

        for (const seed of universities) {
            fixtureIds.push(await upsertUniversity(seed));
        }

        const clusterSeeds = [
            {
                name: 'Engineering Alliance',
                description: 'Shared timeline and centers for engineering-focused admissions.',
                homeVisible: true,
                homeOrder: 1,
                members: [
                    'Bangladesh University of Engineering and Technology',
                    'Rajshahi University of Engineering & Technology',
                    'Khulna University of Engineering & Technology',
                    'Chittagong University of Engineering & Technology',
                    'Dhaka University of Engineering & Technology',
                    'Islamic University of Technology',
                ],
                dates: {
                    applicationStartDate: nowPlusDays(-10),
                    applicationEndDate: nowPlusDays(12),
                    scienceExamDate: nowPlusDays(20).toISOString(),
                    artsExamDate: '',
                    businessExamDate: '',
                    examCenters: engineeringCenters,
                },
            },
            {
                name: 'GST Mega Cluster',
                description: 'General science and technology universities managed together.',
                homeVisible: true,
                homeOrder: 2,
                members: [
                    'Shahjalal University of Science and Technology',
                    'Hajee Mohammad Danesh Science & Technology University',
                ],
                dates: {
                    applicationStartDate: nowPlusDays(-6),
                    applicationEndDate: nowPlusDays(9),
                    scienceExamDate: nowPlusDays(14).toISOString(),
                    artsExamDate: '',
                    businessExamDate: '',
                    examCenters: gstCenters,
                },
            },
            {
                name: 'Dhaka Metro',
                description: 'Universities with Dhaka-focused application flows.',
                homeVisible: true,
                homeOrder: 3,
                members: [
                    'University of Dhaka',
                    'Jahangirnagar University',
                ],
                dates: {
                    applicationStartDate: nowPlusDays(-9),
                    applicationEndDate: nowPlusDays(8),
                    scienceExamDate: nowPlusDays(16).toISOString(),
                    artsExamDate: nowPlusDays(17).toISOString(),
                    businessExamDate: nowPlusDays(18).toISOString(),
                    examCenters: normalizeExamCenters('Dhaka - Curzon Hall | Savar - JU Campus'),
                },
            },
            {
                name: 'Medical Combined',
                description: 'Medical college cluster preview for home cards and route tests.',
                homeVisible: true,
                homeOrder: 4,
                members: [
                    'Dhaka Medical College',
                    'Chittagong Medical College',
                ],
                dates: {
                    applicationStartDate: nowPlusDays(-5),
                    applicationEndDate: nowPlusDays(6),
                    scienceExamDate: nowPlusDays(11).toISOString(),
                    artsExamDate: '',
                    businessExamDate: '',
                    examCenters: medicalCenters,
                },
            },
            {
                name: 'Open QA Empty Cluster',
                description: 'Cluster without universities for empty-state validation.',
                homeVisible: false,
                homeOrder: 99,
                members: [],
                dates: {
                    applicationStartDate: nowPlusDays(-3),
                    applicationEndDate: nowPlusDays(30),
                    scienceExamDate: nowPlusDays(40).toISOString(),
                    artsExamDate: '',
                    businessExamDate: '',
                    examCenters: [],
                },
            },
        ];

        const clusterIdsByName = new Map<string, mongoose.Types.ObjectId>();

        for (const seed of clusterSeeds) {
            const ensured = await ensureUniversityClusterByName(seed.name);
            clusterIdsByName.set(seed.name, ensured._id);

            await UniversityCluster.findByIdAndUpdate(
                ensured._id,
                {
                    $set: {
                        description: seed.description,
                        isActive: true,
                        homeVisible: seed.homeVisible,
                        homeOrder: seed.homeOrder,
                        dates: seed.dates,
                        updatedBy: adminId,
                    },
                    $setOnInsert: { createdBy: adminId },
                },
                { new: true, upsert: true },
            );

            const memberIds = await University.find({ name: { $in: seed.members } }).distinct('_id');
            await syncManualClusterMembership(memberIds as mongoose.Types.ObjectId[], String(ensured._id));

            if (memberIds.length > 0) {
                await University.updateMany(
                    { _id: { $in: memberIds } },
                    {
                        $set: {
                            clusterId: ensured._id,
                            clusterName: seed.name,
                            clusterGroup: seed.name,
                        },
                    },
                );
            }

            await syncUniversityClusterSharedConfig(String(ensured._id), adminId ? String(adminId) : null);
        }

        await reconcileUniversityClusterAssignments(adminId ? String(adminId) : null);

        const featuredUniversities = await University.find({ slug: { $in: [
            'bangladesh-university-of-engineering-and-technology',
            'rajshahi-university-of-engineering-technology',
            'khulna-university-of-engineering-technology',
            'shahjalal-university-of-science-and-technology',
            'university-of-dhaka',
        ] } })
            .sort({ featuredOrder: 1, name: 1 })
            .select('_id slug')
            .lean();

        const homeDefaults = createHomeSettingsDefaults();
        await HomeSettings.findOneAndUpdate(
            {},
            {
                $set: {
                    'sectionVisibility.universityDashboard': true,
                    'sectionVisibility.closingExamWidget': true,
                    'sectionVisibility.examsWidget': true,
                    'universityDashboard.showAllCategories': true,
                    'universityDashboard.defaultCategory': 'Science & Technology',
                    'universityPreview.useHighlightedCategoriesOnly': false,
                    'universityPreview.defaultActiveCategory': 'Science & Technology',
                    'universityPreview.enableClusterFilter': true,
                    'universityPreview.featuredMode': 'manual',
                    'universityPreview.maxFeaturedItems': 10,
                    'universityPreview.maxDeadlineItems': 8,
                    'universityPreview.maxExamItems': 8,
                    'universityPreview.deadlineWithinDays': 45,
                    'universityPreview.examWithinDays': 45,
                    highlightedCategories: highlightedCategories.map((category, index) => ({
                        category,
                        order: index + 1,
                        enabled: true,
                        badgeText: index === 0 ? 'Popular' : '',
                    })),
                    featuredUniversities: featuredUniversities.map((item, index) => ({
                        universityId: String(item._id),
                        order: index + 1,
                        badgeText: index === 0 ? 'Top' : '',
                        enabled: true,
                    })),
                    ...(SHOULD_OVERRIDE_HOME_HERO ? {
                        hero: {
                            ...homeDefaults.hero,
                            pillText: 'CampusWay Universities QA',
                            title: 'Open Universities Audit Dataset',
                            subtitle: 'Cluster cards, featured universities, deadlines, and edge-case fixtures are active for QA.',
                            showSearch: true,
                            searchPlaceholder: 'Search universities, exams, news...',
                            primaryCTA: { label: 'Explore Universities', url: '/universities' },
                            secondaryCTA: { label: 'View Featured Clusters', url: '/universities' },
                        },
                    } : {}),
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        await UniversitySettings.findOneAndUpdate(
            {},
            {
                $set: {
                    defaultCategory: 'Science & Technology',
                    highlightedCategories,
                    enableClusterFilterOnHome: true,
                    enableClusterFilterOnUniversities: true,
                    featuredUniversitySlugs: featuredUniversities.map((item) => String(item.slug || '')),
                    maxFeaturedItems: 10,
                    allowCustomCategories: true,
                    lastEditedByAdminId: adminId ? String(adminId) : '',
                },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        const summary = {
            ok: true,
            fixtures: fixtureIds.length,
            clusters: clusterSeeds.length,
            highlightedCategories,
            featuredUniversities: featuredUniversities.map((item) => String(item.slug || '')),
        };

        // eslint-disable-next-line no-console
        console.log(JSON.stringify(summary, null, 2));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[e2e_prepare_open_universities] failed', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

void run();
