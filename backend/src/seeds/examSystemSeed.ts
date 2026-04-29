/**
 * Exam System Seed Script
 *
 * Seeds the exam management system with:
 *   1. Hierarchy defaults (4 groups + sub-groups) via QuestionHierarchyService.seedDefaults()
 *   2. Sample MCQ questions across different subjects
 *   3. A sample exam referencing the seeded questions
 *
 * Requirements: 1.7, 1.8
 *
 * Usage:
 *   npx tsx src/seeds/examSystemSeed.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { seedDefaults } from '../services/QuestionHierarchyService';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import QuestionGroup from '../models/QuestionGroup';
import Exam from '../models/Exam';

dotenv.config();

// ─── Sample Questions ───────────────────────────────────────

interface SampleQuestion {
    subject: string;
    moduleCategory: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    question_en: string;
    question_bn: string;
    options: { key: 'A' | 'B' | 'C' | 'D'; text_en: string; text_bn: string; isCorrect: boolean }[];
    correctKey: 'A' | 'B' | 'C' | 'D';
    explanation_en: string;
    explanation_bn: string;
    tags: string[];
}

const SAMPLE_QUESTIONS: SampleQuestion[] = [
    {
        subject: 'Physics',
        moduleCategory: 'Admission',
        topic: 'Mechanics',
        difficulty: 'medium',
        question_en: 'A ball is thrown vertically upward with velocity 20 m/s. What is the maximum height reached? (g = 10 m/s²)',
        question_bn: 'একটি বল 20 m/s বেগে উলম্বভাবে উপরে নিক্ষেপ করা হলো। সর্বোচ্চ উচ্চতা কত? (g = 10 m/s²)',
        options: [
            { key: 'A', text_en: '10 m', text_bn: '১০ মি', isCorrect: false },
            { key: 'B', text_en: '20 m', text_bn: '২০ মি', isCorrect: true },
            { key: 'C', text_en: '30 m', text_bn: '৩০ মি', isCorrect: false },
            { key: 'D', text_en: '40 m', text_bn: '৪০ মি', isCorrect: false },
        ],
        correctKey: 'B',
        explanation_en: 'Using v² = u² - 2gh, at max height v=0: h = u²/(2g) = 400/20 = 20 m',
        explanation_bn: 'v² = u² - 2gh সূত্র ব্যবহার করে, সর্বোচ্চ উচ্চতায় v=0: h = u²/(2g) = 400/20 = 20 মি',
        tags: ['kinematics', 'projectile'],
    },
    {
        subject: 'Chemistry',
        moduleCategory: 'Admission',
        topic: 'Organic Chemistry',
        difficulty: 'easy',
        question_en: 'What is the IUPAC name of CH₃CH₂OH?',
        question_bn: 'CH₃CH₂OH এর IUPAC নাম কী?',
        options: [
            { key: 'A', text_en: 'Methanol', text_bn: 'মিথানল', isCorrect: false },
            { key: 'B', text_en: 'Ethanol', text_bn: 'ইথানল', isCorrect: true },
            { key: 'C', text_en: 'Propanol', text_bn: 'প্রোপানল', isCorrect: false },
            { key: 'D', text_en: 'Butanol', text_bn: 'বিউটানল', isCorrect: false },
        ],
        correctKey: 'B',
        explanation_en: 'CH₃CH₂OH has 2 carbon atoms with an -OH group, making it ethanol.',
        explanation_bn: 'CH₃CH₂OH তে ২টি কার্বন পরমাণু এবং একটি -OH গ্রুপ আছে, তাই এটি ইথানল।',
        tags: ['organic', 'nomenclature'],
    },
    {
        subject: 'Mathematics',
        moduleCategory: 'Admission',
        topic: 'Calculus',
        difficulty: 'hard',
        question_en: 'What is the derivative of sin(x²)?',
        question_bn: 'sin(x²) এর অন্তরকলন কত?',
        options: [
            { key: 'A', text_en: 'cos(x²)', text_bn: 'cos(x²)', isCorrect: false },
            { key: 'B', text_en: '2x·cos(x²)', text_bn: '2x·cos(x²)', isCorrect: true },
            { key: 'C', text_en: 'x·cos(x²)', text_bn: 'x·cos(x²)', isCorrect: false },
            { key: 'D', text_en: '2·cos(x²)', text_bn: '2·cos(x²)', isCorrect: false },
        ],
        correctKey: 'B',
        explanation_en: 'By chain rule: d/dx[sin(x²)] = cos(x²) · 2x = 2x·cos(x²)',
        explanation_bn: 'চেইন রুল অনুসারে: d/dx[sin(x²)] = cos(x²) · 2x = 2x·cos(x²)',
        tags: ['calculus', 'differentiation', 'chain-rule'],
    },
    {
        subject: 'English',
        moduleCategory: 'Admission',
        topic: 'Grammar',
        difficulty: 'easy',
        question_en: 'Choose the correct sentence:',
        question_bn: 'সঠিক বাক্যটি নির্বাচন করুন:',
        options: [
            { key: 'A', text_en: 'He don\'t know the answer.', text_bn: 'He don\'t know the answer.', isCorrect: false },
            { key: 'B', text_en: 'He doesn\'t knows the answer.', text_bn: 'He doesn\'t knows the answer.', isCorrect: false },
            { key: 'C', text_en: 'He doesn\'t know the answer.', text_bn: 'He doesn\'t know the answer.', isCorrect: true },
            { key: 'D', text_en: 'He don\'t knows the answer.', text_bn: 'He don\'t knows the answer.', isCorrect: false },
        ],
        correctKey: 'C',
        explanation_en: 'Third person singular uses "doesn\'t" + base form of the verb.',
        explanation_bn: 'তৃতীয় পুরুষ একবচনে "doesn\'t" + ক্রিয়ার মূল রূপ ব্যবহৃত হয়।',
        tags: ['grammar', 'subject-verb-agreement'],
    },
    {
        subject: 'Biology',
        moduleCategory: 'Admission',
        topic: 'Cell Biology',
        difficulty: 'medium',
        question_en: 'Which organelle is known as the "powerhouse of the cell"?',
        question_bn: 'কোন অঙ্গাণুকে "কোষের পাওয়ার হাউস" বলা হয়?',
        options: [
            { key: 'A', text_en: 'Nucleus', text_bn: 'নিউক্লিয়াস', isCorrect: false },
            { key: 'B', text_en: 'Ribosome', text_bn: 'রাইবোসোম', isCorrect: false },
            { key: 'C', text_en: 'Mitochondria', text_bn: 'মাইটোকন্ড্রিয়া', isCorrect: true },
            { key: 'D', text_en: 'Golgi apparatus', text_bn: 'গলগি বডি', isCorrect: false },
        ],
        correctKey: 'C',
        explanation_en: 'Mitochondria produce ATP through cellular respiration, providing energy for the cell.',
        explanation_bn: 'মাইটোকন্ড্রিয়া কোষীয় শ্বসনের মাধ্যমে ATP উৎপাদন করে, কোষকে শক্তি সরবরাহ করে।',
        tags: ['cell-biology', 'organelles'],
    },
    {
        subject: 'General Knowledge',
        moduleCategory: 'Admission',
        topic: 'Bangladesh Affairs',
        difficulty: 'easy',
        question_en: 'When did Bangladesh gain independence?',
        question_bn: 'বাংলাদেশ কবে স্বাধীনতা লাভ করে?',
        options: [
            { key: 'A', text_en: '1947', text_bn: '১৯৪৭', isCorrect: false },
            { key: 'B', text_en: '1952', text_bn: '১৯৫২', isCorrect: false },
            { key: 'C', text_en: '1971', text_bn: '১৯৭১', isCorrect: true },
            { key: 'D', text_en: '1975', text_bn: '১৯৭৫', isCorrect: false },
        ],
        correctKey: 'C',
        explanation_en: 'Bangladesh declared independence on March 26, 1971 and achieved victory on December 16, 1971.',
        explanation_bn: 'বাংলাদেশ ১৯৭১ সালের ২৬ মার্চ স্বাধীনতা ঘোষণা করে এবং ১৬ ডিসেম্বর বিজয় অর্জন করে।',
        tags: ['bangladesh', 'history', 'independence'],
    },
    {
        subject: 'Physics',
        moduleCategory: 'Admission',
        topic: 'Electromagnetism',
        difficulty: 'hard',
        question_en: 'What is the SI unit of magnetic flux?',
        question_bn: 'চৌম্বক ফ্লাক্সের SI একক কী?',
        options: [
            { key: 'A', text_en: 'Tesla', text_bn: 'টেসলা', isCorrect: false },
            { key: 'B', text_en: 'Weber', text_bn: 'ওয়েবার', isCorrect: true },
            { key: 'C', text_en: 'Henry', text_bn: 'হেনরি', isCorrect: false },
            { key: 'D', text_en: 'Gauss', text_bn: 'গাউস', isCorrect: false },
        ],
        correctKey: 'B',
        explanation_en: 'The SI unit of magnetic flux is Weber (Wb). Tesla is the unit of magnetic flux density.',
        explanation_bn: 'চৌম্বক ফ্লাক্সের SI একক ওয়েবার (Wb)। টেসলা হলো চৌম্বক ফ্লাক্স ঘনত্বের একক।',
        tags: ['electromagnetism', 'units'],
    },
    {
        subject: 'Chemistry',
        moduleCategory: 'Admission',
        topic: 'Physical Chemistry',
        difficulty: 'medium',
        question_en: 'What is the pH of a neutral solution at 25°C?',
        question_bn: '25°C তাপমাত্রায় একটি নিরপেক্ষ দ্রবণের pH কত?',
        options: [
            { key: 'A', text_en: '0', text_bn: '০', isCorrect: false },
            { key: 'B', text_en: '7', text_bn: '৭', isCorrect: true },
            { key: 'C', text_en: '14', text_bn: '১৪', isCorrect: false },
            { key: 'D', text_en: '1', text_bn: '১', isCorrect: false },
        ],
        correctKey: 'B',
        explanation_en: 'At 25°C, pure water has [H+] = 10^-7 M, so pH = -log(10^-7) = 7.',
        explanation_bn: '25°C তাপমাত্রায় বিশুদ্ধ পানিতে [H+] = 10^-7 M, তাই pH = -log(10^-7) = 7।',
        tags: ['physical-chemistry', 'pH', 'acids-bases'],
    },
    {
        subject: 'Mathematics',
        moduleCategory: 'Admission',
        topic: 'Algebra',
        difficulty: 'medium',
        question_en: 'If x + 1/x = 3, what is x² + 1/x²?',
        question_bn: 'যদি x + 1/x = 3 হয়, তাহলে x² + 1/x² = ?',
        options: [
            { key: 'A', text_en: '5', text_bn: '৫', isCorrect: false },
            { key: 'B', text_en: '7', text_bn: '৭', isCorrect: true },
            { key: 'C', text_en: '9', text_bn: '৯', isCorrect: false },
            { key: 'D', text_en: '11', text_bn: '১১', isCorrect: false },
        ],
        correctKey: 'B',
        explanation_en: '(x + 1/x)² = x² + 2 + 1/x², so x² + 1/x² = 3² - 2 = 7',
        explanation_bn: '(x + 1/x)² = x² + 2 + 1/x², তাই x² + 1/x² = 3² - 2 = 7',
        tags: ['algebra', 'identities'],
    },
    {
        subject: 'Biology',
        moduleCategory: 'Admission',
        topic: 'Genetics',
        difficulty: 'hard',
        question_en: 'Which base is found in RNA but not in DNA?',
        question_bn: 'কোন ক্ষারটি RNA তে পাওয়া যায় কিন্তু DNA তে পাওয়া যায় না?',
        options: [
            { key: 'A', text_en: 'Adenine', text_bn: 'অ্যাডেনিন', isCorrect: false },
            { key: 'B', text_en: 'Guanine', text_bn: 'গুয়ানিন', isCorrect: false },
            { key: 'C', text_en: 'Thymine', text_bn: 'থাইমিন', isCorrect: false },
            { key: 'D', text_en: 'Uracil', text_bn: 'ইউরাসিল', isCorrect: true },
        ],
        correctKey: 'D',
        explanation_en: 'RNA contains Uracil (U) instead of Thymine (T) found in DNA.',
        explanation_bn: 'RNA তে DNA এর থাইমিন (T) এর পরিবর্তে ইউরাসিল (U) থাকে।',
        tags: ['genetics', 'nucleic-acids'],
    },
];

// ─── Seed Functions ─────────────────────────────────────────

/**
 * Seed sample questions into the question bank.
 * Uses upsert on contentHash to avoid duplicates on re-run.
 */
