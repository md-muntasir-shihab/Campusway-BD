/**
 * CampusWay Production Seeder
 * Seeds: Subscription Plans, Featured Universities, 50+ Demo Students, Resources
 *
 * Run with: npx tsx src/scripts/seed_live_production.ts
 */

import fetch from 'node-fetch';

const BASE_URL = 'https://campusway-backend.onrender.com/api';
const ADMIN_EMAIL = 'admin@campusway.com';
const ADMIN_PASSWORD = 'admin123456';

let TOKEN = '';

function log(msg: string) { console.log(`[SEED] ${msg}`); }
function err(msg: string) { console.error(`[ERROR] ${msg}`); }

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function apiGet(path: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return res.json() as Promise<any>;
}

async function apiPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<any>;
}

async function apiPut(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<any>;
}

// ============================================================
// 1. Admin Login
// ============================================================
async function doLogin() {
  log('Logging in as admin...');
  const res = await fetch(`${BASE_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  const data = await res.json() as any;
  if (data?.token) {
    TOKEN = data.token;
    log(`Login successful. Token received.`);
  } else if (data?.accessToken) {
    TOKEN = data.accessToken;
    log(`Login successful. Access token received.`);
  } else {
    err(`Login failed: ${JSON.stringify(data)}`);
    process.exit(1);
  }
}

// ============================================================
// 2. Mark Universities as Featured
// ============================================================
async function featureUniversities() {
  log('Fetching universities...');
  const data = await apiGet('/campusway-secure-admin/universities?limit=100&page=1');
  const universities: any[] = data?.universities || data?.data || data?.items || [];
  if (!universities.length) {
    err('No universities found!');
    return;
  }

  log(`Found ${universities.length} universities. Marking top ones as featured...`);

  // Pick top universities by name priority
  const preferredSlugs = [
    'dhaka-university', 'buet', 'du', 'dhaka', 'chittagong',
    'rajshahi', 'jahangirnagar', 'khulna', 'brac', 'north-south',
  ];

  let featured = universities.filter((u: any) =>
    preferredSlugs.some((slug) =>
      String(u.slug || u.name || '').toLowerCase().includes(slug)
    )
  ).slice(0, 8);

  if (featured.length < 5) {
    featured = universities.slice(0, 8);
  }

  let count = 0;
  for (const [idx, uni] of featured.entries()) {
    const id = uni._id || uni.id;
    if (!id) continue;
    const result = await apiPut(`/campusway-secure-admin/universities/${id}`, {
      featured: true,
      featuredOrder: idx + 1,
    });
    if (result?.university || result?._id || result?.name || result?.message) {
      log(`  ✅ Featured: ${uni.name || uni.shortForm || id}`);
      count++;
    } else {
      err(`  ❌ Failed to feature: ${uni.name} - ${JSON.stringify(result)}`);
    }
    await sleep(300);
  }
  log(`Featured ${count} universities.`);
}

// ============================================================
// 3. Create Subscription Plans
// ============================================================
async function createPlans() {
  log('Creating 3 subscription plans...');

  const plans = [
    {
      name: 'ভর্তি বেসিক',
      code: 'ADMISSION_BASIC',
      slug: 'admission-basic',
      shortTitle: 'বেসিক',
      shortLabel: 'Basic',
      tagline: 'বিশ্ববিদ্যালয় ভর্তি প্রস্তুতির শুরু করুন',
      type: 'free',
      planType: 'free',
      priceBDT: 0,
      price: 0,
      isFree: true,
      durationDays: 30,
      durationValue: 30,
      durationUnit: 'days',
      durationLabel: '৩০ দিন',
      validityLabel: '৩০ দিন বিনামূল্যে',
      features: [
        'বিশ্ববিদ্যালয় তালিকা দেখুন',
        'মৌলিক তথ্য ও ভর্তি বিজ্ঞপ্তি',
        'সীমিত মডেল টেস্ট (৫টি)',
        'রিসোর্স লাইব্রেরি (মৌলিক)',
        'খবর ও আপডেট',
      ],
      fullFeatures: [
        'বিশ্ববিদ্যালয় তালিকা দেখুন',
        'মৌলিক তথ্য ও ভর্তি বিজ্ঞপ্তি',
        'সীমিত মডেল টেস্ট (৫টি)',
        'রিসোর্স লাইব্রেরি (মৌলিক)',
        'খবর ও আপডেট',
      ],
      excludedFeatures: [
        'সীমাহীন মডেল টেস্ট',
        'AI পরামর্শ সেবা',
        'SMS আপডেট',
        'প্রিমিয়াম স্টাডি মেটেরিয়াল',
      ],
      includedModules: ['universities', 'news', 'basic_exams', 'basic_resources'],
      allowsExams: true,
      allowsPremiumResources: false,
      allowsSMSUpdates: false,
      allowsEmailUpdates: true,
      maxAttempts: 5,
      themeKey: 'basic',
      badgeText: 'বিনামূল্যে',
      ctaLabel: 'বিনামূল্যে শুরু করুন',
      ctaMode: 'internal',
      supportLevel: 'basic',
      isActive: true,
      isFeatured: false,
      showOnHome: true,
      showOnPricingPage: true,
      priority: 10,
      sortOrder: 1,
      displayOrder: 1,
      recommendedFor: 'নতুন শিক্ষার্থী যারা ভর্তি প্রস্তুতি শুরু করতে চান',
      shortDescription: 'ভর্তি প্রস্তুতির প্রথম ধাপ। মৌলিক তথ্য, বিশ্ববিদ্যালয় তালিকা এবং সীমিত মডেল টেস্ট সুবিধা।',
      fullDescription: 'CampusWay বেসিক প্ল্যানটি সম্পূর্ণ বিনামূল্যে পাওয়া যায়। এটি শিক্ষার্থীদের বিশ্ববিদ্যালয় ভর্তি সংক্রান্ত মৌলিক তথ্য, আসন সংখ্যা, পরীক্ষার তারিখ এবং সীমিত মডেল টেস্টের সুযোগ দেয়।',
      tags: ['বিনামূল্যে', 'মৌলিক', 'ভর্তি'],
    },
    {
      name: 'ভর্তি স্ট্যান্ডার্ড',
      code: 'ADMISSION_STANDARD',
      slug: 'admission-standard',
      shortTitle: 'স্ট্যান্ডার্ড',
      shortLabel: 'Standard',
      tagline: 'সম্পূর্ণ ভর্তি প্রস্তুতি এক প্যাকেজে',
      type: 'paid',
      planType: 'paid',
      priceBDT: 499,
      price: 499,
      oldPrice: 799,
      currency: 'BDT',
      isFree: false,
      isPaid: true,
      billingCycle: 'one_time',
      durationDays: 180,
      durationValue: 6,
      durationUnit: 'months',
      durationLabel: '৬ মাস',
      validityLabel: '৬ মাস (৪৯৯ টাকা)',
      priceLabel: '৪৯৯ টাকা',
      features: [
        'সীমাহীন মডেল টেস্ট',
        'সকল বিশ্ববিদ্যালয়ের সম্পূর্ণ তথ্য',
        'বিগত বছরের প্রশ্নপত্র',
        'সম্পূর্ণ রিসোর্স লাইব্রেরি',
        'ফলাফল ও র‍্যাংকিং বিশ্লেষণ',
        'Email আপডেট',
        'প্রিমিয়াম স্টাডি মেটেরিয়াল',
        'ক্যারিয়ার গাইড',
      ],
      fullFeatures: [
        'সীমাহীন মডেল টেস্ট',
        'সকল বিশ্ববিদ্যালয়ের সম্পূর্ণ তথ্য',
        'বিগত বছরের প্রশ্নপত্র',
        'সম্পূর্ণ রিসোর্স লাইব্রেরি',
        'ফলাফল ও র‍্যাংকিং বিশ্লেষণ',
        'Email আপডেট',
        'প্রিমিয়াম স্টাডি মেটেরিয়াল',
        'ক্যারিয়ার গাইড',
      ],
      excludedFeatures: [
        'SMS আলার্ট',
        'অভিভাবক নোটিফিকেশন',
        'ব্যক্তিগত মেন্টর সেশন',
      ],
      includedModules: ['universities', 'news', 'exams', 'resources', 'analytics'],
      allowsExams: true,
      allowsPremiumResources: true,
      allowsSMSUpdates: false,
      allowsEmailUpdates: true,
      allowsGuardianAlerts: false,
      maxAttempts: null,
      themeKey: 'standard',
      badgeText: 'জনপ্রিয়',
      highlightText: '৩৮% ছাড়',
      ctaLabel: 'এখনই কিনুন',
      ctaMode: 'request_payment',
      supportLevel: 'priority',
      isActive: true,
      isFeatured: true,
      showOnHome: true,
      showOnPricingPage: true,
      priority: 20,
      sortOrder: 2,
      displayOrder: 2,
      recommendedFor: 'HSC শেষ করা শিক্ষার্থী যারা বিশ্ববিদ্যালয়ে ভর্তি হতে চান',
      shortDescription: '৬ মাসের জন্য সম্পূর্ণ ভর্তি প্রস্তুতি প্যাকেজ। সীমাহীন মডেল টেস্ট, প্রিমিয়াম স্টাডি মেটেরিয়াল এবং আরও অনেক কিছু।',
      fullDescription: 'CampusWay স্ট্যান্ডার্ড প্ল্যান বাংলাদেশের সেরা বিশ্ববিদ্যালয়গুলোতে ভর্তির জন্য আপনাকে সম্পূর্ণ প্রস্তুত করবে। সীমাহীন মডেল টেস্ট, বিগত বছরের প্রশ্নপত্র বিশ্লেষণ, প্রিমিয়াম স্টাডি মেটেরিয়াল এবং পারফরম্যান্স ট্র্যাকিং সব এক জায়গায়।',
      comparisonNote: 'বেসিক প্ল্যানের তুলনায় ৫x বেশি সুবিধা',
      tags: ['জনপ্রিয়', 'সম্পূর্ণ', 'ভর্তি', 'প্রস্তুতি'],
    },
    {
      name: 'ভর্তি প্রিমিয়াম',
      code: 'ADMISSION_PREMIUM',
      slug: 'admission-premium',
      shortTitle: 'প্রিমিয়াম',
      shortLabel: 'Premium',
      tagline: 'সর্বোচ্চ সুবিধা, সর্বোচ্চ সাফল্য',
      type: 'paid',
      planType: 'paid',
      priceBDT: 999,
      price: 999,
      oldPrice: 1499,
      currency: 'BDT',
      isFree: false,
      isPaid: true,
      billingCycle: 'one_time',
      durationDays: 365,
      durationValue: 12,
      durationUnit: 'months',
      durationLabel: '১ বছর',
      validityLabel: '১ বছর (৯৯৯ টাকা)',
      priceLabel: '৯৯৯ টাকা',
      features: [
        'সকল স্ট্যান্ডার্ড সুবিধা',
        'SMS আলার্ট ও অভিভাবক নোটিফিকেশন',
        'অ্যাডমিশন কাউন্সেলিং',
        'AI-চালিত দুর্বলতা চিহ্নিতকরণ',
        'ব্যক্তিগতকৃত স্টাডি প্ল্যান',
        'লাইভ সেশন ও রিকর্ডিং',
        'অগ্রাধিকার সাপোর্ট',
        'সার্টিফিকেট অফ কমপ্লিশন',
        'বিশেষ গ্রুপে অ্যাক্সেস',
      ],
      fullFeatures: [
        'সকল স্ট্যান্ডার্ড সুবিধা',
        'SMS আলার্ট ও অভিভাবক নোটিফিকেশন',
        'অ্যাডমিশন কাউন্সেলিং',
        'AI-চালিত দুর্বলতা চিহ্নিতকরণ',
        'ব্যক্তিগতকৃত স্টাডি প্ল্যান',
        'লাইভ সেশন ও রিকর্ডিং',
        'অগ্রাধিকার সাপোর্ট',
        'সার্টিফিকেট অফ কমপ্লিশন',
        'বিশেষ গ্রুপে অ্যাক্সেস',
      ],
      excludedFeatures: [],
      includedModules: ['universities', 'news', 'exams', 'resources', 'analytics', 'sms', 'guardian_alerts', 'special_groups'],
      allowsExams: true,
      allowsPremiumResources: true,
      allowsSMSUpdates: true,
      allowsEmailUpdates: true,
      allowsGuardianAlerts: true,
      allowsSpecialGroups: true,
      maxAttempts: null,
      themeKey: 'premium',
      badgeText: '✨ সেরা মূল্য',
      highlightText: '৩৩% ছাড়',
      ctaLabel: 'প্রিমিয়াম নিন',
      ctaMode: 'request_payment',
      supportLevel: 'premium',
      isActive: true,
      isFeatured: true,
      showOnHome: true,
      showOnPricingPage: true,
      priority: 30,
      sortOrder: 3,
      displayOrder: 3,
      recommendedFor: 'যারা সর্বোচ্চ প্রস্তুতি নিয়ে স্বপ্নের বিশ্ববিদ্যালয়ে ভর্তি হতে চান',
      shortDescription: '১ বছরের সম্পূর্ণ প্রিমিয়াম প্যাকেজ। AI কোচিং, SMS আলার্ট, অভিভাবক নোটিফিকেশন এবং সর্বোচ্চ সাপোর্ট সহ।',
      fullDescription: 'CampusWay প্রিমিয়াম প্ল্যান তাদের জন্য যারা সর্বোচ্চ প্রস্তুতি নিতে চান। AI-চালিত দুর্বলতা চিহ্নিতকরণ, ব্যক্তিগতকৃত স্টাডি প্ল্যান, SMS আলার্ট, অগ্রাধিকার সাপোর্ট এবং আরও অনেক এক্সক্লুসিভ সুবিধা পাবেন।',
      comparisonNote: 'সর্বোচ্চ সাফল্যের নিশ্চয়তা',
      tags: ['প্রিমিয়াম', 'সেরা', 'AI', 'কাউন্সেলিং', 'ভর্তি'],
    },
  ];

  let created = 0;
  for (const plan of plans) {
    const result = await apiPost('/campusway-secure-admin/subscription-plans', plan as Record<string, unknown>);
    if (result?._id || result?.plan?._id || result?.id) {
      log(`  ✅ Plan created: ${plan.name} (${plan.priceBDT} BDT)`);
      created++;
    } else {
      err(`  ❌ Plan failed: ${plan.name} - ${JSON.stringify(result).slice(0, 200)}`);
    }
    await sleep(500);
  }
  log(`Created ${created}/3 plans.`);
}

// ============================================================
// 4. Create 50+ Demo Students
// ============================================================
async function createStudents() {
  log('Creating 55 demo students...');

  const names = [
    'রাহুল হোসেন', 'সানজিদা আক্তার', 'মেহেদী হাসান', 'তানজিলা ইসলাম', 'আরিফ রহমান',
    'নাফিসা খানম', 'সজীব আহমেদ', 'সুমাইয়া বেগম', 'ইমরান খান', 'রিমা চৌধুরী',
    'শাকিল মাহমুদ', 'নাসরিন সুলতানা', 'তামিম আহমেদ', 'মুন্নি আক্তার', 'রাকিব হোসেন',
    'শিরিন আখতার', 'নওয়াব আলী', 'ফারিহা ইসলাম', 'সোহাগ মিয়া', 'রুবিনা আক্তার',
    'কামাল হোসেন', 'সাবিনা ইয়াসমিন', 'জাহিদ হাসান', 'শাম্মী আক্তার', 'বিপ্লব কুমার',
    'লিমা বেগম', 'মাহফুজ আলম', 'পপি আক্তার', 'আবির হোসেন', 'তানিয়া সুলতানা',
    'রনি আহমেদ', 'নুসরাত জাহান', 'সাইফুল ইসলাম', 'আফরিন আক্তার', 'হাসান আহমেদ',
    'মিথিলা রানী', 'রবিউল ইসলাম', 'সিমু আক্তার', 'তৌহিদ হোসেন', 'জান্নাতুল ফেরদৌস',
    'সালমান মাহমুদ', 'ঐশী সরকার', 'রেজাউল করিম', 'মাহিয়া মাহি', 'শান্ত দাস',
    'আঁচল বেগম', 'শাহরিয়ার হোসেন', 'নাজনীন আক্তার', 'পলাশ মিয়া', 'কাকলী বেগম',
    'আলামিন হোসেন', 'সৃষ্টি আক্তার', 'রেহান আহমেদ', 'তমাল দাস', 'মিতু আক্তার',
  ];

  const departments = ['Science', 'Arts', 'Commerce', 'Engineering', 'Medical'];
  const districts = ['Dhaka', 'Chittagong', 'Rajshahi', 'Sylhet', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh'];
  const colleges = [
    'Notre Dame College', 'Holy Cross College', 'Dhaka College', 'Rajshahi College',
    'Chittagong College', 'Government Science College', 'Adamjee Cantonment College',
    'BN School & College', 'Ideal School & College', 'BIAM Model School & College',
  ];
  const sscBatches = ['2020', '2021', '2022', '2023'];
  const hscBatches = ['2022', '2023', '2024', '2025'];
  const genders = ['male', 'female'];

  let created = 0;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const slug = name
      .replace(/\s+/g, '')
      .toLowerCase()
      .replace(/[^\w]/g, '')
      + `${i}`;
    const emailSlug = `student${String(i + 1).padStart(3, '0')}`;
    const email = `${emailSlug}@campuswayseed.dev`;
    const dept = departments[i % departments.length];
    const district = districts[i % districts.length];
    const college = colleges[i % colleges.length];
    const sscBatch = sscBatches[i % sscBatches.length];
    const hscBatch = hscBatches[i % hscBatches.length];
    const gender = genders[i % genders.length] as 'male' | 'female';
    const phone = `017${String(10000000 + i)}`;

    const payload = {
      full_name: name,
      email,
      password: 'CampusWay@2025',
      phone_number: phone,
      department: dept,
      ssc_batch: sscBatch,
      hsc_batch: hscBatch,
      college_name: college,
      gender,
      district,
      sendCredentials: false,
    };

    const result = await apiPost('/campusway-secure-admin/students-v2/create', payload);
    if (result?.student?._id || result?.user?._id || result?.message?.includes('created')) {
      log(`  ✅ Student ${i + 1}/${names.length}: ${name} (${email})`);
      created++;
    } else {
      err(`  ❌ Student failed: ${name} - ${JSON.stringify(result).slice(0, 150)}`);
    }
    await sleep(400);
  }

  log(`Created ${created}/${names.length} students.`);
}

// ============================================================
// 5. Create Resources
// ============================================================
async function createResources() {
  log('Creating resources...');

  const resources = [
    {
      title: 'ঢাকা বিশ্ববিদ্যালয় ভর্তি গাইড ২০২৫-২৬',
      slug: 'du-admission-guide-2025',
      category: 'admission_guide',
      type: 'article',
      body: 'ঢাকা বিশ্ববিদ্যালয়ে ভর্তির জন্য সম্পূর্ণ গাইড। আসন বিন্যাস, পরীক্ষার ধরন, প্রস্তুতির কৌশল এবং আবেদন প্রক্রিয়া সম্পর্কে বিস্তারিত তথ্য।',
      tags: ['ঢাকা বিশ্ববিদ্যালয়', 'ভর্তি', 'গাইড'],
      isPublished: true,
      isFeatured: true,
    },
    {
      title: 'বুয়েট ভর্তি পরীক্ষার প্রস্তুতি কৌশল',
      slug: 'buet-admission-preparation',
      category: 'study_material',
      type: 'article',
      body: 'বুয়েট ভর্তি পরীক্ষায় সফল হতে কী কী বিষয়ে দক্ষতা অর্জন করতে হবে, কীভাবে পদার্থবিজ্ঞান, রসায়ন এবং গণিতে প্রস্তুতি নেবেন তার বিস্তারিত।',
      tags: ['বুয়েট', 'প্রকৌশল', 'প্রস্তুতি'],
      isPublished: true,
      isFeatured: true,
    },
    {
      title: 'HSC পদার্থবিজ্ঞান - গুরুত্বপূর্ণ অধ্যায় ও টপিক',
      slug: 'hsc-physics-important-topics',
      category: 'study_material',
      type: 'article',
      body: 'HSC পদার্থবিজ্ঞানের যে অধ্যায়গুলো থেকে সবচেয়ে বেশি প্রশ্ন আসে। বিভিন্ন বিশ্ববিদ্যালয়ের ভর্তি পরীক্ষায় গুরুত্বপূর্ণ টপিকসমূহ নিয়ে বিস্তারিত আলোচনা।',
      tags: ['পদার্থবিজ্ঞান', 'HSC', 'বিজ্ঞান'],
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'HSC রসায়ন - বিগত বছরের গুরুত্বপূর্ণ MCQ',
      slug: 'hsc-chemistry-mcq-previous-years',
      category: 'question_bank',
      type: 'article',
      body: 'HSC রসায়নের বিগত ৫ বছরের গুরুত্বপূর্ণ MCQ প্রশ্ন ও উত্তর। বিশ্ববিদ্যালয় ভর্তি পরীক্ষার জন্য বিশেষভাবে নির্বাচিত।',
      tags: ['রসায়ন', 'MCQ', 'বিগত বছর'],
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'বাংলাদেশের শীর্ষ ১০ পাবলিক বিশ্ববিদ্যালয় তুলনামূলক বিশ্লেষণ',
      slug: 'top-10-public-universities-bangladesh',
      category: 'university_info',
      type: 'article',
      body: 'বাংলাদেশের শীর্ষ পাবলিক বিশ্ববিদ্যালয়গুলোর তুলনামূলক বিশ্লেষণ: ঢাকা বিশ্ববিদ্যালয়, বুয়েট, রাজশাহী বিশ্ববিদ্যালয়, জাহাঙ্গীরনগর বিশ্ববিদ্যালয় সহ আরও অনেক।',
      tags: ['বিশ্ববিদ্যালয়', 'র‍্যাংকিং', 'পাবলিক'],
      isPublished: true,
      isFeatured: true,
    },
    {
      title: 'গণিত দ্রুত সমাধানের কৌশল - ভর্তি পরীক্ষা',
      slug: 'math-quick-solving-techniques-admission',
      category: 'study_material',
      type: 'article',
      body: 'বিশ্ববিদ্যালয় ভর্তি পরীক্ষায় গণিত অংশে দ্রুত এবং নির্ভুলভাবে উত্তর করার কৌশল। শর্টকাট পদ্ধতি ও স্মার্ট টেকনিক।',
      tags: ['গণিত', 'কৌশল', 'শর্টকাট'],
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'ইংরেজি প্রস্তুতি: ভর্তি পরীক্ষার জন্য গুরুত্বপূর্ণ Grammar',
      slug: 'english-grammar-admission-exam',
      category: 'study_material',
      type: 'article',
      body: 'বিশ্ববিদ্যালয় ভর্তি পরীক্ষার ইংরেজি অংশে যে Grammar টপিকগুলো থেকে সবচেয়ে বেশি প্রশ্ন আসে। বিস্তারিত ব্যাখ্যা ও উদাহরণ সহ।',
      tags: ['ইংরেজি', 'Grammar', 'ভর্তি'],
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'মেডিকেল ভর্তি পরীক্ষা ২০২৫ - সম্পূর্ণ গাইড',
      slug: 'medical-admission-guide-2025',
      category: 'admission_guide',
      type: 'article',
      body: 'MBBS ভর্তি পরীক্ষার প্রস্তুতির জন্য সম্পূর্ণ গাইড। জীববিজ্ঞান, পদার্থবিজ্ঞান ও রসায়নে কীভাবে প্রস্তুতি নেবেন, সিটের সংখ্যা ও আবেদন প্রক্রিয়া।',
      tags: ['মেডিকেল', 'MBBS', 'প্রস্তুতি'],
      isPublished: true,
      isFeatured: true,
    },
    {
      title: 'জাতীয় বিশ্ববিদ্যালয় অনার্স ভর্তি: আবেদন প্রক্রিয়া ও টিপস',
      slug: 'national-university-honours-admission',
      category: 'admission_guide',
      type: 'article',
      body: 'জাতীয় বিশ্ববিদ্যালয়ের অধীনে অনার্স ভর্তির সম্পূর্ণ প্রক্রিয়া। মেধা তালিকা, কলেজ নির্বাচন, আবেদন ফর্ম পূরণের নির্দেশিকা।',
      tags: ['জাতীয় বিশ্ববিদ্যালয়', 'অনার্স', 'ভর্তি'],
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'সাধারণ জ্ঞান: বাংলাদেশ বিষয়াবলি - ভর্তি পরীক্ষা',
      slug: 'general-knowledge-bangladesh-admission',
      category: 'study_material',
      type: 'article',
      body: 'বিশ্ববিদ্যালয় ভর্তি পরীক্ষায় সাধারণ জ্ঞান অংশে বাংলাদেশ বিষয়াবলি থেকে গুরুত্বপূর্ণ প্রশ্ন ও উত্তর। মুক্তিযুদ্ধ, সংবিধান, ভূগোল সহ সকল বিষয়।',
      tags: ['সাধারণ জ্ঞান', 'বাংলাদেশ', 'ভর্তি'],
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'প্রাইভেট বিশ্ববিদ্যালয় ভর্তি: BRAC, NSU, EWU তুলনামূলক তথ্য',
      slug: 'private-university-admission-comparison',
      category: 'university_info',
      type: 'article',
      body: 'বাংলাদেশের শীর্ষ প্রাইভেট বিশ্ববিদ্যালয়গুলোর তুলনামূলক তথ্য: BRAC University, North South University, East West University সহ সকল প্রাইভেট বিশ্ববিদ্যালয়।',
      tags: ['প্রাইভেট', 'বিশ্ববিদ্যালয়', 'BRAC', 'NSU'],
      isPublished: true,
      isFeatured: false,
    },
    {
      title: 'ভর্তি পরীক্ষার শেষ মুহূর্তের প্রস্তুতি টিপস',
      slug: 'last-minute-admission-exam-tips',
      category: 'tips_tricks',
      type: 'article',
      body: 'পরীক্ষার আগের ৭ দিন কীভাবে সর্বোচ্চ প্রস্তুতি নেবেন। রিভিশন কৌশল, মানসিক স্বাস্থ্য, ঘুম ও খাদ্যাভ্যাস সম্পর্কে বিশেষজ্ঞ পরামর্শ।',
      tags: ['টিপস', 'প্রস্তুতি', 'শেষ মুহূর্ত'],
      isPublished: true,
      isFeatured: true,
    },
  ];

  let created = 0;
  for (const resource of resources) {
    const result = await apiPost('/campusway-secure-admin/resources', resource as Record<string, unknown>);
    if (result?._id || result?.resource?._id || result?.id) {
      log(`  ✅ Resource: ${resource.title}`);
      created++;
    } else {
      err(`  ❌ Resource failed: ${resource.title} - ${JSON.stringify(result).slice(0, 150)}`);
    }
    await sleep(300);
  }

  log(`Created ${created}/${resources.length} resources.`);
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('');
  console.log('=======================================================');
  console.log('  CampusWay Production Seeder');
  console.log('  Target: https://campusway-backend.onrender.com/api');
  console.log('=======================================================');
  console.log('');

  await doLogin();

  console.log('');
  log('--- Step 1: Featuring Universities ---');
  await featureUniversities();

  console.log('');
  log('--- Step 2: Creating Subscription Plans ---');
  await createPlans();

  console.log('');
  log('--- Step 3: Creating 55 Demo Students ---');
  await createStudents();

  console.log('');
  log('--- Step 4: Creating Resources ---');
  await createResources();

  console.log('');
  console.log('=======================================================');
  console.log('  ✅ Seeding Complete!');
  console.log('=======================================================');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
