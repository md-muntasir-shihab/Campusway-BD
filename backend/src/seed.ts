/**
 * Seed script — run once to populate MongoDB with universities, resources, and news.
 * Usage: npx ts-node src/seed.ts
 *    OR: node -r ts-node/register src/seed.ts
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import University from './models/University';
import Resource from './models/Resource';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway';

/* ─── University seed data ─── */
const universities = [
    {
        name: 'University of Dhaka',
        shortForm: 'DU',
        slug: 'dhaka-university',
        category: 'Individual Admission',
        established: 1921,
        address: 'Shahbagh, Dhaka 1000',
        contactNumber: '+880-2-9661900',
        email: 'registrar@du.ac.bd',
        website: 'https://du.ac.bd',
        admissionWebsite: 'https://admission.eis.du.ac.bd',
        totalSeats: 7000,
        scienceSeats: 2500,
        artsSeats: 2800,
        businessSeats: 1700,
        shortDescription: 'One of the oldest and most prestigious universities in Bangladesh, offering education in sciences, arts, and business.',
        description: "The University of Dhaka, established in 1921, is the premier public university of Bangladesh. Known as the 'Oxford of the East', it has played a pivotal role in the cultural and political history of the nation. The university offers programs across a wide range of disciplines including science, arts, business, law, and engineering.",
        unitLayout: 'compact',
        isActive: true,
        isAdmissionOpen: true,
        applicationStart: new Date('2026-02-01'),
        applicationEnd: new Date('2026-03-25'),
        isFeatured: true,
        units: [
            {
                name: 'Science',
                seats: 2500,
                examDate: new Date('2026-04-28'),
                applicationStart: new Date('2026-02-01'),
                applicationEnd: new Date('2026-03-10'),
                notes: 'HSC Science background required',
            },
            {
                name: 'Arts',
                seats: 2800,
                examDate: new Date('2026-04-30'),
                applicationStart: new Date('2026-02-01'),
                applicationEnd: new Date('2026-03-12'),
            },
            {
                name: 'Commerce',
                seats: 1700,
                examDate: new Date('2026-05-02'),
                applicationStart: new Date('2026-02-01'),
                applicationEnd: new Date('2026-03-15'),
            },
        ],
        examCenters: [
            { city: 'Dhaka', address: 'Curzon Hall, University of Dhaka, Dhaka 1000', mapUrl: 'https://maps.google.com/?q=Curzon+Hall+Dhaka' },
            { city: 'Dhaka', address: 'Arts Building, University of Dhaka, Dhaka 1000', mapUrl: '' },
            { city: 'Chittagong', address: 'Chittagong Collegiate School, Chittagong', mapUrl: '' },
        ],
        socialLinks: [
            { platform: 'facebook', url: 'https://facebook.com/dudhaka' },
            { platform: 'youtube', url: 'https://youtube.com/@dudhaka' },
        ],
        applicationSteps: [
            { order: 1, title: 'Online Registration', description: 'Register at admission.eis.du.ac.bd using your SSC and HSC roll numbers.' },
            { order: 2, title: 'Application Fee Payment', description: 'Pay the application fee via mobile banking (bKash/Rocket) or bank.' },
            { order: 3, title: 'Admit Card Download', description: 'Download your unit-specific admit card from the portal after fee confirmation.' },
            { order: 4, title: 'Appear for Exam', description: 'Attend the MCQ-based admission exam at your assigned center.' },
            { order: 5, title: 'Result & Merit List', description: 'Check the merit list on the official portal and complete the physical verification.' },
        ],
        minGpa: 3.5,
        requiredBackground: 'SSC + HSC with minimum GPA of 3.5 each',
        ageLimit: 'Max 22 years as of exam date',
        requiredDocuments: ['SSC certificate & transcript', 'HSC certificate & transcript', 'Birth certificate', 'National ID (or guardian\'s)', 'Recent passport photo'],
        specialQuota: 'Freedom fighter quota: 2%, tribal quota: 1%, disabled quota: 1%',
        additionalNotes: 'Students with B.Sc. (Pass) from NU are not eligible to apply.',
        faqs: [
            { q: 'Can I apply from Commerce background for Science unit?', a: 'No, each unit has its own background requirements. Science unit requires HSC Science.' },
            { q: 'Is there negative marking?', a: 'Yes, 0.20 marks are deducted for each wrong answer.' },
            { q: 'When will the admit card be available?', a: 'Admit cards are usually available 5-7 days before the exam via the official portal.' },
        ],
        notices: [
            { title: 'Application Deadline Extended', description: 'The application deadline for Science unit has been extended to March 10, 2026.', isImportant: true, publishDate: new Date('2026-02-15') },
        ],
    },
    {
        name: 'Rajshahi University',
        shortForm: 'RU',
        slug: 'rajshahi-university',
        category: 'GST',
        established: 1953,
        address: 'Kazla, Rajshahi 6205',
        contactNumber: '+880-721-750041',
        email: 'admission@ru.ac.bd',
        website: 'https://ru.ac.bd',
        admissionWebsite: 'https://admission.ru.ac.bd',
        totalSeats: 4800,
        scienceSeats: 2000,
        artsSeats: 1800,
        businessSeats: 1000,
        shortDescription: 'A prominent public university in northern Bangladesh with a large, scenic campus and comprehensive academic programs.',
        unitLayout: 'carousel',
        isActive: true,
        isAdmissionOpen: true,
        applicationStart: new Date('2026-02-05'),
        applicationEnd: new Date('2026-03-28'),
        units: [
            { name: 'Science', seats: 2000, examDate: new Date('2026-04-28'), applicationStart: new Date('2026-02-05'), applicationEnd: new Date('2026-03-15') },
            { name: 'Arts & Social Science', seats: 1800, examDate: new Date('2026-04-30'), applicationStart: new Date('2026-02-05'), applicationEnd: new Date('2026-03-18') },
        ],
        examCenters: [
            { city: 'Rajshahi', address: 'Rajshahi University Campus, Kazla, Rajshahi', mapUrl: '' },
            { city: 'Dhaka', address: 'Motijheel Govt. Boys School, Dhaka', mapUrl: '' },
        ],
        applicationSteps: [
            { order: 1, title: 'Online Application', description: 'Fill out the GST cluster application form at the joint admission portal.' },
            { order: 2, title: 'Fee Payment', description: 'Pay the application fee via Teletalk SIM or online banking.' },
            { order: 3, title: 'Exam', description: 'Appear for the GST cluster exam at your assigned center.' },
            { order: 4, title: 'Result', description: 'University-wise merit lists are published on respective portals.' },
        ],
        minGpa: 3.0,
        requiredBackground: 'SSC + HSC with minimum GPA 3.0 each',
        faqs: [
            { q: 'Is RU part of the GST cluster?', a: 'Yes, RU participates in the GST (General, Science & Technology) cluster admission.' },
        ],
        socialLinks: [{ platform: 'facebook', url: 'https://facebook.com/ruvarsity' }],
        notices: [],
    },
    {
        name: 'Bangladesh University of Engineering and Technology',
        shortForm: 'BUET',
        slug: 'buet',
        category: 'Science & Technology',
        established: 1962,
        address: 'Palashi, Dhaka 1000',
        contactNumber: '+880-2-9665650',
        email: 'registrar@buet.ac.bd',
        website: 'https://buet.ac.bd',
        admissionWebsite: 'https://ugadmission.buet.ac.bd',
        totalSeats: 1165,
        scienceSeats: 1165,
        artsSeats: 0,
        businessSeats: 0,
        shortDescription: 'The top engineering and technology university of Bangladesh, offering BSc Engineering programs across Civil, Electrical, Mechanical, CSE and more.',
        unitLayout: 'stacked',
        isActive: true,
        isAdmissionOpen: true,
        applicationStart: new Date('2026-02-10'),
        applicationEnd: new Date('2026-04-20'),
        units: [
            { name: 'Engineering', seats: 1165, examDate: new Date('2026-05-10'), applicationStart: new Date('2026-02-10'), applicationEnd: new Date('2026-04-20'), notes: 'Only HSC Science students with Physics, Chemistry & Mathematics eligible.' },
        ],
        examCenters: [
            { city: 'Dhaka', address: 'BUET Campus, Palashi, Dhaka 1000', mapUrl: 'https://maps.google.com/?q=BUET+Dhaka' },
        ],
        applicationSteps: [
            { order: 1, title: 'Online Application', description: 'Apply via ugadmission.buet.ac.bd within the specified dates.' },
            { order: 2, title: 'Preliminary Test', description: 'Shortlisted candidates appear for a preliminary screening exam.' },
            { order: 3, title: 'Main Admission Test', description: 'Top scorers from preliminary exam sit for the main test.' },
            { order: 4, title: 'Result & Enrollment', description: 'Merit list published; selected students complete enrollment.' },
        ],
        minGpa: 4.0,
        requiredBackground: 'HSC Science with Physics, Chemistry, Mathematics each GPA ≥ 4.0',
        requiredDocuments: ['HSC marksheet', 'SSC marksheet', 'Birth certificate', 'Passport photo (4 copies)'],
        faqs: [
            { q: 'Is BUET exam subjective or MCQ?', a: 'The main admission test is written/subjective (Physics, Chemistry, Math). The preliminary may be MCQ.' },
            { q: 'How many seats are available?', a: 'BUET offers around 1,165 seats across all engineering departments.' },
        ],
        socialLinks: [{ platform: 'facebook', url: 'https://facebook.com/buet.official' }],
        notices: [{ title: 'Preliminary Exam Schedule Released', description: 'Download the preliminary exam schedule from the official portal.', isImportant: true, publishDate: new Date('2026-03-01') }],
    },
    {
        name: 'University of Chittagong',
        shortForm: 'CU',
        slug: 'chittagong-university',
        category: 'GST',
        established: 1966,
        address: 'Hathazari, Chittagong 4331',
        website: 'https://cu.ac.bd',
        admissionWebsite: 'https://admission.cu.ac.bd',
        totalSeats: 4800,
        scienceSeats: 2000,
        artsSeats: 1700,
        businessSeats: 1100,
        shortDescription: 'A scenic hilltop university in Chittagong offering programs in sciences, arts, and business with its own railway connection.',
        unitLayout: 'stacked',
        isActive: true,
        isAdmissionOpen: true,
        applicationStart: new Date('2026-02-08'),
        applicationEnd: new Date('2026-04-10'),
        units: [
            { name: 'Science', seats: 2000, examDate: new Date('2026-05-15'), applicationStart: new Date('2026-02-08'), applicationEnd: new Date('2026-03-20') },
            { name: 'Arts', seats: 1700, examDate: new Date('2026-05-18'), applicationStart: new Date('2026-02-08'), applicationEnd: new Date('2026-03-22') },
        ],
        examCenters: [
            { city: 'Chittagong', address: 'University of Chittagong Campus, Hathazari', mapUrl: '' },
        ],
        applicationSteps: [
            { order: 1, title: 'Online Application', description: 'Apply via admission.cu.ac.bd.' },
            { order: 2, title: 'Exam', description: 'Sit for MCQ-based admission test at the assigned center.' },
            { order: 3, title: 'Result', description: 'Merit list published on the official portal.' },
        ],
        minGpa: 3.0,
        faqs: [],
        socialLinks: [],
        notices: [],
    },
    {
        name: 'Jahangirnagar University',
        shortForm: 'JU',
        slug: 'jahangirnagar-university',
        category: 'Individual Admission',
        established: 1970,
        address: 'Savar, Dhaka 1342',
        website: 'https://juniv.edu',
        admissionWebsite: 'https://juniv-admission.org',
        totalSeats: 3200,
        scienceSeats: 1200,
        artsSeats: 1400,
        businessSeats: 600,
        shortDescription: 'A residential university in Savar known for its natural beauty, diverse academic programs, and vibrant campus life.',
        unitLayout: 'compact',
        isActive: true,
        isAdmissionOpen: true,
        applicationStart: new Date('2026-02-12'),
        applicationEnd: new Date('2026-04-05'),
        units: [
            { name: 'Science', seats: 1200, examDate: new Date('2026-05-12'), applicationStart: new Date('2026-02-12'), applicationEnd: new Date('2026-03-25') },
            { name: 'Arts & Soc. Sci.', seats: 1400, examDate: new Date('2026-05-14'), applicationStart: new Date('2026-02-12'), applicationEnd: new Date('2026-03-28') },
        ],
        examCenters: [
            { city: 'Savar', address: 'JU Campus, Savar, Dhaka 1342', mapUrl: '' },
            { city: 'Dhaka', address: 'Motijheel Ideal School, Dhaka', mapUrl: '' },
        ],
        applicationSteps: [
            { order: 1, title: 'Online Application', description: 'Register at juniv-admission.org.' },
            { order: 2, title: 'Fee Payment', description: 'Pay via bKash or DBBL Nexus.' },
            { order: 3, title: 'Admit Card', description: 'Download 5 days before exam.' },
            { order: 4, title: 'Exam & Result', description: 'MCQ exam; results within 2 weeks.' },
        ],
        minGpa: 3.0,
        faqs: [],
        socialLinks: [],
        notices: [],
    },
    {
        name: 'Khulna University',
        shortForm: 'KU',
        slug: 'khulna-university',
        category: 'GST',
        established: 1991,
        address: 'Khulna 9208',
        website: 'https://ku.ac.bd',
        admissionWebsite: 'https://admission.ku.ac.bd',
        totalSeats: 2800,
        scienceSeats: 1200,
        artsSeats: 900,
        businessSeats: 700,
        shortDescription: 'A public university in southern Bangladesh offering diverse programs in science, arts, and business with a focus on innovation.',
        unitLayout: 'stacked',
        isActive: true,
        isAdmissionOpen: true,
        applicationStart: new Date('2026-02-20'),
        applicationEnd: new Date('2026-04-30'),
        units: [
            { name: 'All Disciplines', seats: 2800, examDate: new Date('2026-06-01'), applicationStart: new Date('2026-02-20'), applicationEnd: new Date('2026-04-30') },
        ],
        examCenters: [
            { city: 'Khulna', address: 'Khulna University Campus, Khulna 9208', mapUrl: '' },
        ],
        applicationSteps: [
            { order: 1, title: 'Application', description: 'Apply at admission.ku.ac.bd.' },
            { order: 2, title: 'Exam', description: 'GST cluster exam at assigned center.' },
            { order: 3, title: 'Result', description: 'Results via official portal.' },
        ],
        minGpa: 3.0,
        faqs: [],
        socialLinks: [],
        notices: [],
    },
];