async function seedSampleQuestions(): Promise<mongoose.Types.ObjectId[]> {
    console.log('[seed:exam-system] Seeding sample questions...');

    // Find the admission group for linking
    const admissionGroup = await QuestionGroup.findOne({ code: 'admission' }).lean();

    const questionIds: mongoose.Types.ObjectId[] = [];

    for (const q of SAMPLE_QUESTIONS) {
        const contentHash = `seed_${q.subject}_${q.topic}_${q.correctKey}_${q.difficulty}`.toLowerCase().replace(/\s+/g, '_');

        const doc = await QuestionBankQuestion.findOneAndUpdate(
            { contentHash },
            {
                $setOnInsert: {
                    subject: q.subject,
                    moduleCategory: q.moduleCategory,
                    topic: q.topic,
                    difficulty: q.difficulty,
                    languageMode: 'both',
                    question_en: q.question_en,
                    question_bn: q.question_bn,
                    options: q.options,
                    correctKey: q.correctKey,
                    explanation_en: q.explanation_en,
                    explanation_bn: q.explanation_bn,
                    marks: 1,
                    negativeMarks: 0.25,
                    tags: q.tags,
                    sourceLabel: 'CampusWay Seed',
                    isActive: true,
                    isArchived: false,
                    contentHash,
                    versionNo: 1,
                    question_type: 'mcq',
                    status: 'published',
                    review_status: 'approved',
                    group_id: admissionGroup?._id ?? null,
                },
            },
            { upsert: true, new: true },
        );

        questionIds.push(doc._id as mongoose.Types.ObjectId);
    }

    console.log(`[seed:exam-system] Upserted ${questionIds.length} sample questions.`);
    return questionIds;
}

