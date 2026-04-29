import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import QuestionGroup from '../models/QuestionGroup';
import QuestionCategory from '../models/QuestionCategory';
import QuestionTopic from '../models/QuestionTopic';

dotenv.config();

interface SeedTopic {
    code: string;
    en: string;
    bn: string;
    children?: SeedTopic[];
}

interface SeedCategory {
    code: string;
    en: string;
    bn: string;
    description?: { en?: string; bn?: string };
    topics: SeedTopic[];
}

interface SeedGroup {
    code: string;
    en: string;
    bn: string;
    iconUrl?: string;
    color?: string;
    description?: { en?: string; bn?: string };
    categories: SeedCategory[];
}

/**
 * Bangla-first hierarchical taxonomy for CampusWay question bank.
 *
 * Structure:
 *   Group (e.g. বিশ্ববিদ্যালয় ভর্তি)
 *     → Category (e.g. বুয়েট, মেডিকেল)
 *       → Topic (e.g. পদার্থবিজ্ঞান, রসায়ন)
 *         → Sub-topic (e.g. গতিবিদ্যা, বলবিদ্যা)
 */
const TAXONOMY: SeedGroup[] = [
    // ─────────────────────────────────────────────────────────────────────
    {
        code: 'university_admission',
        en: 'University Admission',
        bn: 'বিশ্ববিদ্যালয় ভর্তি',
        color: '#0EA5E9',
        description: {
            en: 'Engineering, general, and integrated cluster admission tests',
            bn: 'প্রকৌশল, সাধারণ ও গুচ্ছ বিশ্ববিদ্যালয় ভর্তি পরীক্ষা',
        },
        categories: [
            {
                code: 'buet',
                en: 'BUET',
                bn: 'বুয়েট (বাংলাদেশ প্রকৌশল বিশ্ববিদ্যালয়)',
                topics: [
                    { code: 'physics', en: 'Physics', bn: 'পদার্থবিজ্ঞান', children: [
                        { code: 'mechanics', en: 'Mechanics', bn: 'বলবিদ্যা' },
                        { code: 'thermodynamics', en: 'Thermodynamics', bn: 'তাপগতিবিদ্যা' },
                        { code: 'waves', en: 'Waves & Oscillations', bn: 'তরঙ্গ ও স্পন্দন' },
                        { code: 'electromagnetism', en: 'Electromagnetism', bn: 'তড়িৎ ও চুম্বকত্ব' },
                        { code: 'optics', en: 'Optics', bn: 'আলোকবিজ্ঞান' },
                        { code: 'modern_physics', en: 'Modern Physics', bn: 'আধুনিক পদার্থবিজ্ঞান' },
                    ]},
                    { code: 'chemistry', en: 'Chemistry', bn: 'রসায়ন', children: [
                        { code: 'organic', en: 'Organic Chemistry', bn: 'জৈব রসায়ন' },
                        { code: 'inorganic', en: 'Inorganic Chemistry', bn: 'অজৈব রসায়ন' },
                        { code: 'physical', en: 'Physical Chemistry', bn: 'ভৌত রসায়ন' },
                    ]},
                    { code: 'higher_math', en: 'Higher Mathematics', bn: 'উচ্চতর গণিত', children: [
                        { code: 'algebra', en: 'Algebra', bn: 'বীজগণিত' },
                        { code: 'calculus', en: 'Calculus', bn: 'ক্যালকুলাস' },
                        { code: 'trigonometry', en: 'Trigonometry', bn: 'ত্রিকোণমিতি' },
                        { code: 'geometry', en: 'Coordinate Geometry', bn: 'স্থানাঙ্ক জ্যামিতি' },
                        { code: 'vectors', en: 'Vectors', bn: 'ভেক্টর' },
                    ]},
                    { code: 'english', en: 'English', bn: 'ইংরেজি' },
                ],
            },
            {
                code: 'ruet',
                en: 'RUET',
                bn: 'রুয়েট (রাজশাহী প্রকৌশল বিশ্ববিদ্যালয়)',
                topics: [
                    { code: 'physics', en: 'Physics', bn: 'পদার্থবিজ্ঞান' },
                    { code: 'chemistry', en: 'Chemistry', bn: 'রসায়ন' },
                    { code: 'math', en: 'Mathematics', bn: 'গণিত' },
                    { code: 'english', en: 'English', bn: 'ইংরেজি' },
                ],
            },
            {
                code: 'cuet',
                en: 'CUET',
                bn: 'চুয়েট (চট্টগ্রাম প্রকৌশল বিশ্ববিদ্যালয়)',
                topics: [
                    { code: 'physics', en: 'Physics', bn: 'পদার্থবিজ্ঞান' },
                    { code: 'chemistry', en: 'Chemistry', bn: 'রসায়ন' },
                    { code: 'math', en: 'Mathematics', bn: 'গণিত' },
                    { code: 'english', en: 'English', bn: 'ইংরেজি' },
                ],
            },
            {
                code: 'kuet',
                en: 'KUET',
                bn: 'কুয়েট (খুলনা প্রকৌশল বিশ্ববিদ্যালয়)',
                topics: [
                    { code: 'physics', en: 'Physics', bn: 'পদার্থবিজ্ঞান' },
                    { code: 'chemistry', en: 'Chemistry', bn: 'রসায়ন' },
                    { code: 'math', en: 'Mathematics', bn: 'গণিত' },
                    { code: 'english', en: 'English', bn: 'ইংরেজি' },
                ],
            },
            {
                code: 'iut',
                en: 'IUT',
                bn: 'আইইউটি',
                topics: [
                    { code: 'physics', en: 'Physics', bn: 'পদার্থবিজ্ঞান' },
                    { code: 'chemistry', en: 'Chemistry', bn: 'রসায়ন' },
                    { code: 'math', en: 'Mathematics', bn: 'গণিত' },
                    { code: 'english', en: 'English', bn: 'ইংরেজি' },
                ],
            },
            {
                code: 'du',
                en: 'Dhaka University',
                bn: 'ঢাকা বিশ্ববিদ্যালয়',
                topics: [
                    { code: 'science_unit', en: 'Science Unit (KA)', bn: 'বিজ্ঞান ইউনিট (ক)', children: [
                        { code: 'physics', en: 'Physics', bn: 'পদার্থবিজ্ঞান' },
                        { code: 'chemistry', en: 'Chemistry', bn: 'রসায়ন' },
                        { code: 'biology', en: 'Biology', bn: 'জীববিজ্ঞান' },
                        { code: 'math', en: 'Mathematics', bn: 'গণিত' },
                    ]},
                    { code: 'arts_unit', en: 'Arts Unit (KHA)', bn: 'কলা ইউনিট (খ)', children: [
                        { code: 'bangla', en: 'Bangla', bn: 'বাংলা' },
                        { code: 'english', en: 'English', bn: 'ইংরেজি' },
                        { code: 'gk', en: 'General Knowledge', bn: 'সাধারণ জ্ঞান' },
                    ]},
                    { code: 'commerce_unit', en: 'Commerce Unit (GA)', bn: 'বাণিজ্য ইউনিট (গ)', children: [
                        { code: 'accounting', en: 'Accounting', bn: 'হিসাববিজ্ঞান' },
                        { code: 'finance', en: 'Finance & Banking', bn: 'ফিন্যান্স ও ব্যাংকিং' },
                        { code: 'management', en: 'Management', bn: 'ব্যবস্থাপনা' },
                        { code: 'marketing', en: 'Marketing', bn: 'মার্কেটিং' },
                    ]},
                    { code: 'cha_unit', en: 'Charukola Unit (CHA)', bn: 'চারুকলা ইউনিট (চ)' },
                ],
            },
            {
                code: 'ju',
                en: 'Jahangirnagar University',
                bn: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়',
                topics: [
                    { code: 'a_unit', en: 'A Unit (Math/Physics)', bn: 'এ ইউনিট' },
                    { code: 'b_unit', en: 'B Unit (Social Sci)', bn: 'বি ইউনিট' },
                    { code: 'c_unit', en: 'C Unit (Arts)', bn: 'সি ইউনিট' },
                    { code: 'd_unit', en: 'D Unit (Biology)', bn: 'ডি ইউনিট' },
                    { code: 'e_unit', en: 'E Unit (Business)', bn: 'ই ইউনিট' },
                ],
            },
            {
                code: 'gst',
                en: 'GST Cluster',
                bn: 'গুচ্ছ (GST)',
                description: { en: '22-university integrated admission test', bn: '২২ বিশ্ববিদ্যালয়ের সমন্বিত ভর্তি পরীক্ষা' },
                topics: [
                    { code: 'science', en: 'Science Group', bn: 'বিজ্ঞান শাখা' },
                    { code: 'arts', en: 'Arts Group', bn: 'মানবিক শাখা' },
                    { code: 'commerce', en: 'Commerce Group', bn: 'বাণিজ্য শাখা' },
                ],
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────
    {
        code: 'medical_admission',
        en: 'Medical & Dental Admission',
        bn: 'মেডিকেল ও ডেন্টাল ভর্তি',
        color: '#10B981',
        description: { en: 'MBBS and BDS admission', bn: 'এমবিবিএস ও বিডিএস ভর্তি প্রস্তুতি' },
        categories: [
            {
                code: 'mbbs',
                en: 'MBBS',
                bn: 'এমবিবিএস (মেডিকেল ভর্তি)',
                topics: [
                    { code: 'physics', en: 'Physics', bn: 'পদার্থবিজ্ঞান' },
                    { code: 'chemistry', en: 'Chemistry', bn: 'রসায়ন' },
                    { code: 'biology', en: 'Biology', bn: 'জীববিজ্ঞান', children: [
                        { code: 'botany', en: 'Botany', bn: 'উদ্ভিদবিজ্ঞান' },
                        { code: 'zoology', en: 'Zoology', bn: 'প্রাণিবিজ্ঞান' },
                    ]},
                    { code: 'english', en: 'English', bn: 'ইংরেজি' },
                    { code: 'gk', en: 'General Knowledge', bn: 'সাধারণ জ্ঞান' },
                ],
            },
            {
                code: 'bds',
                en: 'BDS',
                bn: 'বিডিএস (ডেন্টাল ভর্তি)',
                topics: [
                    { code: 'physics', en: 'Physics', bn: 'পদার্থবিজ্ঞান' },
                    { code: 'chemistry', en: 'Chemistry', bn: 'রসায়ন' },
                    { code: 'biology', en: 'Biology', bn: 'জীববিজ্ঞান' },
                    { code: 'english', en: 'English', bn: 'ইংরেজি' },
                    { code: 'gk', en: 'General Knowledge', bn: 'সাধারণ জ্ঞান' },
                ],
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────
    {
        code: 'school_exams',
        en: 'School & College Exams',
        bn: 'স্কুল ও কলেজ পরীক্ষা',
        color: '#F59E0B',
        description: { en: 'Board exams (SSC, HSC, JSC)', bn: 'বোর্ড পরীক্ষা (এসএসসি, এইচএসসি, জেএসসি)' },
        categories: [
            {
                code: 'hsc_science',
                en: 'HSC Science',
                bn: 'এইচএসসি (বিজ্ঞান)',
                topics: [
                    { code: 'physics_1', en: 'Physics 1st Paper', bn: 'পদার্থবিজ্ঞান ১ম পত্র' },
                    { code: 'physics_2', en: 'Physics 2nd Paper', bn: 'পদার্থবিজ্ঞান ২য় পত্র' },
                    { code: 'chemistry_1', en: 'Chemistry 1st Paper', bn: 'রসায়ন ১ম পত্র' },
                    { code: 'chemistry_2', en: 'Chemistry 2nd Paper', bn: 'রসায়ন ২য় পত্র' },
                    { code: 'higher_math_1', en: 'Higher Math 1st Paper', bn: 'উচ্চতর গণিত ১ম পত্র' },
                    { code: 'higher_math_2', en: 'Higher Math 2nd Paper', bn: 'উচ্চতর গণিত ২য় পত্র' },
                    { code: 'biology_1', en: 'Biology 1st Paper', bn: 'জীববিজ্ঞান ১ম পত্র' },
                    { code: 'biology_2', en: 'Biology 2nd Paper', bn: 'জীববিজ্ঞান ২য় পত্র' },
                    { code: 'ict', en: 'ICT', bn: 'তথ্য ও যোগাযোগ প্রযুক্তি' },
                    { code: 'english_1', en: 'English 1st Paper', bn: 'ইংরেজি ১ম পত্র' },
                    { code: 'english_2', en: 'English 2nd Paper', bn: 'ইংরেজি ২য় পত্র' },
                    { code: 'bangla_1', en: 'Bangla 1st Paper', bn: 'বাংলা ১ম পত্র' },
                    { code: 'bangla_2', en: 'Bangla 2nd Paper', bn: 'বাংলা ২য় পত্র' },
                ],
            },
            {
                code: 'hsc_humanities',
                en: 'HSC Humanities',
                bn: 'এইচএসসি (মানবিক)',
                topics: [
                    { code: 'history_civilization', en: 'History of Civilization', bn: 'সভ্যতার ইতিহাস' },
                    { code: 'economics_1', en: 'Economics 1st', bn: 'অর্থনীতি ১ম পত্র' },
                    { code: 'economics_2', en: 'Economics 2nd', bn: 'অর্থনীতি ২য় পত্র' },
                    { code: 'civics_1', en: 'Civics 1st', bn: 'পৌরনীতি ১ম পত্র' },
                    { code: 'civics_2', en: 'Civics 2nd', bn: 'পৌরনীতি ২য় পত্র' },
                    { code: 'geography', en: 'Geography', bn: 'ভূগোল' },
                    { code: 'sociology', en: 'Sociology', bn: 'সমাজবিজ্ঞান' },
                    { code: 'logic', en: 'Logic', bn: 'যুক্তিবিদ্যা' },
                    { code: 'english_1', en: 'English 1st Paper', bn: 'ইংরেজি ১ম পত্র' },
                    { code: 'english_2', en: 'English 2nd Paper', bn: 'ইংরেজি ২য় পত্র' },
                    { code: 'bangla_1', en: 'Bangla 1st Paper', bn: 'বাংলা ১ম পত্র' },
                    { code: 'bangla_2', en: 'Bangla 2nd Paper', bn: 'বাংলা ২য় পত্র' },
                    { code: 'ict', en: 'ICT', bn: 'তথ্য ও যোগাযোগ প্রযুক্তি' },
                ],
            },
            {
                code: 'hsc_business',
                en: 'HSC Business Studies',
                bn: 'এইচএসসি (বাণিজ্য)',
                topics: [
                    { code: 'accounting_1', en: 'Accounting 1st', bn: 'হিসাববিজ্ঞান ১ম পত্র' },
                    { code: 'accounting_2', en: 'Accounting 2nd', bn: 'হিসাববিজ্ঞান ২য় পত্র' },
                    { code: 'finance_1', en: 'Finance & Banking 1st', bn: 'ফিন্যান্স, ব্যাংকিং ও বীমা ১ম পত্র' },
                    { code: 'finance_2', en: 'Finance & Banking 2nd', bn: 'ফিন্যান্স, ব্যাংকিং ও বীমা ২য় পত্র' },
                    { code: 'management_1', en: 'Management 1st', bn: 'ব্যবস্থাপনা ১ম পত্র' },
                    { code: 'management_2', en: 'Management 2nd', bn: 'ব্যবস্থাপনা ২য় পত্র' },
                    { code: 'production_marketing_1', en: 'Production Mgmt & Marketing 1st', bn: 'উৎপাদন ব্যবস্থাপনা ও বিপণন ১ম পত্র' },
                    { code: 'production_marketing_2', en: 'Production Mgmt & Marketing 2nd', bn: 'উৎপাদন ব্যবস্থাপনা ও বিপণন ২য় পত্র' },
                ],
            },
            {
                code: 'ssc_science',
                en: 'SSC Science',
                bn: 'এসএসসি (বিজ্ঞান)',
                topics: [
                    { code: 'physics', en: 'Physics', bn: 'পদার্থবিজ্ঞান' },
                    { code: 'chemistry', en: 'Chemistry', bn: 'রসায়ন' },
                    { code: 'higher_math', en: 'Higher Mathematics', bn: 'উচ্চতর গণিত' },
                    { code: 'general_math', en: 'General Mathematics', bn: 'সাধারণ গণিত' },
                    { code: 'biology', en: 'Biology', bn: 'জীববিজ্ঞান' },
                    { code: 'ict', en: 'ICT', bn: 'তথ্য ও যোগাযোগ প্রযুক্তি' },
                    { code: 'bangla_1', en: 'Bangla 1st Paper', bn: 'বাংলা ১ম পত্র' },
                    { code: 'bangla_2', en: 'Bangla 2nd Paper', bn: 'বাংলা ২য় পত্র' },
                    { code: 'english_1', en: 'English 1st Paper', bn: 'ইংরেজি ১ম পত্র' },
                    { code: 'english_2', en: 'English 2nd Paper', bn: 'ইংরেজি ২য় পত্র' },
                    { code: 'religion', en: 'Religion', bn: 'ধর্ম ও নৈতিক শিক্ষা' },
                ],
            },
            {
                code: 'ssc_humanities',
                en: 'SSC Humanities',
                bn: 'এসএসসি (মানবিক)',
                topics: [
                    { code: 'bd_history', en: 'BD History & World Civ', bn: 'বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা' },
                    { code: 'geography', en: 'Geography & Environment', bn: 'ভূগোল ও পরিবেশ' },
                    { code: 'civics', en: 'Civics & Citizenship', bn: 'পৌরনীতি ও নাগরিকতা' },
                    { code: 'economics', en: 'Economics', bn: 'অর্থনীতি' },
                ],
            },
            {
                code: 'ssc_business',
                en: 'SSC Business Studies',
                bn: 'এসএসসি (বাণিজ্য)',
                topics: [
                    { code: 'accounting', en: 'Accounting', bn: 'হিসাববিজ্ঞান' },
                    { code: 'finance', en: 'Finance & Banking', bn: 'ফিন্যান্স ও ব্যাংকিং' },
                    { code: 'business_entrepreneurship', en: 'Business Entrepreneurship', bn: 'ব্যবসায় উদ্যোগ' },
                ],
            },
        ],
    },
    // ─────────────────────────────────────────────────────────────────────
    {
        code: 'job_exams',
        en: 'Job Recruitment Exams',
        bn: 'চাকরির পরীক্ষা',
        color: '#8B5CF6',
        description: { en: 'BCS, Bank, Primary teacher recruitment', bn: 'বিসিএস, ব্যাংক, প্রাথমিক শিক্ষক নিয়োগ পরীক্ষা' },
        categories: [
            {
                code: 'bcs_preliminary',
                en: 'BCS Preliminary',
                bn: 'বিসিএস প্রিলিমিনারি',
                topics: [
                    { code: 'bangla', en: 'Bangla', bn: 'বাংলা ভাষা ও সাহিত্য' },
                    { code: 'english', en: 'English', bn: 'ইংরেজি ভাষা ও সাহিত্য' },
                    { code: 'math', en: 'Mathematical Reasoning', bn: 'গাণিতিক যুক্তি' },
                    { code: 'mental_ability', en: 'Mental Ability', bn: 'মানসিক দক্ষতা' },
                    { code: 'gk_bd', en: 'GK – Bangladesh Affairs', bn: 'বাংলাদেশ বিষয়াবলী' },
                    { code: 'gk_intl', en: 'GK – International Affairs', bn: 'আন্তর্জাতিক বিষয়াবলী' },
                    { code: 'geography_environment', en: 'Geography & Environment', bn: 'ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা' },
                    { code: 'general_science', en: 'General Science', bn: 'সাধারণ বিজ্ঞান' },
                    { code: 'computer_ict', en: 'Computer & ICT', bn: 'কম্পিউটার ও তথ্যপ্রযুক্তি' },
                    { code: 'ethics', en: 'Ethics, Values & Good Governance', bn: 'নৈতিকতা, মূল্যবোধ ও সুশাসন' },
                ],
            },
            {
                code: 'bank_job',
                en: 'Bank Recruitment',
                bn: 'ব্যাংক নিয়োগ পরীক্ষা',
                topics: [
                    { code: 'bangla', en: 'Bangla', bn: 'বাংলা' },
                    { code: 'english', en: 'English', bn: 'ইংরেজি' },
                    { code: 'math', en: 'Mathematics', bn: 'গণিত' },
                    { code: 'analytical', en: 'Analytical Ability', bn: 'বিশ্লেষণ দক্ষতা' },
                    { code: 'gk', en: 'General Knowledge', bn: 'সাধারণ জ্ঞান' },
                    { code: 'computer', en: 'Computer', bn: 'কম্পিউটার' },
                ],
            },
            {
                code: 'primary_teacher',
                en: 'Primary Teacher Recruitment',
                bn: 'প্রাথমিক শিক্ষক নিয়োগ',
                topics: [
                    { code: 'bangla', en: 'Bangla', bn: 'বাংলা' },
                    { code: 'english', en: 'English', bn: 'ইংরেজি' },
                    { code: 'math', en: 'Mathematics', bn: 'গণিত' },
                    { code: 'gk', en: 'General Knowledge', bn: 'সাধারণ জ্ঞান' },
                ],
            },
        ],
    },
];

async function seedTopicsRecursive(
    nodes: SeedTopic[],
    categoryId: mongoose.Types.ObjectId,
    groupId: mongoose.Types.ObjectId,
    parentId: mongoose.Types.ObjectId | null,
): Promise<number> {
    let count = 0;
    let order = 0;
    for (const node of nodes) {
        const topic = await QuestionTopic.findOneAndUpdate(
            { category_id: categoryId, code: node.code },
            {
                $set: {
                    category_id: categoryId,
                    group_id: groupId,
                    parent_id: parentId,
                    code: node.code,
                    title: { en: node.en, bn: node.bn },
                    order: order++,
                    isActive: true,
                },
            },
            { upsert: true, new: true },
        );
        count += 1;
        if (node.children && node.children.length > 0) {
            count += await seedTopicsRecursive(
                node.children,
                categoryId,
                groupId,
                topic._id as mongoose.Types.ObjectId,
            );
        }
    }
    return count;
}

export async function seedQuestionTaxonomy(): Promise<void> {
    console.log('[seed:taxonomy] Seeding question taxonomy (groups, categories, topics)...');

    let totalGroups = 0;
    let totalCategories = 0;
    let totalTopics = 0;

    let groupOrder = 0;
    for (const groupSeed of TAXONOMY) {
        const group = await QuestionGroup.findOneAndUpdate(
            { code: groupSeed.code },
            {
                $set: {
                    code: groupSeed.code,
                    title: { en: groupSeed.en, bn: groupSeed.bn },
                    description: groupSeed.description ?? { en: '', bn: '' },
                    color: groupSeed.color ?? '',
                    iconUrl: groupSeed.iconUrl ?? '',
                    order: groupOrder++,
                    isActive: true,
                },
            },
            { upsert: true, new: true },
        );
        totalGroups += 1;
        const groupId = group._id as mongoose.Types.ObjectId;

        let categoryOrder = 0;
        for (const categorySeed of groupSeed.categories) {
            const category = await QuestionCategory.findOneAndUpdate(
                { group_id: groupId, code: categorySeed.code },
                {
                    $set: {
                        group_id: groupId,
                        parent_id: null,
                        code: categorySeed.code,
                        title: { en: categorySeed.en, bn: categorySeed.bn },
                        description: categorySeed.description ?? { en: '', bn: '' },
                        order: categoryOrder++,
                        isActive: true,
                    },
                },
                { upsert: true, new: true },
            );
            totalCategories += 1;

            totalTopics += await seedTopicsRecursive(
                categorySeed.topics,
                category._id as mongoose.Types.ObjectId,
                groupId,
                null,
            );
        }
    }

    console.log(
        `[seed:taxonomy] Done. Upserted: ${totalGroups} groups, ${totalCategories} categories, ${totalTopics} topics.`,
    );
}

if (require.main === module) {
    (async () => {
        await connectDB();
        await seedQuestionTaxonomy();
    })()
        .catch((error) => {
            console.error('[seed:taxonomy] Failed:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.connection.close();
            }
        });
}