/* ─── Sample resources ─── */
const resources = [
    { title: 'Admission Test Question Bank 2025', description: 'Complete collection of previous year admission test questions from all major universities.', type: 'pdf', category: 'Question Banks', tags: ['DU', 'BUET', 'RU'], isPublic: true, isFeatured: true, views: 1250, downloads: 890, publishDate: new Date('2026-01-15') },
    { title: 'University Admission Official Portal', description: 'Official link to the national university admission portal.', type: 'link', category: 'Official Links', tags: ['NU', 'Admission'], isPublic: true, isFeatured: false, views: 2340, downloads: 0, publishDate: new Date('2026-01-10'), externalUrl: 'https://aladmission.nu.ac.bd' },
    { title: 'Math Crash Course for Admission Prep', description: 'Comprehensive video series covering all math topics for university admission exams.', type: 'video', category: 'Study Materials', tags: ['Math', 'Video'], isPublic: true, isFeatured: true, views: 5600, downloads: 0, publishDate: new Date('2026-01-08'), externalUrl: 'https://youtube.com' },
    { title: 'English Grammar Quick Notes', description: 'Essential English grammar rules and shortcuts for admission test prep.', type: 'pdf', category: 'Study Materials', tags: ['English', 'Grammar'], isPublic: true, isFeatured: false, views: 980, downloads: 750, publishDate: new Date('2025-12-20') },
    { title: 'GK & Current Affairs Guide 2026', description: 'Updated general knowledge and current affairs for all admission exams.', type: 'pdf', category: 'Study Materials', tags: ['GK', 'Current Affairs'], isPublic: true, isFeatured: false, views: 1120, downloads: 620, publishDate: new Date('2026-02-01') },
    { title: 'Admission Preparation Expert Tips', description: 'Expert tips and strategies for cracking university admission tests.', type: 'video', category: 'Tips & Tricks', tags: ['Tips', 'Strategy'], isPublic: true, isFeatured: true, views: 3200, downloads: 0, publishDate: new Date('2026-01-25'), externalUrl: 'https://youtube.com' },
    { title: 'Physics Formula Sheet', description: 'Quick reference sheet for all important physics formulas for science unit admission tests.', type: 'pdf', category: 'Study Materials', tags: ['Physics', 'Science'], isPublic: true, isFeatured: false, views: 760, downloads: 540, publishDate: new Date('2025-12-10') },
    { title: 'Government Scholarship 2026 Info', description: 'Complete information about government scholarship programs for admission candidates.', type: 'link', category: 'Scholarships', tags: ['Scholarship', 'Government'], isPublic: true, isFeatured: true, views: 1800, downloads: 0, publishDate: new Date('2026-02-05'), externalUrl: 'https://scholarships.gov.bd' },
    { title: 'Biology Quick Revision Notes', description: 'Concise biology revision notes for medical and science unit admission tests.', type: 'pdf', category: 'Study Materials', tags: ['Biology', 'Medical'], isPublic: true, isFeatured: false, views: 670, downloads: 480, publishDate: new Date('2025-12-15') },
    { title: 'DU Admission Process Explained', description: 'Step-by-step notes on the Dhaka University application process.', type: 'note', category: 'Tips & Tricks', tags: ['DU', 'Process'], isPublic: true, isFeatured: false, views: 890, downloads: 0, publishDate: new Date('2026-01-18') },
];

async function seed() {
    console.log('🔗 Connecting to MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected');

    // Universities
    const existingUniCount = await University.countDocuments();
    if (existingUniCount === 0) {
        console.log('🌱 Seeding universities...');
        for (const u of universities) {
            await University.create(u);
            console.log(`  ✅ ${u.shortForm} — ${u.name}`);
        }
    } else {
        console.log(`ℹ️  Skipping universities — ${existingUniCount} already exist. Drop the collection to re-seed.`);
    }

    // Resources
    const existingResourceCount = await Resource.countDocuments();
    if (existingResourceCount === 0) {
        console.log('🌱 Seeding resources...');
        await Resource.insertMany(resources);
        console.log(`  ✅ ${resources.length} resources inserted`);
    } else {
        console.log(`ℹ️  Skipping resources — ${existingResourceCount} already exist.`);
    }

    await mongoose.disconnect();
    console.log('🎉 Seed complete!');
}

seed().catch(err => {
    console.error('❌ Seed error:', err);
    process.exit(1);
});
