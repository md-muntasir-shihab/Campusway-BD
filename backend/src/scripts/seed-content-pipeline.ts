import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import slugify from 'slugify';
import { connectDB } from '../config/db';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import SubscriptionPlan from '../models/SubscriptionPlan';
import UserSubscription from '../models/UserSubscription';
import University from '../models/University';
import UniversityCategory from '../models/UniversityCategory';
import UniversitySettings from '../models/UniversitySettings';
import HomeSettings from '../models/HomeSettings';
import WebsiteSettings from '../models/WebsiteSettings';
import SiteSettings from '../models/Settings';
import Banner from '../models/Banner';
import News from '../models/News';
import NewsSource from '../models/NewsSource';
import NewsFetchJob from '../models/NewsFetchJob';
import NewsAuditEvent from '../models/NewsAuditEvent';
import Resource from '../models/Resource';
import Exam from '../models/Exam';
import Question from '../models/Question';
import ExamResult from '../models/ExamResult';
import ExamSession from '../models/ExamSession';
import Notification from '../models/Notification';
import AnnouncementNotice from '../models/AnnouncementNotice';
import SupportTicket from '../models/SupportTicket';
import ManualPayment from '../models/ManualPayment';
import StudentDueLedger from '../models/StudentDueLedger';
import StudentDashboardConfig from '../models/StudentDashboardConfig';
import ExpenseEntry from '../models/ExpenseEntry';
import AuditLog from '../models/AuditLog';
import ActionApproval from '../models/ActionApproval';
import Badge from '../models/Badge';
import StudentBadge from '../models/StudentBadge';
import {
    UNIVERSITY_CATEGORY_ORDER,
    normalizeUniversityCategoryStrict,
} from '../utils/universityCategories';
import { resolvePermissions } from '../utils/permissions';

dotenv.config();

const DAY_MS = 24 * 60 * 60 * 1000;
const PLACEHOLDER_BANNER = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085';
const PLACEHOLDER_NEWS = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c';
const PLACEHOLDER_RESOURCE = 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173';
const SEEDED_PUBLIC_CONTACT_EMAIL = String(process.env.SEED_PUBLIC_CONTACT_EMAIL || '').trim();
const SEEDED_PUBLIC_CONTACT_PHONE = String(process.env.SEED_PUBLIC_CONTACT_PHONE || '').trim();
const SEEDED_PUBLIC_SOCIAL_LINKS = {
    facebook: String(process.env.SEED_PUBLIC_FACEBOOK_URL || '').trim(),
    whatsapp: String(process.env.SEED_PUBLIC_WHATSAPP_URL || '').trim(),
    messenger: String(process.env.SEED_PUBLIC_MESSENGER_URL || '').trim(),
    telegram: String(process.env.SEED_PUBLIC_TELEGRAM_URL || '').trim(),
    twitter: String(process.env.SEED_PUBLIC_TWITTER_URL || '').trim(),
    youtube: String(process.env.SEED_PUBLIC_YOUTUBE_URL || '').trim(),
    instagram: String(process.env.SEED_PUBLIC_INSTAGRAM_URL || '').trim(),
};

type SeedContentPipelineOptions = {
    runLabel?: string;
};

type SeedContentPipelineResult = {
    ok: true;
    runLabel: string;
    users: {
        admins: number;
        students: number;
    };
    seeded: {
        categories: number;
        universities: number;
        plans: number;
        banners: number;
        newsSources: number;
        news: number;
        newsAuditEvents: number;
        resources: number;
        exams: number;
        questions: number;
        newsJobs: number;
        approvals: number;
        notifications: number;
        notices: number;
        supportTickets: number;
        payments: number;
        expenses: number;
        auditLogs: number;
        badges: number;
    };
};

type SeedUserLite = {
    _id: mongoose.Types.ObjectId;
    email: string;
    username: string;
    full_name: string;
    role: string;
    subscription?: {
        plan?: string;
        planCode?: string;
        planName?: string;
        isActive?: boolean;
        startDate?: Date;
        expiryDate?: Date;
        assignedAt?: Date;
    };
};

function deterministicPhone(seed: string, suffix = 0): string {
    const normalized = `${seed}:${suffix}`.toLowerCase();
    let hash = 0;
    for (const char of normalized) {
        hash = (hash * 33 + char.charCodeAt(0)) % 1_000_000_000;
    }
    return `01${String(hash).padStart(9, '0')}`.slice(0, 11);
}

function toSlug(value: string): string {
    return slugify(String(value || '').trim(), { lower: true, strict: true });
}

function buildReachableExampleUrl(slug: string, kind: 'website' | 'admission'): string {
    const safeSlug = encodeURIComponent(slug);
    return kind === 'admission'
        ? `https://example.com/admission/${safeSlug}`
        : `https://example.com/universities/${safeSlug}`;
}

function buildSeededPublicSocialList(): Array<{
    platform: string;
    url: string;
    description: string;
    enabled: boolean;
    placements: Array<'header' | 'footer' | 'home' | 'news' | 'contact'>;
}> {
    const placements: Array<'header' | 'footer' | 'home' | 'news' | 'contact'> = ['header', 'footer', 'home', 'news', 'contact'];

    return [
        {
            platform: 'whatsapp',
            url: SEEDED_PUBLIC_SOCIAL_LINKS.whatsapp,
            description: 'WhatsApp support',
            enabled: true,
            placements,
        },
        {
            platform: 'facebook',
            url: SEEDED_PUBLIC_SOCIAL_LINKS.facebook,
            description: 'Official Facebook page',
            enabled: true,
            placements,
        },
        {
            platform: 'telegram',
            url: SEEDED_PUBLIC_SOCIAL_LINKS.telegram,
            description: 'Telegram community',
            enabled: true,
            placements,
        },
    ].filter((item) => Boolean(item.url));
}

function nowPlusDays(days: number): Date {
    return new Date(Date.now() + days * DAY_MS);
}

function ensureObjectId(value: unknown): mongoose.Types.ObjectId {
    return value instanceof mongoose.Types.ObjectId
        ? value
        : new mongoose.Types.ObjectId(String(value));
}

