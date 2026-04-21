import type {
    ApiAboutStaticPageConfig,
    ApiFounderContactLink,
    ApiFounderEducation,
    ApiFounderProfile,
    ApiStaticFeatureCard,
    ApiStaticPageConfig,
    ApiStaticPageSection,
    StaticPageTone,
    WebsiteStaticPagesConfig,
} from '../services/api';

export const STATIC_PAGE_ICON_OPTIONS = [
    'info', 'target', 'globe', 'heart', 'graduation-cap', 'book-open',
    'users', 'award', 'file-text', 'shield', 'alert-triangle', 'mail',
    'eye', 'database', 'lock', 'bell',
] as const;

export const STATIC_PAGE_TONE_OPTIONS: StaticPageTone[] = ['neutral', 'info', 'success', 'warning', 'accent'];

function createSection(order: number, title: string, body: string, iconKey: string, tone: StaticPageTone, bullets: string[] = []): ApiStaticPageSection {
    return { title, body, bullets, iconKey, tone, enabled: true, order };
}

function createFeatureCard(order: number, title: string, description: string, iconKey: string): ApiStaticFeatureCard {
    return { title, description, iconKey, enabled: true, order };
}

function createFounder(order: number, name = '', title = '', shortBio = '', photoUrl = '', contactLinks: ApiFounderContactLink[] = [], extra: Partial<ApiFounderProfile> = {}): ApiFounderProfile {
    return {
        name, title, shortBio, photoUrl,
        quote: extra.quote ?? '', fatherName: extra.fatherName ?? '', dateOfBirth: extra.dateOfBirth ?? '',
        gender: extra.gender ?? '', phone: extra.phone ?? '', emergencyPhone: extra.emergencyPhone ?? '',
        email: extra.email ?? '', address: extra.address ?? '', education: extra.education ?? [],
        skills: extra.skills ?? [], experience: extra.experience ?? '',
        contactLinks, enabled: true, order,
    };
}