/**
 * Seed a sample exam referencing the seeded questions.
 */
async function seedSampleExam(questionIds: mongoose.Types.ObjectId[]): Promise<void> {
    console.log('[seed:exam-system] Seeding sample exam...');

    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const slug = 'sample-admission-mock-test';

    await Exam.findOneAndUpdate(
        { slug },
        {
            $setOnInsert: {
                title: 'Sample Admission Mock Test',
                title_bn: 'নমুনা ভর্তি মক টেস্ট',
                slug,
                subject: 'Mixed',
                subjectBn: 'মিশ্র',
                group_category: 'Admission',
                examCategory: 'mock_test',
                description: 'A sample mock test covering Physics, Chemistry, Mathematics, Biology, English, and General Knowledge for admission preparation.',
                totalQuestions: questionIds.length,
                totalMarks: questionIds.length,
                duration: 15, // 15 minutes
                negativeMarking: true,
                negativeMarkValue: 0.25,
                defaultMarksPerQuestion: 1,
                startDate: now,
                endDate: twoWeeksLater,
                resultPublishDate: twoWeeksLater,
                isPublished: true,
                questionOrder: questionIds,
                perQuestionMarks: questionIds.map((qId) => ({
                    questionId: qId,
                    marks: 1,
                })),
                scheduleWindows: [
                    {
                        startDateTimeUTC: now,
                        endDateTimeUTC: oneWeekLater,
                    },
                ],
            },
        },
        { upsert: true, new: true },
    );

    console.log('[seed:exam-system] Sample exam upserted.');
}

// ─── Main ───────────────────────────────────────────────────

export async function seedExamSystem(): Promise<void> {
    console.log('[seed:exam-system] Starting exam system seed...');

    // 1. Seed hierarchy defaults (4 groups + sub-groups)
    await seedDefaults();
    console.log('[seed:exam-system] Hierarchy defaults seeded.');

    // 2. Seed sample questions
    const questionIds = await seedSampleQuestions();

    // 3. Seed sample exam
    if (questionIds.length > 0) {
        await seedSampleExam(questionIds);
    }

    console.log('[seed:exam-system] Exam system seed completed.');
}

// Allow running directly: npx tsx src/seeds/examSystemSeed.ts
if (require.main === module) {
    (async () => {
        await connectDB();
        await seedExamSystem();
    })()
        .catch((error) => {
            console.error('[seed:exam-system] Failed:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.connection.close();
            }
        });
}