function equalsIgnoreCase(a: string, b: string): boolean {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

async function ensureFallbackUsers(): Promise<{
    admins: SeedUserLite[];
    students: SeedUserLite[];
}> {
    const adminCount = await User.countDocuments({ role: { $in: ['superadmin', 'admin'] } });
    const studentCount = await User.countDocuments({ role: 'student' });

    if (adminCount === 0) {
        const email = String(process.env.DEFAULT_ADMIN_EMAIL || 'admin@campusway.com').toLowerCase();
        const username = String(process.env.DEFAULT_ADMIN_USERNAME || 'campusway_admin').toLowerCase();
        const password = String(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456');
        const hashedPassword = await bcrypt.hash(password, 12);
        await User.findOneAndUpdate(
            { email },
            {
                $set: {
                    full_name: 'Super Admin',
                    email,
                    username,
                    password: hashedPassword,
                    role: 'superadmin',
                    status: 'active',
                    permissions: resolvePermissions('superadmin'),
                    mustChangePassword: false,
                    twoFactorEnabled: false,
                    two_factor_method: null,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
    }

    if (studentCount === 0) {
        const email = String(process.env.DEFAULT_STUDENT_EMAIL || 'student@campusway.com').toLowerCase();
        const username = String(process.env.DEFAULT_STUDENT_USERNAME || 'campusway_student').toLowerCase();
        const password = String(process.env.DEFAULT_STUDENT_PASSWORD || 'student123456');
        const hashedPassword = await bcrypt.hash(password, 12);
        const now = new Date();
        const expiry = nowPlusDays(365);
        const student = await User.findOneAndUpdate(
            { email },
            {
                $set: {
                    full_name: 'Test Student',
                    email,
                    username,
                    password: hashedPassword,
                    role: 'student',
                    status: 'active',
                    permissions: resolvePermissions('student'),
                    mustChangePassword: false,
                    twoFactorEnabled: false,
                    two_factor_method: null,
                    subscription: {
                        plan: 'demo',
                        planCode: 'demo',
                        planName: 'Demo Plan',
                        isActive: true,
                        startDate: now,
                        expiryDate: expiry,
                        assignedAt: now,
                    },
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );

        await StudentProfile.findOneAndUpdate(
            { user_id: student._id },
            {
                $set: {
                    user_id: student._id,
                    full_name: 'Test Student',
                    username,
                    email,
                    department: 'science',
                    ssc_batch: '2022',
                    hsc_batch: '2024',
                    college_name: 'CampusWay Demo College',
                    college_address: 'Dhaka',
                    phone_number: deterministicPhone(email, 1),
                    guardian_phone: deterministicPhone(email, 2),
                    guardianPhoneVerificationStatus: 'verified',
                    guardianPhoneVerifiedAt: now,
                    profile_completion_percentage: 100,
                    points: 1000,
                    rank: 1,
                },
            },
            { upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
    }

    const [admins, students] = await Promise.all([
        User.find({ role: { $in: ['superadmin', 'admin'] }, status: { $ne: 'blocked' } })
            .select('_id email username full_name role subscription')
            .sort({ createdAt: 1 })
            .lean<SeedUserLite[]>(),
        User.find({ role: 'student', status: { $ne: 'blocked' } })
            .select('_id email username full_name role subscription')
            .sort({ createdAt: 1 })
            .lean<SeedUserLite[]>(),
    ]);

    return { admins, students };
}

async function ensureStudentProfiles(students: SeedUserLite[]): Promise<void> {
    await Promise.all(students.map(async (student, index) => {
        const phone = deterministicPhone(student.email || student.username, index + 11);
        const guardianPhone = deterministicPhone(student.email || student.username, index + 311);
        await StudentProfile.findOneAndUpdate(
            { user_id: student._id },
            {
                $set: {
                    full_name: student.full_name || student.username || `Student ${index + 1}`,
                    username: student.username,
                    email: student.email,
                    phone_number: phone,
                    guardian_phone: guardianPhone,
                    guardianPhoneVerificationStatus: 'verified',
                    guardianPhoneVerifiedAt: new Date(),
                    department: index % 3 === 0 ? 'science' : index % 3 === 1 ? 'commerce' : 'arts',
                    ssc_batch: String(2020 + (index % 4)),
                    hsc_batch: String(2022 + (index % 4)),
                    college_name: index % 2 === 0 ? 'Dhaka City College' : 'Rajshahi College',
                    college_address: index % 2 === 0 ? 'Dhaka' : 'Rajshahi',
                    profile_completion_percentage: 100,
                    points: Math.max(200, 1200 - index * 120),
                    rank: index + 1,
                },
            },
            { upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
    }));
}

export async function seedContentPipeline(
    options: SeedContentPipelineOptions = {},
): Promise<SeedContentPipelineResult> {
    const runLabel = String(options.runLabel || 'default').trim() || 'default';
    const now = new Date();

    const { admins, students } = await ensureFallbackUsers();
    if (!admins.length) {
        throw new Error('No admin user available for seeding.');
    }
    if (!students.length) {
        throw new Error('No student user available for seeding.');
    }

    await ensureStudentProfiles(students);

    const preferredPrimaryStudentEmail = String(
        process.env.E2E_STUDENT_DESKTOP_EMAIL
        || process.env.DEFAULT_STUDENT_EMAIL
        || '',
    );
    const preferredPrimaryAdminEmail = String(
        process.env.E2E_ADMIN_DESKTOP_EMAIL
        || process.env.DEFAULT_ADMIN_EMAIL
        || '',
    );
    const preferredSecondaryStudentEmail = String(
        process.env.E2E_STUDENT_MOBILE_EMAIL
        || process.env.DEFAULT_STUDENT_SECONDARY_EMAIL
        || '',
    );

    const primaryAdmin =
        admins.find((admin) => equalsIgnoreCase(admin.email, preferredPrimaryAdminEmail))
        || admins.find((admin) => String(admin.role || '').toLowerCase() === 'superadmin')
        || admins[0];
    const primaryStudent = students.find((student) => equalsIgnoreCase(student.email, preferredPrimaryStudentEmail)) || students[0];
    const secondaryStudent =
        students.find((student) => equalsIgnoreCase(student.email, preferredSecondaryStudentEmail))
        || students.find((student) => String(student._id) !== String(primaryStudent._id))
        || primaryStudent;
    const primaryAdminId = ensureObjectId(primaryAdmin._id);
    const primaryStudentId = ensureObjectId(primaryStudent._id);
    const secondaryStudentId = ensureObjectId(secondaryStudent._id);

    const categoryDocs = await Promise.all(UNIVERSITY_CATEGORY_ORDER.map(async (name, index) => {
        const slug = toSlug(name);
        try {
            return await UniversityCategory.findOneAndUpdate(
                { name },
                {
                    $set: {
                        name,
                        slug,
                        labelEn: name,
                        labelBn: '',
                        colorToken: '',
                        icon: '',
                        isActive: true,
                        homeHighlight: index < 4,
                        homeOrder: index + 1,
                        updatedBy: primaryAdminId,
                    },
                    $setOnInsert: { createdBy: primaryAdminId },
                },
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
            );
        } catch (err: unknown) {
            const e = err as { code?: number };
            if (e.code === 11000) {
                return UniversityCategory.findOne({ name });
            }
            throw err;
        }
    }));
    const categoryIdByName = new Map<string, mongoose.Types.ObjectId>(
        categoryDocs
            .filter((doc): doc is NonNullable<typeof doc> => Boolean(doc))
            .map((doc) => [doc.name, ensureObjectId(doc._id)]),
    );

    const planSeeds: Array<Record<string, unknown>> = [
        {
            code: 'demo',
            name: 'Demo Plan',
            type: 'free',
            priceBDT: 0,
            durationDays: 365,
            durationValue: 12,
            durationUnit: 'months',
            shortDescription: 'Basic access for platform familiarization.',
            description: 'Free starter plan with selected resources and sample exams.',
            features: ['Public resources', 'Selected mock exams', 'Basic dashboard'],
            includedModules: ['dashboard', 'resources', 'news'],
            tags: ['starter', 'free'],
            enabled: true,
            isActive: true,
            isFeatured: true,
            displayOrder: 1,
            priority: 1,
            sortOrder: 1,
            contactCtaLabel: 'Start Free',
            contactCtaUrl: '/register',
            bannerImageUrl: PLACEHOLDER_BANNER,
        },
        {
            code: 'admission-pro',
            name: 'Admission Pro',
            type: 'paid',
            priceBDT: 799,
            durationDays: 30,
            durationValue: 1,
            durationUnit: 'months',
            shortDescription: 'For serious admission candidates.',
            description: 'Unlock all live exams, advanced analytics, and priority support.',
            features: ['All exam access', 'Detailed analytics', 'Priority support'],
            includedModules: ['dashboard', 'exam_portal', 'results', 'resources', 'support'],
            tags: ['popular', 'premium'],
            enabled: true,
            isActive: true,
            isFeatured: true,
            displayOrder: 2,
            priority: 2,
            sortOrder: 2,
            contactCtaLabel: 'Subscribe Now',
            contactCtaUrl: '/contact',
            bannerImageUrl: PLACEHOLDER_BANNER,
        },
        {
            code: 'medical-elite',
            name: 'Medical Elite',
            type: 'paid',
            priceBDT: 1199,
            durationDays: 30,
            durationValue: 1,
            durationUnit: 'months',
            shortDescription: 'Specialized plan for medical admission prep.',
            description: 'Medical-focused question sets, mock tests, and deep result insights.',
            features: ['Medical-only content', 'Exam simulations', 'Mentor guidance'],
            includedModules: ['dashboard', 'exam_portal', 'results', 'medical_resources'],
            tags: ['medical'],
            enabled: true,
            isActive: true,
            isFeatured: false,
            displayOrder: 3,
            priority: 3,
            sortOrder: 3,
            contactCtaLabel: 'Contact for Enrollment',
            contactCtaUrl: '/contact',
            bannerImageUrl: PLACEHOLDER_BANNER,
        },
    ];

    const planDocs = await Promise.all(planSeeds.map(async (seed) => {
        const normalizedCode = toSlug(String(seed.code || seed.name || 'plan'));
        const normalizedSlug = toSlug(String(seed.slug || seed.code || seed.name || 'plan'));
        return SubscriptionPlan.findOneAndUpdate(
            { code: normalizedCode },
            {
                $set: {
                    ...seed,
                    code: normalizedCode,
                    slug: normalizedSlug,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
    }));
    const planByCode = new Map<string, Record<string, unknown>>(
        planDocs.map((doc) => [String(doc.code), doc.toObject() as unknown as Record<string, unknown>]),
    );
    const admissionPro = planByCode.get('admission-pro');
    const demoPlan = planByCode.get('demo');

    const usersToActivate = students.map((student, index) => ({
        student,
        planCode: index === 0 ? 'admission-pro' : 'demo',
    }));
    await Promise.all(usersToActivate.map(async ({ student, planCode }) => {
        const plan = planByCode.get(planCode) || admissionPro || demoPlan;
        if (!plan) return;
        const startAt = now;
        const expiresAt = nowPlusDays(Number(plan.durationDays || 30));
        await UserSubscription.findOneAndUpdate(
            {
                userId: ensureObjectId(student._id),
                planId: ensureObjectId(plan._id),
            },
            {
                $set: {
                    status: 'active',
                    startAtUTC: startAt,
                    expiresAtUTC: expiresAt,
                    activatedByAdminId: primaryAdminId,
                    notes: `Seeded by content pipeline (${runLabel})`,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );

        await User.findByIdAndUpdate(student._id, {
            $set: {
                subscription: {
                    plan: String(plan.code || ''),
                    planCode: String(plan.code || ''),
                    planName: String(plan.name || ''),
                    isActive: true,
                    startDate: startAt,
                    expiryDate: expiresAt,
                    assignedBy: primaryAdminId,
                    assignedAt: new Date(),
                },
            },
        });
    }));

    const universitySeeds: Array<Record<string, unknown>> = [
        {
            name: 'University of Dhaka',
            shortForm: 'DU',
            category: 'Individual Admission',
            clusterGroup: 'Dhaka Metro',
            featured: true,
            featuredOrder: 1,
            established: 1921,
            address: 'Shahbag, Dhaka',
        },
        {
            name: 'Jahangirnagar University',
            shortForm: 'JU',
            category: 'Individual Admission',
            clusterGroup: 'Dhaka Metro',
            featured: true,
            featuredOrder: 2,
            established: 1970,
            address: 'Savar, Dhaka',
        },
        {
            name: 'Rajshahi University of Engineering & Technology',
            shortForm: 'RUET',
            category: 'Science & Technology',
            featured: true,
            featuredOrder: 3,
            established: 1964,
            address: 'Kazla, Rajshahi',
        },
        {
            name: 'Bangladesh University of Engineering and Technology',
            shortForm: 'BUET',
            category: 'Science & Technology',
            featured: true,
            featuredOrder: 4,
            established: 1962,
            address: 'Palashi, Dhaka',
        },
        {
            name: 'Khulna University of Engineering & Technology',
            shortForm: 'KUET',
            category: 'Science & Technology',
            featured: true,
            featuredOrder: 5,
            established: 1974,
            address: 'Fulbarigate, Khulna',
        },
        {
            name: 'Chittagong University of Engineering & Technology',
            shortForm: 'CUET',
            category: 'Science & Technology',
            featured: true,
            featuredOrder: 6,
            established: 1968,
            address: 'Raozan, Chattogram',
        },
        {
            name: 'Shahjalal University of Science and Technology',
            shortForm: 'SUST',
            category: 'Science & Technology',
            featured: false,
            featuredOrder: 22,
            established: 1986,
            address: 'Kumargaon, Sylhet',
        },
        {
            name: 'Dhaka University of Engineering & Technology',
            shortForm: 'DUET',
            category: 'Science & Technology',
            featured: false,
            featuredOrder: 23,
            established: 1980,
            address: 'Gazipur',
        },
        {
            name: 'Islamic University of Technology',
            shortForm: 'IUT',
            category: 'Science & Technology',
            featured: false,
            featuredOrder: 24,
            established: 1981,
            address: 'Board Bazar, Gazipur',
        },
        {
            name: 'Hajee Mohammad Danesh Science & Technology University',
            shortForm: 'HSTU',
            category: 'Science & Technology',
            featured: false,
            featuredOrder: 25,
            established: 1999,
            address: 'Dinajpur',
        },
        {
            name: 'Khulna University',
            shortForm: 'KU',
            category: 'GST (General/Public)',
            clusterGroup: 'GST Cluster',
            featured: true,
            featuredOrder: 7,
            established: 1991,
            address: 'Khulna',
        },
        {
            name: 'Mymensingh Medical College',
            shortForm: 'MMC',
            category: 'Medical College',
            clusterGroup: 'Medical',
            featured: false,
            featuredOrder: 20,
            established: 1924,
            address: 'Mymensingh',
        },
        {
            name: 'Bangladesh Agricultural University',
            shortForm: 'BAU',
            category: 'AGRI Cluster',
            clusterGroup: 'Agri',
            featured: false,
            featuredOrder: 21,
            established: 1961,
            address: 'Mymensingh',
        },
    ];

    const universityDocs = await Promise.all(universitySeeds.map(async (seed, index) => {
        const categoryName = normalizeUniversityCategoryStrict(seed.category);
        const slug = toSlug(String(seed.name));
        const startDate = nowPlusDays(-7 + index);
        const endDate = nowPlusDays(10 + index * 2);
        const examScience = nowPlusDays(15 + index * 2).toISOString();
        const examArts = nowPlusDays(16 + index * 2).toISOString();
        const examBusiness = nowPlusDays(17 + index * 2).toISOString();
        const record = await University.findOneAndUpdate(
            { slug },
            {
                $set: {
                    name: String(seed.name),
                    shortForm: String(seed.shortForm),
                    category: categoryName,
                    categoryId: categoryIdByName.get(categoryName) || null,
                    established: Number(seed.established || 2000),
                    establishedYear: Number(seed.established || 2000),
                    address: String(seed.address || 'Dhaka'),
                    contactNumber: '+8801711000000',
                    email: `${slug}@campusway.local`,
                    website: buildReachableExampleUrl(slug, 'website'),
                    websiteUrl: buildReachableExampleUrl(slug, 'website'),
                    admissionWebsite: buildReachableExampleUrl(slug, 'admission'),
                    admissionUrl: buildReachableExampleUrl(slug, 'admission'),
                    totalSeats: String(1200 + index * 100),
                    scienceSeats: String(500 + index * 50),
                    artsSeats: String(350 + index * 30),
                    businessSeats: String(300 + index * 20),
                    seatsScienceEng: String(500 + index * 50),
                    seatsArtsHum: String(350 + index * 30),
                    seatsBusiness: String(300 + index * 20),
                    shortDescription: `${seed.shortForm} admission profile and deadlines`,
                    description: `${seed.name} admission information, exam schedules, and seat breakdown.`,
                    clusterGroup: String(seed.clusterGroup || ''),
                    applicationStartDate: startDate,
                    applicationEndDate: endDate,
                    applicationStart: startDate,
                    applicationEnd: endDate,
                    scienceExamDate: examScience,
                    examDateScience: examScience,
                    artsExamDate: examArts,
                    examDateArts: examArts,
                    businessExamDate: examBusiness,
                    examDateBusiness: examBusiness,
                    featured: Boolean(seed.featured),
                    featuredOrder: Number(seed.featuredOrder || 0),
                    isActive: true,
                    isArchived: false,
                    archivedAt: null,
                    archivedBy: null,
                    logoUrl: '',
                    unitLayout: 'compact',
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
        return record;
    }));

    const featuredUniversityDocs = universityDocs
        .filter((row) => Boolean(row.featured))
        .sort((a, b) => Number(a.featuredOrder || 0) - Number(b.featuredOrder || 0));

    await HomeSettings.findOneAndUpdate(
        {},
        {
            $set: {
                'universityDashboard.defaultCategory': 'Individual Admission',
                'universityDashboard.showAllCategories': true,
                'universityPreview.defaultActiveCategory': 'Individual Admission',
                'universityPreview.useHighlightedCategoriesOnly': false,
                'universityPreview.featuredMode': 'manual',
                'universityPreview.maxFeaturedItems': 12,
                highlightedCategories: UNIVERSITY_CATEGORY_ORDER.slice(0, 4).map((category, index) => ({
                    category,
                    order: index + 1,
                    enabled: true,
                    badgeText: index === 0 ? 'Popular' : '',
                })),
                featuredUniversities: featuredUniversityDocs.map((item, index) => ({
                    universityId: String(item._id),
                    order: index + 1,
                    badgeText: index === 0 ? 'Top' : '',
                    enabled: true,
                })),
                'subscriptionBanner.showPlanCards': true,
                'subscriptionBanner.planIdsToShow': planDocs.map((plan) => String(plan._id)),
                'hero.primaryCTA': { label: 'Explore Universities', url: '/universities' },
                'hero.secondaryCTA': { label: 'View Exams', url: '/exam-portal' },
                'newsPreview.maxItems': 6,
                'resourcesPreview.maxItems': 6,
                'sectionVisibility.newsPreview': true,
                'sectionVisibility.resourcesPreview': true,
                'sectionVisibility.universityDashboard': true,
                'sectionVisibility.examsWidget': true,
                'ui.animationLevel': 'normal',
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    await UniversitySettings.findOneAndUpdate(
        {},
        {
            $set: {
                categoryOrder: [...UNIVERSITY_CATEGORY_ORDER],
                highlightedCategories: UNIVERSITY_CATEGORY_ORDER.slice(0, 4),
                defaultCategory: 'Individual Admission',
                featuredUniversitySlugs: featuredUniversityDocs.map((item) => String(item.slug || '')),
                maxFeaturedItems: 12,
                enableClusterFilterOnHome: true,
                enableClusterFilterOnUniversities: true,
                allowCustomCategories: false,
                lastEditedByAdminId: String(primaryAdminId),
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    await WebsiteSettings.findOneAndUpdate(
        {},
        {
            $set: {
                websiteName: 'CampusWay',
                motto: 'Admission prep and live updates in one place',
                contactEmail: SEEDED_PUBLIC_CONTACT_EMAIL,
                contactPhone: SEEDED_PUBLIC_CONTACT_PHONE,
                socialLinks: SEEDED_PUBLIC_SOCIAL_LINKS,
                subscriptionPageTitle: 'Subscription Plans',
                subscriptionPageSubtitle: 'Choose a plan and unlock full exam experience.',
                subscriptionDefaultBannerUrl: PLACEHOLDER_BANNER,
                subscriptionLoggedOutCtaMode: 'contact',
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    await SiteSettings.findOneAndUpdate(
        {},
        {
            $set: {
                siteName: 'CampusWay',
                contactEmail: SEEDED_PUBLIC_CONTACT_EMAIL,
                contactPhone: SEEDED_PUBLIC_CONTACT_PHONE,
                socialLinks: buildSeededPublicSocialList(),
                'featureFlags.subscriptionEngineV2': true,
                'featureFlags.studentDashboardV2': true,
                'featureFlags.studentManagementV2': true,
                'featureFlags.pushNotifications': true,
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    const bannerSeeds = [
        { slot: 'top', title: 'Seed Top Banner', order: 1 },
        { slot: 'middle', title: 'Seed Middle Banner', order: 2 },
        { slot: 'footer', title: 'Seed Footer Banner', order: 3 },
        { slot: 'home_ads', title: 'Seed Home Ads Banner', order: 4 },
    ] as const;
    const bannerDocs = await Promise.all(bannerSeeds.map(async (seed) => Banner.findOneAndUpdate(
        { title: seed.title },
        {
            $set: {
                title: seed.title,
                subtitle: 'CampusWay announcement',
                imageUrl: PLACEHOLDER_BANNER,
                mobileImageUrl: PLACEHOLDER_BANNER,
                linkUrl: '/subscription-plans',
                altText: seed.title,
                isActive: true,
                status: 'published',
                slot: seed.slot,
                priority: 100 - seed.order,
                order: seed.order,
                startDate: nowPlusDays(-5),
                endDate: nowPlusDays(90),
                createdBy: primaryAdminId,
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )));

    const sourceSeeds = [
        {
            name: 'CampusWay Official',
            feedUrl: 'https://example.com/campusway-news-rss.xml',
            siteUrl: 'https://example.com',
            categoryDefault: 'Admission',
            tagsDefault: ['admission', 'update'],
            order: 1,
        },
        {
            name: 'Education Updates BD',
            feedUrl: 'https://example.com/edu-updates-rss.xml',
            siteUrl: 'https://example.com/edu',
            categoryDefault: 'General',
            tagsDefault: ['education', 'deadline'],
            order: 2,
        },
    ] as const;
    const sourceDocs = await Promise.all(sourceSeeds.map(async (seed) => NewsSource.findOneAndUpdate(
        { feedUrl: seed.feedUrl },
        {
            $set: {
                name: seed.name,
                feedUrl: seed.feedUrl,
                rssUrl: seed.feedUrl,
                siteUrl: seed.siteUrl,
                iconType: 'url',
                iconUrl: PLACEHOLDER_NEWS,
                enabled: true,
                isActive: true,
                priority: seed.order,
                order: seed.order,
                fetchIntervalMinutes: 30,
                fetchIntervalMin: 30,
                categoryDefault: seed.categoryDefault,
                categoryTags: [seed.categoryDefault],
                tagsDefault: [...seed.tagsDefault],
                maxItemsPerFetch: 20,
                createdBy: primaryAdminId,
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )));

    const newsSeeds = [
        {
            title: 'DU admission circular published for 2026 session',
            category: 'Admission',
            tags: ['du', 'circular'],
            sourceIndex: 0,
        },
        {
            title: 'GST application timeline updated',
            category: 'Admission',
            tags: ['gst', 'timeline'],
            sourceIndex: 0,
        },
        {
            title: 'Medical exam seat plan released',
            category: 'Medical',
            tags: ['medical', 'exam'],
            sourceIndex: 1,
        },
        {
            title: 'New scholarship notice for public university applicants',
            category: 'Scholarship',
            tags: ['scholarship'],
            sourceIndex: 1,
        },
        {
            title: 'CampusWay weekly admission digest',
            category: 'General',
            tags: ['digest'],
            sourceIndex: 0,
        },
    ] as const;

    const newsDocs = await Promise.all(newsSeeds.map(async (seed, index) => {
        const source = sourceDocs[seed.sourceIndex] || sourceDocs[0];
        const slug = toSlug(seed.title);
        const publishDate = nowPlusDays(-index);
        return News.findOneAndUpdate(
            { slug },
            {
                $set: {
                    title: seed.title,
                    slug,
                    shortSummary: `${seed.title} - full details inside.`,
                    shortDescription: `${seed.title} - full details inside.`,
                    fullContent: `<p>${seed.title}. Please follow official instructions and deadlines.</p>`,
                    content: `<p>${seed.title}. Please follow official instructions and deadlines.</p>`,
                    coverImageUrl: PLACEHOLDER_NEWS,
                    coverImage: PLACEHOLDER_NEWS,
                    featuredImage: PLACEHOLDER_NEWS,
                    coverImageSource: 'default',
                    category: seed.category,
                    tags: [...seed.tags],
                    isPublished: true,
                    status: 'published',
                    sourceType: index === 0 ? 'rss' : 'manual',
                    sourceId: source?._id || null,
                    sourceName: String(source?.name || 'CampusWay'),
                    sourceIconUrl: PLACEHOLDER_NEWS,
                    sourceUrl: String(source?.siteUrl || 'https://example.com'),
                    originalArticleUrl: String(source?.siteUrl || 'https://example.com/news'),
                    originalLink: String(source?.siteUrl || 'https://example.com/news'),
                    rssGuid: index === 0 ? `seed-rss-guid-${toSlug(seed.title)}` : '',
                    rssPublishedAt: publishDate,
                    rssRawTitle: seed.title,
                    rssRawDescription: `${seed.title} - RSS source summary.`,
                    rssRawContent: `<p>${seed.title} from RSS source content.</p>`,
                    isManual: index === 0 ? false : true,
                    publishDate,
                    publishedAt: publishDate,
                    isFeatured: index === 0,
                    fallbackBanner: PLACEHOLDER_NEWS,
                    createdBy: primaryAdminId,
                    createdByAdminId: primaryAdminId,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
    }));

    const newsJobDoc = await NewsFetchJob.findOneAndUpdate(
        {
            trigger: 'manual',
            status: 'completed',
        },
        {
            $set: {
                sourceIds: sourceDocs.map((source) => ensureObjectId(source._id)),
                trigger: 'manual',
                status: 'completed',
                startedAt: nowPlusDays(-1),
                endedAt: nowPlusDays(-1),
                fetchedCount: 8,
                createdCount: newsDocs.length,
                duplicateCount: 1,
                failedCount: 0,
                jobErrors: [],
                createdBy: primaryAdminId,
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    const newsAuditEventDocs = await Promise.all([
        NewsAuditEvent.findOneAndUpdate(
            {
                action: 'rss.fetch_now',
                entityType: 'source',
                entityId: sourceDocs[0]?._id ? String(sourceDocs[0]._id) : 'seed-source',
            },
            {
                $set: {
                    actorId: primaryAdminId,
                    action: 'rss.fetch_now',
                    entityType: 'source',
                    entityId: sourceDocs[0]?._id ? String(sourceDocs[0]._id) : 'seed-source',
                    before: {},
                    after: { status: 'completed' },
                    meta: {
                        createdCount: newsDocs.length,
                        duplicateCount: 1,
                    },
                    ip: '127.0.0.1',
                    userAgent: 'seed-content-pipeline',
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
        NewsAuditEvent.findOneAndUpdate(
            {
                action: 'news.publish',
                entityType: 'news',
                entityId: newsDocs[0]?._id ? String(newsDocs[0]._id) : 'seed-news',
            },
            {
                $set: {
                    actorId: primaryAdminId,
                    action: 'news.publish',
                    entityType: 'news',
                    entityId: newsDocs[0]?._id ? String(newsDocs[0]._id) : 'seed-news',
                    before: { status: 'pending_review' },
                    after: { status: 'published' },
                    meta: { reason: 'seeded_content' },
                    ip: '127.0.0.1',
                    userAgent: 'seed-content-pipeline',
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
    ]);

    const resourceSeeds = [
        {
            title: 'Admission Preparation Guide PDF',
            type: 'pdf',
            category: 'Admission',
            fileUrl: 'https://example.com/resources/admission-guide.pdf',
            externalUrl: '',
            isFeatured: true,
        },
        {
            title: 'Physics Short Notes',
            type: 'note',
            category: 'Science',
            fileUrl: '',
            externalUrl: 'https://example.com/resources/physics-notes',
            isFeatured: true,
        },
        {
            title: 'Medical MCQ Practice Set',
            type: 'link',
            category: 'Medical',
            fileUrl: '',
            externalUrl: 'https://example.com/resources/medical-mcq',
            isFeatured: false,
        },
        {
            title: 'Video: University Admission Roadmap',
            type: 'video',
            category: 'General',
            fileUrl: '',
            externalUrl: 'https://example.com/resources/admission-video',
            isFeatured: false,
        },
    ] as const;
    const resourceDocs = await Promise.all(resourceSeeds.map(async (seed, index) => Resource.findOneAndUpdate(
        { title: seed.title },
        {
            $set: {
                title: seed.title,
                description: `${seed.title} for students preparing for upcoming admission.`,
                type: seed.type,
                category: seed.category,
                tags: ['admission', 'campusway', seed.category.toLowerCase()],
                fileUrl: seed.fileUrl || undefined,
                externalUrl: seed.externalUrl || undefined,
                thumbnailUrl: PLACEHOLDER_RESOURCE,
                isPublic: true,
                isFeatured: seed.isFeatured,
                views: 100 + index * 15,
                downloads: 30 + index * 6,
                order: index + 1,
                publishDate: nowPlusDays(-index),
                expiryDate: nowPlusDays(365),
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )));

    const examSeeds = [
        {
            title: 'General Admission Live Mock 01',
            subject: 'General Knowledge',
            group_category: 'Admission',
            startDate: nowPlusDays(-1),
            endDate: nowPlusDays(2),
            resultPublishDate: nowPlusDays(3),
            status: 'live',
            deliveryMode: 'internal',
            externalExamUrl: '',
            allowedPlanCodes: [],
            attemptLimit: 2,
        },
        {
            title: 'HSC Final Prep Challenge',
            subject: 'HSC Mixed',
            group_category: 'HSC',
            startDate: nowPlusDays(2),
            endDate: nowPlusDays(3),
            resultPublishDate: nowPlusDays(4),
            status: 'scheduled',
            deliveryMode: 'internal',
            externalExamUrl: '',
            allowedPlanCodes: ['admission-pro'],
            attemptLimit: 1,
        },
        {
            title: 'External Partner Scholarship Exam',
            subject: 'Scholarship',
            group_category: 'Custom',
            startDate: nowPlusDays(-1),
            endDate: nowPlusDays(5),
            resultPublishDate: nowPlusDays(6),
            status: 'live',
            deliveryMode: 'external_link',
            externalExamUrl: 'https://example.com/external-exam-entry',
            allowedPlanCodes: [],
            attemptLimit: 1,
        },
    ] as const;

    const examDocs = await Promise.all(examSeeds.map(async (seed) => {
        const shareToken = `seed-${toSlug(seed.title)}`;
        const examSlug = toSlug(seed.title) || `exam-${Date.now()}`;
        return Exam.findOneAndUpdate(
            { title: seed.title },
            {
                $set: {
                title: seed.title,
                slug: examSlug,
                subject: seed.subject,
                subjectBn: seed.subject,
                universityNameBn: seed.title,
                group_category: seed.group_category,
                description: `${seed.title} generated by seed pipeline (${runLabel}).`,
                totalQuestions: seed.deliveryMode === 'internal' ? 5 : 0,
                totalMarks: seed.deliveryMode === 'internal' ? 5 : 0,
                duration: 30,
                negativeMarking: false,
                negativeMarkValue: 0,
                randomizeQuestions: false,
                randomizeOptions: false,
                allowBackNavigation: true,
                showQuestionPalette: true,
                showRemainingTime: true,
                autoSubmitOnTimeout: true,
                allowPause: false,
                startDate: seed.startDate,
                endDate: seed.endDate,
                resultPublishDate: seed.resultPublishDate,
                isPublished: true,
                status: seed.status,
                deliveryMode: seed.deliveryMode,
                externalExamUrl: seed.externalExamUrl || undefined,
                accessMode: 'all',
                attemptLimit: seed.attemptLimit,
                defaultMarksPerQuestion: 1,
                bannerSource: 'url',
                bannerImageUrl: PLACEHOLDER_BANNER,
                bannerAltText: seed.title,
                resultPublishMode: 'scheduled',
                share_link: shareToken,
                short_link: shareToken,
                accessControl: {
                    allowedGroupIds: [],
                    allowedUserIds: [],
                    allowedPlanCodes: seed.allowedPlanCodes,
                },
                createdBy: primaryAdminId,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
    }));

    let totalQuestionCount = 0;
    for (const exam of examDocs) {
        const deliveryMode = String(exam.deliveryMode || 'internal');
        if (deliveryMode !== 'internal') continue;
        const questionSeeds = [1, 2, 3, 4, 5].map((order) => ({
            order,
            question: `${exam.title} - Sample question ${order}?`,
            optionA: 'Option A',
            optionB: 'Option B',
            optionC: 'Option C',
            optionD: 'Option D',
            correctAnswer: order % 2 === 0 ? 'B' : 'C',
        }));
        for (const seed of questionSeeds) {
            await Question.findOneAndUpdate(
                { exam: exam._id, order: seed.order },
                {
                    $set: {
                        exam: exam._id,
                        question: seed.question,
                        question_text: seed.question,
                        questionType: 'mcq',
                        question_type: 'MCQ',
                        optionA: seed.optionA,
                        optionB: seed.optionB,
                        optionC: seed.optionC,
                        optionD: seed.optionD,
                        options: [
                            { key: 'A', text: seed.optionA },
                            { key: 'B', text: seed.optionB },
                            { key: 'C', text: seed.optionC },
                            { key: 'D', text: seed.optionD },
                        ],
                        correctAnswer: seed.correctAnswer,
                        correct_answer: [seed.correctAnswer],
                        marks: 1,
                        difficulty: seed.order <= 2 ? 'easy' : seed.order <= 4 ? 'medium' : 'hard',
                        subject: String(exam.subject || 'General'),
                        class_level: String(exam.group_category || 'Admission'),
                        chapter: 'Seed Chapter',
                        topic: 'Seed Topic',
                        active: true,
                        status: 'approved',
                        media_status: 'approved',
                        has_explanation: true,
                        explanation: 'Seed explanation',
                        explanation_text: 'Seed explanation',
                        created_by: primaryAdminId,
                    },
                },
                { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
            );
            totalQuestionCount += 1;
        }
        await Exam.findByIdAndUpdate(exam._id, { $set: { totalQuestions: 5, totalMarks: 5 } });
    }

    const primaryLiveExam = examDocs.find((item) => String(item.deliveryMode || 'internal') === 'internal');
    const upcomingExam = examDocs.find((item) => String(item.status || '') === 'scheduled');

    if (primaryLiveExam) {
        const questionRows = await Question.find({ exam: primaryLiveExam._id }).sort({ order: 1 }).limit(5).lean();
        const answers = questionRows.map((question, index) => ({
            question: ensureObjectId(question._id),
            questionType: 'mcq' as const,
            selectedAnswer: index % 2 === 0 ? 'C' : 'B',
            isCorrect: index % 2 === 0,
            timeTaken: 25 + index * 3,
        }));
        const correctCount = answers.filter((item) => item.isCorrect).length;
        const wrongCount = answers.length - correctCount;
        const totalMarks = Math.max(answers.length, Number(primaryLiveExam.totalMarks || answers.length));
        const obtainedMarks = correctCount;
        const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;

        await ExamResult.findOneAndUpdate(
            {
                exam: primaryLiveExam._id,
                student: primaryStudentId,
                attemptNo: 1,
            },
            {
                $set: {
                    exam: primaryLiveExam._id,
                    student: primaryStudentId,
                    attemptNo: 1,
                    answers,
                    totalMarks,
                    obtainedMarks,
                    correctCount,
                    wrongCount,
                    unansweredCount: 0,
                    percentage,
                    rank: 1,
                    pointsEarned: Math.round(percentage),
                    timeTaken: 900,
                    deviceInfo: 'Desktop',
                    browserInfo: 'Chrome',
                    ipAddress: '127.0.0.1',
                    tabSwitchCount: 0,
                    submittedAt: nowPlusDays(-1),
                    isAutoSubmitted: false,
                    status: 'evaluated',
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
    }

    if (upcomingExam) {
        await ExamSession.findOneAndUpdate(
            {
                exam: upcomingExam._id,
                student: primaryStudentId,
                attemptNo: 1,
                status: 'in_progress',
            },
            {
                $set: {
                    exam: upcomingExam._id,
                    student: primaryStudentId,
                    attemptNo: 1,
                    attemptRevision: 0,
                    startedAt: nowPlusDays(-0.1),
                    lastSavedAt: new Date(),
                    autoSaves: 2,
                    answers: [],
                    tabSwitchEvents: [],
                    ipAddress: '127.0.0.1',
                    deviceInfo: 'Desktop',
                    browserInfo: 'Chrome',
                    userAgent: 'Seed Agent',
                    deviceFingerprint: 'seed-fingerprint',
                    sessionLocked: false,
                    lockReason: '',
                    isActive: true,
                    expiresAt: nowPlusDays(1),
                    tabSwitchCount: 0,
                    copyAttemptCount: 0,
                    fullscreenExitCount: 0,
                    violationsCount: 0,
                    currentQuestionId: '',
                    cheat_flags: [],
                    auto_submitted: false,
                    status: 'in_progress',
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );
    }

    const notificationSeeds = [
        {
            title: 'Exam Reminder',
            message: 'A live mock exam is currently running. Join from your exam portal.',
            category: 'exam',
            targetRole: 'student',
            linkUrl: '/exams',
        },
        {
            title: 'Resource Update',
            message: 'New preparation resources have been added to your library.',
            category: 'update',
            targetRole: 'all',
            linkUrl: '/resources',
        },
        {
            title: 'Payment Support',
            message: 'Need help with payment proof submission? Contact support.',
            category: 'general',
            targetRole: 'student',
            linkUrl: '/support',
        },
    ] as const;
    const notificationDocs = await Promise.all(notificationSeeds.map(async (seed, index) => Notification.findOneAndUpdate(
        { title: seed.title },
        {
            $set: {
                title: seed.title,
                message: seed.message,
                category: seed.category,
                publishAt: nowPlusDays(-(index + 1)),
                expireAt: nowPlusDays(30),
                isActive: true,
                linkUrl: seed.linkUrl,
                attachmentUrl: '',
                targetRole: seed.targetRole,
                targetUserIds: seed.targetRole === 'student' ? [primaryStudentId] : [],
                createdBy: primaryAdminId,
                updatedBy: primaryAdminId,
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )));

    const noticeDocs = await Promise.all([
        AnnouncementNotice.findOneAndUpdate(
            { title: 'Admission Helpline Notice' },
            {
                $set: {
                    title: 'Admission Helpline Notice',
                    message: 'Support center is available 10:00 AM - 8:00 PM every day.',
                    target: 'all',
                    targetIds: [],
                    startAt: nowPlusDays(-2),
                    endAt: nowPlusDays(60),
                    isActive: true,
                    createdBy: primaryAdminId,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
    ]);

    const supportDocs = await Promise.all([
        SupportTicket.findOneAndUpdate(
            { ticketNo: 'TKT-SEED-0001' },
            {
                $set: {
                    ticketNo: 'TKT-SEED-0001',
                    studentId: primaryStudentId,
                    subject: 'Unable to find exam result in dashboard',
                    message: 'Please check if my result publication is enabled.',
                    status: 'open',
                    priority: 'medium',
                    assignedTo: primaryAdminId,
                    timeline: [
                        {
                            actorId: primaryStudentId,
                            actorRole: 'student',
                            message: 'Created support request from dashboard.',
                            createdAt: nowPlusDays(-1),
                        },
                        {
                            actorId: primaryAdminId,
                            actorRole: 'admin',
                            message: 'Ticket received. We are checking your exam data.',
                            createdAt: now,
                        },
                    ],
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
    ]);

    const paymentDocs = await Promise.all([
        ManualPayment.findOneAndUpdate(
            { reference: 'seed-paid-primary' },
            {
                $set: {
                    studentId: primaryStudentId,
                    subscriptionPlanId: admissionPro ? ensureObjectId(admissionPro._id) : null,
                    amount: 799,
                    currency: 'BDT',
                    method: 'bkash',
                    status: 'paid',
                    date: nowPlusDays(-2),
                    paidAt: nowPlusDays(-2),
                    transactionId: 'TXN-SEED-PAID-001',
                    reference: 'seed-paid-primary',
                    proofUrl: 'https://example.com/payments/seed-paid-proof.png',
                    proofFileUrl: 'https://example.com/payments/seed-paid-proof.png',
                    notes: 'Seeded paid subscription payment.',
                    entryType: 'subscription',
                    recordedBy: primaryAdminId,
                    approvedBy: primaryAdminId,
                    approvedAt: nowPlusDays(-2),
                    verifiedByAdminId: primaryAdminId,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
        ManualPayment.findOneAndUpdate(
            { reference: 'seed-pending-secondary' },
            {
                $set: {
                    studentId: secondaryStudentId,
                    subscriptionPlanId: admissionPro ? ensureObjectId(admissionPro._id) : null,
                    amount: 799,
                    currency: 'BDT',
                    method: 'manual',
                    status: 'pending',
                    date: nowPlusDays(-1),
                    paidAt: null,
                    transactionId: 'TXN-SEED-PENDING-001',
                    reference: 'seed-pending-secondary',
                    proofUrl: 'https://example.com/payments/seed-pending-proof.png',
                    proofFileUrl: 'https://example.com/payments/seed-pending-proof.png',
                    notes: 'Seeded pending payment proof.',
                    entryType: 'subscription',
                    recordedBy: secondaryStudentId,
                    approvedBy: null,
                    approvedAt: null,
                    verifiedByAdminId: null,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
    ]);

    const expenseDocs = await Promise.all([
        ExpenseEntry.findOneAndUpdate(
            { vendor: 'Cloud Hosting Seed', category: 'server' },
            {
                $set: {
                    category: 'server',
                    amount: 1200,
                    date: nowPlusDays(-3),
                    vendor: 'Cloud Hosting Seed',
                    notes: 'Seeded infrastructure expense',
                    linkedStaffId: null,
                    recordedBy: primaryAdminId,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
        ExpenseEntry.findOneAndUpdate(
            { vendor: 'Marketing Seed', category: 'marketing' },
            {
                $set: {
                    category: 'marketing',
                    amount: 800,
                    date: nowPlusDays(-2),
                    vendor: 'Marketing Seed',
                    notes: 'Seeded campaign expense',
                    linkedStaffId: null,
                    recordedBy: primaryAdminId,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
    ]);

    const auditLogDocs = await Promise.all([
        AuditLog.findOneAndUpdate(
            { action: 'seed_content_pipeline_run', actor_id: primaryAdminId, target_type: 'system' },
            {
                $set: {
                    actor_id: primaryAdminId,
                    actor_role: primaryAdmin.role,
                    action: 'seed_content_pipeline_run',
                    target_id: primaryStudentId,
                    target_type: 'system',
                    timestamp: new Date(),
                    ip_address: '127.0.0.1',
                    details: { runLabel },
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
        AuditLog.findOneAndUpdate(
            { action: 'seed_subscription_assigned', actor_id: primaryAdminId, target_type: 'subscription' },
            {
                $set: {
                    actor_id: primaryAdminId,
                    actor_role: primaryAdmin.role,
                    action: 'seed_subscription_assigned',
                    target_id: primaryStudentId,
                    target_type: 'subscription',
                    timestamp: new Date(),
                    ip_address: '127.0.0.1',
                    details: { planCode: 'admission-pro' },
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
    ]);

    const approvalDocs = await Promise.all([
        ActionApproval.findOneAndUpdate(
            {
                actionKey: 'news.publish_breaking',
                status: 'pending_second_approval',
                initiatedBy: primaryAdminId,
            },
            {
                $set: {
                    actionKey: 'news.publish_breaking',
                    module: 'news',
                    action: 'publish_breaking',
                    status: 'pending_second_approval',
                    initiatedBy: primaryAdminId,
                    initiatedByRole: String(primaryAdmin.role || 'admin'),
                    secondApprover: null,
                    secondApproverRole: '',
                    routePath: '/news/:id/publish-now',
                    method: 'POST',
                    paramsSnapshot: { id: newsDocs[0]?._id ? String(newsDocs[0]._id) : 'seed-news' },
                    querySnapshot: {},
                    payloadSnapshot: { force: true },
                    decisionReason: '',
                    initiatedAt: nowPlusDays(-0.5),
                    decidedAt: null,
                    executedAt: null,
                    expiresAt: nowPlusDays(2),
                    executionMeta: {},
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
    ]);

    await Promise.all([
        StudentDueLedger.findOneAndUpdate(
            { studentId: primaryStudentId },
            {
                $set: {
                    computedDue: 0,
                    manualAdjustment: 0,
                    waiverAmount: 0,
                    netDue: 0,
                    lastComputedAt: new Date(),
                    updatedBy: primaryAdminId,
                    note: 'Primary seeded student has no pending due.',
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
        StudentDueLedger.findOneAndUpdate(
            { studentId: secondaryStudentId },
            {
                $set: {
                    computedDue: 799,
                    manualAdjustment: 0,
                    waiverAmount: 120,
                    netDue: 679,
                    lastComputedAt: new Date(),
                    updatedBy: primaryAdminId,
                    note: 'Secondary seeded student has pending due.',
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
    ]);

    await StudentDashboardConfig.findOneAndUpdate(
        {},
        {
            $set: {
                welcomeMessageTemplate: 'Welcome, {{name}}! Your dashboard is up to date.',
                profileCompletionThreshold: 60,
                enableRealtime: true,
                enableDeviceLock: true,
                enableCheatFlags: true,
                enableBadges: true,
                enableProgressCharts: true,
                featuredOrderingMode: 'manual',
                celebrationRules: {
                    enabled: true,
                    windowDays: 7,
                    minPercentage: 75,
                    maxRank: 10,
                    ruleMode: 'score_or_rank',
                    messageTemplates: [
                        'Excellent performance! Keep it up.',
                        'Great job. You are among the top performers.',
                    ],
                    showForSec: 10,
                    dismissible: true,
                    maxShowsPerDay: 2,
                },
                updatedBy: primaryAdminId,
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );

    const badgeDocs = await Promise.all([
        Badge.findOneAndUpdate(
            { code: 'consistent-performer' },
            {
                $set: {
                    code: 'consistent-performer',
                    title: 'Consistent Performer',
                    description: 'Awarded for stable performance in mock exams.',
                    iconUrl: '',
                    criteriaType: 'manual',
                    minAvgPercentage: 70,
                    minCompletedExams: 1,
                    isActive: true,
                },
            },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        ),
    ]);

    await Promise.all(badgeDocs.map(async (badge) => StudentBadge.findOneAndUpdate(
        {
            student: primaryStudentId,
            badge: badge._id,
        },
        {
            $set: {
                student: primaryStudentId,
                badge: badge._id,
                awardedBy: primaryAdminId,
                source: 'manual',
                note: 'Seeded badge assignment',
                awardedAt: nowPlusDays(-1),
            },
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    )));

    return {
        ok: true,
        runLabel,
        users: {
            admins: admins.length,
            students: students.length,
        },
        seeded: {
            categories: categoryDocs.length,
            universities: universityDocs.length,
            plans: planDocs.length,
            banners: bannerDocs.length,
            newsSources: sourceDocs.length,
            news: newsDocs.length,
            newsAuditEvents: newsAuditEventDocs.length,
            resources: resourceDocs.length,
            exams: examDocs.length,
            questions: totalQuestionCount,
            newsJobs: newsJobDoc ? 1 : 0,
            approvals: approvalDocs.length,
            notifications: notificationDocs.length,
            notices: noticeDocs.length,
            supportTickets: supportDocs.length,
            payments: paymentDocs.length,
            expenses: expenseDocs.length,
            auditLogs: auditLogDocs.length,
            badges: badgeDocs.length,
        },
    };
}

async function runStandalone(): Promise<void> {
    try {
        await connectDB();
        const summary = await seedContentPipeline({ runLabel: 'standalone' });
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(summary, null, 2));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[seed-content-pipeline] failed', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    void runStandalone();
}