export function createDefaultWebsiteStaticPages(): WebsiteStaticPagesConfig {
    return {
        about: {
            eyebrow: 'ক্যাম্পাসওয়ে সম্পর্কে',
            title: 'ক্যাম্পাসওয়েতে স্বাগতম',
            subtitle: 'ক্যাম্পাসওয়ে বাংলাদেশের শিক্ষার্থীদের জন্য তৈরি একটি আধুনিক, নির্ভরযোগ্য এবং সমন্বিত শিক্ষা প্ল্যাটফর্ম। আমরা বিশ্বাস করি, ভালো রেজাল্ট শুধু মেধার উপর নির্ভর করে না; সঠিক পরিকল্পনা, নিয়মিত অনুশীলন, নির্ভুল তথ্য এবং সময়মতো গাইডলাইনও সমানভাবে জরুরি।',
            lastUpdatedLabel: 'CampusWay Team কর্তৃক পরিচালিত',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                createSection(1, 'আমাদের ভিশন',
                    'বাংলাদেশের প্রতিটি শিক্ষার্থীর জন্য মানসম্মত শিক্ষা সহায়তাকে সহজলভ্য, সাশ্রয়ী এবং বাস্তবমুখী করা। শহর বা গ্রাম, বাংলা মিডিয়াম বা ইংরেজি মিডিয়াম, অনলাইন বা অফলাইন ব্যাকগ্রাউন্ড—সব শিক্ষার্থী যেন সমান সুযোগ নিয়ে এগোতে পারে, সেটাই আমাদের মূল লক্ষ্য।',
                    'globe', 'success'),
                createSection(2, 'আমাদের মিশন',
                    'শিক্ষার্থীর একাডেমিক যাত্রাকে সহজ, সংগঠিত এবং ফলপ্রসূ করা।',
                    'target', 'info', [
                    'শিক্ষার্থীর একাডেমিক যাত্রাকে সহজ ও সংগঠিত করা',
                    'নির্ভুল তথ্যের ভিত্তিতে সিদ্ধান্ত নেওয়ার সুযোগ তৈরি করা',
                    'অনুশীলনভিত্তিক শেখার সংস্কৃতি গড়ে তোলা',
                    'ভর্তি, পরীক্ষা ও ভবিষ্যৎ পরিকল্পনায় আত্মবিশ্বাস বাড়ানো',
                    'প্রযুক্তির মাধ্যমে শেখাকে আরও ব্যক্তিগত, দ্রুত এবং ফলপ্রসূ করা',
                ]),
                createSection(3, 'কারা ক্যাম্পাসওয়ে ব্যবহার করতে পারবে',
                    'ক্যাম্পাসওয়ে সকল স্তরের শিক্ষার্থীদের জন্য উন্মুক্ত।',
                    'users', 'accent', [
                    'স্কুল ও কলেজ শিক্ষার্থী',
                    'বিশ্ববিদ্যালয় ভর্তি পরীক্ষার্থী',
                    'প্রতিযোগিতামূলক পরীক্ষার প্রস্তুতিমূলক শিক্ষার্থী',
                    'যারা এক জায়গায় পরীক্ষা, রিসোর্স, গাইডলাইন ও অগ্রগতি ট্র্যাকিং চায়',
                    'যারা নিজের পড়াশোনাকে প্ল্যান করে ধারাবাহিকভাবে এগোতে চায়',
                ]),
                createSection(4, 'একজন শিক্ষার্থীর জন্য ক্যাম্পাসওয়ে কেন জরুরি',
                    'ক্যাম্পাসওয়ে শিক্ষার্থীর প্রতিটি পদক্ষেপে সহায়তা করে।',
                    'heart', 'warning', [
                    'দিকনির্দেশনা স্পষ্ট করে — কোথা থেকে শুরু করবে সেটা ধাপে ধাপে সাজিয়ে দেয়',
                    'সময় বাঁচায় — প্রয়োজনীয় কনটেন্ট, রিসোর্স ও আপডেট এক প্ল্যাটফর্মে',
                    'অনুশীলনকে কার্যকর করে — মডেল টেস্ট, কুইজ ও প্র্যাকটিসের মাধ্যমে নিয়মিত যাচাই',
                    'অগ্রগতি বুঝতে সাহায্য করে — ড্যাশবোর্ড ও পারফরম্যান্স বিশ্লেষণ',
                    'ভর্তি প্রস্তুতিতে বাস্তব সহায়তা দেয়',
                    'আপডেটেড থাকতে সাহায্য করে — নিউজ, নোটিশ ও গুরুত্বপূর্ণ ঘোষণা',
                    'সহায়তা পাওয়ার পথ সহজ করে — সাপোর্ট ও হেল্প সেন্টার',
                    'একাডেমিক আত্মবিশ্বাস বাড়ায়',
                ]),
                createSection(5, 'শিক্ষার্থীর বাস্তব যাত্রাপথে ক্যাম্পাসওয়ের ভূমিকা',
                    'প্ল্যাটফর্মে আসা থেকে শুরু করে দীর্ঘমেয়াদি শেখার ধারাবাহিকতা পর্যন্ত।',
                    'award', 'info', [
                    'শুরু — প্রয়োজনীয় তথ্য, বিশ্ববিদ্যালয়/রিসোর্স/নিউজ দেখে প্রাথমিক ধারণা নেয়',
                    'পরিকল্পনা — লক্ষ্য ঠিক করে, কী পড়বে ও কীভাবে প্রস্তুতি নেবে তা গুছিয়ে নেয়',
                    'অনুশীলন — পরীক্ষা ও প্র্যাকটিসের মাধ্যমে রেগুলার প্রস্তুতি চালায়',
                    'মূল্যায়ন — রেজাল্ট ও পারফরম্যান্স দেখে দুর্বল দিক শনাক্ত করে',
                    'উন্নয়ন — ফিডব্যাক অনুযায়ী স্টাডি প্ল্যান আপডেট করে',
                    'ধারাবাহিকতা — নোটিফিকেশন, সাপোর্ট ও আপডেটের মাধ্যমে শেখার গতি ধরে রাখে',
                ]),
                createSection(6, 'বিশ্বাস, নিরাপত্তা ও দায়িত্ব',
                    'আমরা শিক্ষার্থীর অভিজ্ঞতাকে গুরুত্ব দিই। তাই প্ল্যাটফর্মে ব্যবহারযোগ্যতা, অ্যাক্সেস কন্ট্রোল, দায়িত্বশীল কনটেন্ট ম্যানেজমেন্ট এবং শেখাকে সহায়ক করার নীতিকে অগ্রাধিকার দেওয়া হয়। আমাদের লক্ষ্য শুধু একটি ওয়েবসাইট নয়; একটি নিরাপদ, কার্যকর এবং দীর্ঘমেয়াদি একাডেমিক ইকোসিস্টেম গড়ে তোলা।',
                    'shield', 'neutral'),
                createSection(7, 'আমাদের প্রতিশ্রুতি',
                    'ক্যাম্পাসওয়ে তোমার একাডেমিক যাত্রার প্রতিটি ধাপে একজন নির্ভরযোগ্য সঙ্গী।\n\nতোমার লক্ষ্য, তোমার গতি, তোমার ভবিষ্যৎ — ক্যাম্পাসওয়ে আছে তোমার পাশে।',
                    'heart', 'accent', [
                    'শিক্ষার্থীকে কেন্দ্র করে প্রতিটি ফিচার উন্নয়ন',
                    'তথ্যকে আরও নির্ভুল, আপডেটেড ও প্রাসঙ্গিক রাখা',
                    'শেখাকে শুধু কনটেন্ট-ভিত্তিক নয়, ফলাফল-ভিত্তিক করা',
                    'বাংলাদেশি শিক্ষার্থীর বাস্তব চাহিদা অনুযায়ী সেবা উন্নত করা',
                    'শিক্ষা-সুযোগকে আরও অন্তর্ভুক্তিমূলক করা',
                ]),
            ],
            featureCards: [
                createFeatureCard(1, 'পাবলিক একাডেমিক কনটেন্ট', 'বিশ্ববিদ্যালয়, ক্যাটাগরি, ক্লাস্টার, রিসোর্স, নিউজ ও গুরুত্বপূর্ণ তথ্য থেকে নির্ভরযোগ্য ধারণা পান।', 'graduation-cap'),
                createFeatureCard(2, 'এক্সাম ও প্রস্তুতি সাপোর্ট', 'অনুশীলন, মূল্যায়ন, রেজাল্ট ভিউ এবং উন্নতির সুযোগ — শেখা হয় পরিমাপযোগ্য।', 'book-open'),
                createFeatureCard(3, 'স্টুডেন্ট ড্যাশবোর্ড', 'পরীক্ষা, ফলাফল, নোটিফিকেশন, প্রোফাইল এবং একাডেমিক অ্যাকশন এক জায়গায়।', 'users'),
                createFeatureCard(4, 'রিসোর্স ও জ্ঞানভান্ডার', 'বিষয়ভিত্তিক শেখার উপকরণ, আর্টিকেল ও ব্যবহারযোগ্য রিসোর্স।', 'file-text'),
                createFeatureCard(5, 'নিউজ ও আপডেট', 'সময়োপযোগী একাডেমিক আপডেট ও প্রাসঙ্গিক তথ্য সহজভাবে পৌঁছে দিই।', 'bell'),
                createFeatureCard(6, 'সাবস্ক্রিপশন ও পেমেন্ট', 'শিক্ষার্থী-কেন্দ্রিক সাবস্ক্রিপশন স্ট্রাকচার ও সুবিধাজনক ব্যবস্থাপনা।', 'award'),
                createFeatureCard(7, 'নোটিফিকেশন ও রিমাইন্ডার', 'গুরুত্বপূর্ণ কাজ, পরীক্ষাসংক্রান্ত তথ্য ও একাডেমিক অ্যালার্ট সময়মতো পান।', 'target'),
                createFeatureCard(8, 'হেল্প সেন্টার ও সাপোর্ট', 'সমস্যা বা বিভ্রান্তি থাকলে দ্রুত সহায়তা পান — শেখার ধারাবাহিকতা ব্যাহত হবে না।', 'shield'),
            ],
            founderProfiles: [
                createFounder(1,
                    'মোঃ মুনতাসির শিহাব (MD Muntasir Shihab)', 'Founder & CEO',
                    'CampusWay-এর প্রতিষ্ঠাতা ও পরিচালক। শিক্ষার্থীদের ভর্তি প্রস্তুতি ও একাডেমিক সহায়তায় একটি নির্ভরযোগ্য প্ল্যাটফর্ম গড়ে তোলার লক্ষ্যে কাজ করছেন।',
                    '', [{ label: 'Email', url: 'mailto:mm.xihab@gmail.com' }, { label: 'CampusWay', url: '/' }],
                    {
                        quote: 'Learn, Create, Deliver excellence',
                        fatherName: 'মোঃ মকবুলার রহমান', dateOfBirth: '১২ অক্টোবর ২০০৫', gender: 'পুরুষ',
                        phone: '01317138570', emergencyPhone: '01516553350', email: 'mm.xihab@gmail.com',
                        address: 'গ্রাম: ডাঙ্গাবাড়ী, ডাকঘর: ফুটকিবাড়ী-৫০৪১, ইউনিয়ন: গরিনাবাড়ী (ওয়ার্ড নং- ৭), উপজেলা: পঞ্চগড় সদর, জেলা: পঞ্চগড়।',
                        education: [
                            { degree: 'B.Sc. (স্নাতক)', institution: 'খুলনা বিশ্ববিদ্যালয়', department: 'পরিসংখ্যান (Statistics)', year: '২০২৬ — বর্তমান', result: 'অধ্যয়নরত', order: 5 },
                            { degree: 'HSC (উচ্চ মাধ্যমিক)', institution: 'মকবুলার রহমান সরকারি কলেজ', department: 'বিজ্ঞান', year: '২০২৪', result: 'GPA 4.92', order: 4 },
                            { degree: 'SSC (মাধ্যমিক)', institution: 'আমেনা-বাকি রেসিডেন্সিয়াল মডেল স্কুল অ্যান্ড কলেজ', department: 'বিজ্ঞান', year: '২০২২', result: 'GPA 5.00 (গোল্ডেন)', order: 3 },
                            { degree: 'JSC', institution: 'আমেনা-বাকি রেসিডেন্সিয়াল মডেল স্কুল অ্যান্ড কলেজ', department: 'সাধারণ', year: '২০১৯', result: 'GPA 5.00 (গোল্ডেন)', order: 2 },
                            { degree: 'PSC (প্রাথমিক)', institution: 'আমেনা-বাকি রেসিডেন্সিয়াল মডেল স্কুল অ্যান্ড কলেজ', department: 'সাধারণ', year: '২০১৬', result: 'GPA 5.00 (গোল্ডেন)', order: 1 },
                        ],
                        skills: ['গ্রাফিক ডিজাইন', 'ব্র্যান্ডিং', 'লোগো ডিজাইন', 'ওয়েব ডেভেলপমেন্ট (HTML, CSS)', 'ডিজিটাল মার্কেটিং'],
                        experience: 'সদর শাখা সভাপতি, রংধনু ফাউন্ডেশন (২০২৩ থেকে বর্তমান)',
                    },
                ),
            ],
        },
        terms: {
            eyebrow: 'আইনি',
            title: 'সেবার শর্তাবলী (Terms of Service)',
            subtitle: 'ক্যাম্পাসওয়েতে আপনাকে স্বাগতম। আমরা চাই আপনি সহজ, নিরাপদ ও দায়িত্বশীলভাবে আমাদের সেবা ব্যবহার করুন। এই শর্তাবলী ক্যাম্পাসওয়ের ওয়েবসাইট, পরীক্ষা-প্রস্তুতি টুল, ভর্তি সহায়তা তথ্য, রিসোর্স, সাবস্ক্রিপশন, নোটিফিকেশন, পেমেন্ট এবং সংশ্লিষ্ট ডিজিটাল সেবার ক্ষেত্রে প্রযোজ্য।',
            lastUpdatedLabel: 'কার্যকর তারিখ: ২১ এপ্রিল ২০২৬ | সর্বশেষ হালনাগাদ: ২১ এপ্রিল ২০২৬',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                createSection(1, 'শর্তাবলীতে সম্মতি', 'ক্যাম্পাসওয়ের সেবা ব্যবহার, অ্যাকাউন্ট তৈরি, কোনো ফর্ম জমা, বা পেমেন্ট সম্পন্ন করার মাধ্যমে আপনি এই শর্তাবলীর সঙ্গে সম্মতি দিচ্ছেন। যদি আপনি এই শর্তাবলীর সঙ্গে একমত না হন, তাহলে অনুগ্রহ করে সেবা ব্যবহার করবেন না।', 'shield', 'info'),
                createSection(2, 'সেবার পরিধি', 'ক্যাম্পাসওয়ে শিক্ষার্থী-কেন্দ্রিক একটি সহায়ক প্ল্যাটফর্ম, যেখানে পরীক্ষা প্রস্তুতি, বিশ্ববিদ্যালয়/ভর্তি সংক্রান্ত গাইডলাইন, একাডেমিক রিসোর্স, আপডেট, স্টুডেন্ট ড্যাশবোর্ড, সাপোর্ট ও অন্যান্য শিক্ষাসেবা দেওয়া হয়।\n\nক্যাম্পাসওয়ে তথ্য ও প্রস্তুতি সহায়তা দেয়, কিন্তু কোনো বিশ্ববিদ্যালয় বা প্রতিষ্ঠানে ভর্তি, ফলাফল বা নির্দিষ্ট একাডেমিক সফলতা নিশ্চিত করে না।', 'file-text', 'neutral'),
                createSection(3, 'অ্যাকাউন্ট ও নিরাপত্তা', 'অ্যাকাউন্টের ইমেইল, ফোন, পাসওয়ার্ড, ওটিপি এবং অন্যান্য লগইন তথ্য গোপন রাখা আপনার দায়িত্ব।', 'lock', 'warning', ['আপনার অ্যাকাউন্ট থেকে সংঘটিত কাজের জন্য আপনি দায়ী থাকবেন', 'সন্দেহজনক লগইন বা নিরাপত্তা ঝুঁকি দেখা দিলে দ্রুত সাপোর্ট টিমকে জানাতে হবে', 'প্ল্যাটফর্মে প্রদত্ত তথ্য সত্য, সঠিক ও হালনাগাদ রাখা ব্যবহারকারীর দায়িত্ব']),
                createSection(4, 'নিষিদ্ধ কার্যকলাপ', 'নিম্নলিখিত কার্যকলাপ কঠোরভাবে নিষিদ্ধ। প্রমাণিত হলে অ্যাকাউন্ট স্থগিত/বাতিলসহ আইনগত ব্যবস্থা নেওয়া হতে পারে:', 'alert-triangle', 'warning', ['হ্যাকিং বা অননুমোদিত প্রবেশের চেষ্টা', 'ভুয়া তথ্য প্রদান বা অন্যের পরিচয়ে অ্যাকাউন্ট ব্যবহার', 'পেমেন্ট জালিয়াতি', 'পরীক্ষার কনটেন্ট অপব্যবহার', 'স্প্যামিং বা প্ল্যাটফর্মের কার্যক্রম বিঘ্নিত করা']),
                createSection(5, 'কনটেন্ট ও মেধাস্বত্ব', 'ক্যাম্পাসওয়ের কনটেন্ট, রিসোর্স, প্রশ্ন, ডিজাইন, ব্র্যান্ড উপাদান ও উপস্থাপনা মেধাস্বত্বের আওতাভুক্ত। অনুমতি ছাড়া কপি, বিক্রি, পুনঃপ্রকাশ, বাণিজ্যিক ব্যবহার বা অননুমোদিত বিতরণ করা যাবে না।', 'book-open', 'accent'),
                createSection(6, 'তথ্যের নির্ভুলতা ও সীমাবদ্ধতা', 'আমরা তথ্য হালনাগাদ ও নির্ভুল রাখতে সর্বোচ্চ চেষ্টা করি। তবে ভর্তি নীতিমালা, সময়সীমা, সিট, যোগ্যতা বা অফিসিয়াল সিদ্ধান্তের ক্ষেত্রে সংশ্লিষ্ট প্রতিষ্ঠানই চূড়ান্ত কর্তৃপক্ষ। গুরুত্বপূর্ণ সিদ্ধান্ত নেওয়ার আগে অফিসিয়াল সোর্স যাচাই করা ব্যবহারকারীর দায়িত্ব।', 'eye', 'info'),
                createSection(7, 'সাবস্ক্রিপশন, ফি ও রিফান্ড', 'কিছু সেবা ফ্রি এবং কিছু সেবা সাবস্ক্রিপশন বা সার্ভিস ফি-ভিত্তিক হতে পারে। ডিজিটাল/তাৎক্ষণিক সেবার ক্ষেত্রে সাধারণত অর্থ ফেরতযোগ্য নয়। তবে প্রমাণিত প্রযুক্তিগত ত্রুটি বা সেবা-অপ্রদানের ক্ষেত্রে কেসভিত্তিক পর্যালোচনা করা হতে পারে।', 'award', 'neutral'),
                createSection(8, 'দায়-সীমা', 'ক্যাম্পাসওয়ে একটি শিক্ষাসহায়ক প্ল্যাটফর্ম। সরাসরি বা পরোক্ষ ক্ষতি, সুযোগ হারানো, ডেটা ক্ষতি, বা শুধুমাত্র প্ল্যাটফর্মের তথ্যের ভিত্তিতে নেওয়া ব্যক্তিগত সিদ্ধান্তের ফলে সৃষ্ট ফলাফলের জন্য ক্যাম্পাসওয়ের দায় আইনসম্মত সীমার মধ্যে সীমাবদ্ধ থাকবে।', 'shield', 'neutral'),
                createSection(9, 'প্রযোজ্য আইন ও এখতিয়ার', 'এই শর্তাবলী গণপ্রজাতন্ত্রী বাংলাদেশের প্রচলিত আইন অনুযায়ী পরিচালিত হবে। বিরোধ নিষ্পত্তির ক্ষেত্রে বাংলাদেশের প্রযোজ্য আদালত/কর্তৃপক্ষের এখতিয়ার কার্যকর হবে।', 'globe', 'info'),
                createSection(10, 'অ্যাডমিনের চূড়ান্ত সিদ্ধান্ত', 'ক্যাম্পাসওয়ে অ্যাডমিন যেকোনো সময় যেকোনো নিয়ম বাতিল, সংশোধন বা নতুন নিয়ম গ্রহণ করতে পারে। এ ক্ষেত্রে অ্যাডমিনের সিদ্ধান্তই চূড়ান্ত বলে বিবেচিত হবে।', 'target', 'accent'),
                createSection(11, 'ব্যবহারকারীর স্বীকৃতি', 'ক্যাম্পাসওয়ের সেবা ব্যবহার করার মাধ্যমে আপনি নিশ্চিত করছেন যে এই শর্তাবলী আপনি পড়েছেন, বুঝেছেন এবং মেনে নিতে সম্মত হয়েছেন।\n\nশর্তাবলী-সংক্রান্ত প্রশ্ন থাকলে ক্যাম্পাসওয়ের Contact বা Support চ্যানেলের মাধ্যমে যোগাযোগ করুন।', 'mail', 'success'),
            ],
        },
        privacy: {
            eyebrow: 'আইনি',
            title: 'প্রাইভেসি পলিসি',
            subtitle: 'ক্যাম্পাসওয়েতে আপনাকে স্বাগতম। আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ। এই প্রাইভেসি পলিসিতে আমরা সহজ ভাষায় ব্যাখ্যা করেছি, আমরা কী তথ্য সংগ্রহ করি, কেন করি, কীভাবে সুরক্ষিত রাখি, এবং আপনার কী কী অধিকার রয়েছে।',
            lastUpdatedLabel: 'কার্যকর তারিখ: ২১ এপ্রিল ২০২৬ | সর্বশেষ হালনাগাদ: ২১ এপ্রিল ২০২৬',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                createSection(1, 'এই নীতিমালার উদ্দেশ্য', 'এই নীতিমালা ক্যাম্পাসওয়ের ওয়েবসাইট, অ্যাকাউন্ট, পরীক্ষা-প্রস্তুতি ফিচার, রিসোর্স, সাবস্ক্রিপশন, নোটিফিকেশন, সাপোর্ট এবং সংশ্লিষ্ট ডিজিটাল সেবার ক্ষেত্রে প্রযোজ্য।', 'info', 'info'),
                createSection(2, 'আমরা কী তথ্য সংগ্রহ করি', 'আমরা সাধারণত নিচের ধরনের তথ্য সংগ্রহ করতে পারি:', 'eye', 'neutral', ['অ্যাকাউন্ট তথ্য: নাম, ইমেইল, মোবাইল নম্বর, প্রোফাইল তথ্য', 'একাডেমিক/ব্যবহার তথ্য: পরীক্ষায় অংশগ্রহণ, ফলাফল, শেখার অগ্রগতি, পছন্দ', 'লেনদেন তথ্য: পেমেন্ট স্ট্যাটাস, ট্রান্সঅ্যাকশন আইডি (সম্পূর্ণ কার্ড তথ্য সাধারণত সংরক্ষণ করি না)', 'প্রযুক্তিগত তথ্য: ডিভাইস টাইপ, ব্রাউজার, আইপি, লগ ডেটা, কুকি-সংশ্লিষ্ট তথ্য', 'যোগাযোগ তথ্য: সাপোর্টে পাঠানো বার্তা, অভিযোগ, ফিডব্যাক']),
                createSection(3, 'আমরা কেন তথ্য ব্যবহার করি', 'সংগ্রহ করা তথ্য আমরা সাধারণত নিচের কাজে ব্যবহার করি:', 'database', 'info', ['আপনার অ্যাকাউন্ট তৈরি ও পরিচালনা করতে', 'শিক্ষাসেবা এবং প্ল্যাটফর্ম ফিচার কার্যকরভাবে দিতে', 'পরীক্ষা, রিসোর্স ও শেখার অভিজ্ঞতা ব্যক্তিগতকরণ করতে', 'গুরুত্বপূর্ণ নোটিফিকেশন ও আপডেট পাঠাতে', 'নিরাপত্তা, প্রতারণা প্রতিরোধ ও অপব্যবহার শনাক্ত করতে', 'সেবার মান উন্নয়ন ও বিশ্লেষণে সহায়তা পেতে']),
                createSection(4, 'তথ্য শেয়ারিং নীতি', 'আমরা আপনার ব্যক্তিগত তথ্য বিক্রি করি না। তবে প্রয়োজন হলে সীমিতভাবে তথ্য শেয়ার হতে পারে:', 'shield', 'warning', ['পেমেন্ট, হোস্টিং, এসএমএস/ইমেইল সেবা প্রদানকারী বিশ্বস্ত তৃতীয় পক্ষের সাথে', 'আইনগত বাধ্যবাধকতা, আদালতের নির্দেশ বা সরকারি অনুরোধে', 'আপনার স্পষ্ট সম্মতিতে', 'প্ল্যাটফর্ম নিরাপত্তা ও জালিয়াতি প্রতিরোধের প্রয়োজনে']),
                createSection(5, 'কুকি ও অনুরূপ প্রযুক্তি', 'ভালো ব্যবহার অভিজ্ঞতা দিতে আমরা কুকি বা অনুরূপ প্রযুক্তি ব্যবহার করতে পারি।', 'globe', 'neutral', ['লগইন সেশন বজায় রাখা', 'পছন্দ মনে রাখা', 'পারফরম্যান্স বিশ্লেষণ করা']),
                createSection(6, 'ডেটা সুরক্ষা', 'আপনার তথ্য সুরক্ষায় আমরা যুক্তিসংগত প্রযুক্তিগত ও প্রশাসনিক ব্যবস্থা অনুসরণ করি। তবে ইন্টারনেটভিত্তিক কোনো সিস্টেম শতভাগ ঝুঁকিমুক্ত নয়। তাই আপনার লগইন তথ্য, পাসওয়ার্ড ও ওটিপি গোপন রাখার দায়িত্বও আপনার।', 'lock', 'success', ['সীমিত ও ভূমিকা-ভিত্তিক অ্যাক্সেস', 'নিরাপদ সংযোগ (যেখানে প্রযোজ্য)', 'সিস্টেম মনিটরিং ও ঝুঁকি পর্যবেক্ষণ']),
                createSection(7, 'আপনার অধিকার', 'আপনি সাধারণত নিম্নলিখিত অধিকারগুলো প্রয়োগ করতে পারেন:', 'users', 'accent', ['নিজের তথ্য দেখার অনুরোধ', 'ভুল তথ্য সংশোধনের অনুরোধ', 'নির্দিষ্ট ক্ষেত্রে তথ্য মুছে ফেলার অনুরোধ', 'মার্কেটিং/প্রমোশনাল বার্তা থেকে অপ্ট-আউট', 'গোপনীয়তা-সংক্রান্ত প্রশ্ন বা অভিযোগ জানানোর অধিকার']),
                createSection(8, 'শিশু ও অপ্রাপ্তবয়স্ক ব্যবহারকারী', 'অপ্রাপ্তবয়স্ক ব্যবহারকারীর ক্ষেত্রে অভিভাবক/অভিভাবিকার সচেতন তত্ত্বাবধান প্রত্যাশিত। প্রয়োজনে আমরা বয়স-সম্পর্কিত যাচাই বা অতিরিক্ত সম্মতি চাইতে পারি।', 'heart', 'warning'),
                createSection(9, 'অ্যাডমিনের চূড়ান্ত সিদ্ধান্ত', 'ক্যাম্পাসওয়ে অ্যাডমিন যেকোনো সময় এই প্রাইভেসি পলিসির যেকোনো ধারা বাতিল, সংশোধন বা নতুন ধারা গ্রহণ করতে পারে। এ ক্ষেত্রে অ্যাডমিনের সিদ্ধান্তই চূড়ান্ত বলে বিবেচিত হবে।', 'target', 'accent'),
                createSection(10, 'ব্যবহারকারীর সম্মতি', 'ক্যাম্পাসওয়ের সেবা ব্যবহার করার মাধ্যমে আপনি এই প্রাইভেসি পলিসি পড়েছেন, বুঝেছেন এবং এতে বর্ণিত শর্তাবলীর সঙ্গে সম্মত হয়েছেন।\n\nগোপনীয়তা-সংক্রান্ত যে কোনো প্রশ্ন, অনুরোধ বা অভিযোগের জন্য ক্যাম্পাসওয়ের Contact/Support চ্যানেলে যোগাযোগ করুন।', 'mail', 'success'),
            ],
        },
    };
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown, fallback = true): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
    if (!Array.isArray(value)) return fallback;
    return value.map((item) => asString(item)).filter(Boolean);
}

function normalizeSection(value: unknown, fallback: ApiStaticPageSection): ApiStaticPageSection {
    const source = asRecord(value);
    return {
        title: asString(source.title, fallback.title),
        body: asString(source.body, fallback.body),
        bullets: asStringArray(source.bullets, fallback.bullets),
        iconKey: asString(source.iconKey, fallback.iconKey),
        tone: (asString(source.tone, fallback.tone) as StaticPageTone) || fallback.tone,
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeFeatureCard(value: unknown, fallback: ApiStaticFeatureCard): ApiStaticFeatureCard {
    const source = asRecord(value);
    return {
        title: asString(source.title, fallback.title),
        description: asString(source.description, fallback.description),
        iconKey: asString(source.iconKey, fallback.iconKey),
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeFounderContactLink(value: unknown): ApiFounderContactLink | null {
    const source = asRecord(value);
    const label = asString(source.label);
    const url = asString(source.url);
    if (!label && !url) return null;
    return { label: label || 'Link', url };
}

function normalizeFounderEducation(value: unknown, fallback: ApiFounderEducation): ApiFounderEducation {
    const source = asRecord(value);
    return {
        degree: asString(source.degree, fallback.degree),
        institution: asString(source.institution, fallback.institution),
        department: asString(source.department, fallback.department),
        year: asString(source.year, fallback.year),
        result: asString(source.result, fallback.result),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeFounderProfile(value: unknown, fallback: ApiFounderProfile): ApiFounderProfile {
    const source = asRecord(value);
    const nextContactLinks = Array.isArray(source.contactLinks)
        ? source.contactLinks.map((item) => normalizeFounderContactLink(item)).filter((item): item is ApiFounderContactLink => Boolean(item))
        : fallback.contactLinks;
    const fallbackEducation = Array.isArray(fallback.education) ? fallback.education : [];
    const nextEducation = Array.isArray(source.education)
        ? source.education.map((item, idx) => normalizeFounderEducation(item, fallbackEducation[idx] || { degree: '', institution: '', department: '', year: '', result: '', order: idx + 1 }))
        : fallbackEducation;
    return {
        name: asString(source.name, fallback.name),
        title: asString(source.title, fallback.title),
        photoUrl: asString(source.photoUrl, fallback.photoUrl),
        shortBio: asString(source.shortBio, fallback.shortBio),
        quote: asString(source.quote, fallback.quote),
        fatherName: asString(source.fatherName, fallback.fatherName),
        dateOfBirth: asString(source.dateOfBirth, fallback.dateOfBirth),
        gender: asString(source.gender, fallback.gender),
        phone: asString(source.phone, fallback.phone),
        emergencyPhone: asString(source.emergencyPhone, fallback.emergencyPhone),
        email: asString(source.email, fallback.email),
        address: asString(source.address, fallback.address),
        education: nextEducation,
        skills: asStringArray(source.skills, fallback.skills),
        experience: asString(source.experience, fallback.experience),
        contactLinks: nextContactLinks,
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeStaticPage(value: unknown, fallback: ApiStaticPageConfig): ApiStaticPageConfig {
    const source = asRecord(value);
    const fallbackSections = fallback.sections || [];
    const sourceSections = Array.isArray(source.sections) ? source.sections : null;
    return {
        eyebrow: asString(source.eyebrow, fallback.eyebrow),
        title: asString(source.title, fallback.title),
        subtitle: asString(source.subtitle, fallback.subtitle),
        lastUpdatedLabel: asString(source.lastUpdatedLabel, fallback.lastUpdatedLabel),
        sections: sourceSections
            ? sourceSections.map((item, index) => normalizeSection(item, fallbackSections[index] || createSection(index + 1, '', '', 'info', 'neutral')))
            : fallbackSections,
        backLinkLabel: asString(source.backLinkLabel, fallback.backLinkLabel),
        backLinkUrl: asString(source.backLinkUrl, fallback.backLinkUrl),
    };
}

function normalizeAboutPage(value: unknown, fallback: ApiAboutStaticPageConfig): ApiAboutStaticPageConfig {
    const source = asRecord(value);
    const normalizedBase = normalizeStaticPage(source, fallback);
    const fallbackFeatureCards = fallback.featureCards || [];
    const fallbackFounderProfiles = fallback.founderProfiles || [];
    return {
        ...normalizedBase,
        featureCards: Array.isArray(source.featureCards)
            ? source.featureCards.map((item, index) => normalizeFeatureCard(item, fallbackFeatureCards[index] || createFeatureCard(index + 1, '', '', 'info')))
            : fallbackFeatureCards,
        founderProfiles: Array.isArray(source.founderProfiles)
            ? source.founderProfiles.map((item, index) => normalizeFounderProfile(item, fallbackFounderProfiles[index] || createFounder(index + 1)))
            : fallbackFounderProfiles,
    };
}

export function mergeWebsiteStaticPages(value?: Partial<WebsiteStaticPagesConfig> | null): WebsiteStaticPagesConfig {
    const defaults = createDefaultWebsiteStaticPages();
    const source = asRecord(value);
    return {
        about: normalizeAboutPage(source.about, defaults.about),
        terms: normalizeStaticPage(source.terms, defaults.terms),
        privacy: normalizeStaticPage(source.privacy, defaults.privacy),
    };
}

export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
    return [...items].sort((left, right) => left.order - right.order);
}
