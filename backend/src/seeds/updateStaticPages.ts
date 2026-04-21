import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import WebsiteSettings from '../models/WebsiteSettings';

dotenv.config();

const termsData = {
    eyebrow: 'আইনি',
    title: 'সেবার শর্তাবলী (Terms of Service)',
    subtitle: 'ক্যাম্পাসওয়েতে আপনাকে স্বাগতম। আমরা চাই আপনি সহজ, নিরাপদ ও দায়িত্বশীলভাবে আমাদের সেবা ব্যবহার করুন।',
    lastUpdatedLabel: 'কার্যকর তারিখ: ২১ এপ্রিল ২০২৬ | সর্বশেষ হালনাগাদ: ২১ এপ্রিল ২০২৬',
    backLinkLabel: 'Back to Home',
    backLinkUrl: '/',
    sections: [
        { title: 'শর্তাবলীতে সম্মতি', body: 'ক্যাম্পাসওয়ের সেবা ব্যবহার, অ্যাকাউন্ট তৈরি, কোনো ফর্ম জমা, বা পেমেন্ট সম্পন্ন করার মাধ্যমে আপনি এই শর্তাবলীর সঙ্গে সম্মতি দিচ্ছেন।', bullets: [], iconKey: 'shield', tone: 'info', enabled: true, order: 1 },
        { title: 'সেবার পরিধি', body: 'ক্যাম্পাসওয়ে শিক্ষার্থী-কেন্দ্রিক একটি সহায়ক প্ল্যাটফর্ম। ক্যাম্পাসওয়ে তথ্য ও প্রস্তুতি সহায়তা দেয়, কিন্তু কোনো বিশ্ববিদ্যালয় বা প্রতিষ্ঠানে ভর্তি নিশ্চিত করে না।', bullets: [], iconKey: 'file-text', tone: 'neutral', enabled: true, order: 2 },
        { title: 'অ্যাকাউন্ট ও নিরাপত্তা', body: 'অ্যাকাউন্টের ইমেইল, ফোন, পাসওয়ার্ড, ওটিপি এবং অন্যান্য লগইন তথ্য গোপন রাখা আপনার দায়িত্ব।', bullets: ['আপনার অ্যাকাউন্ট থেকে সংঘটিত কাজের জন্য আপনি দায়ী থাকবেন', 'সন্দেহজনক লগইন বা নিরাপত্তা ঝুঁকি দেখা দিলে দ্রুত সাপোর্ট টিমকে জানাতে হবে'], iconKey: 'lock', tone: 'warning', enabled: true, order: 3 },
        { title: 'নিষিদ্ধ কার্যকলাপ', body: 'নিম্নলিখিত কার্যকলাপ কঠোরভাবে নিষিদ্ধ:', bullets: ['হ্যাকিং বা অননুমোদিত প্রবেশের চেষ্টা', 'ভুয়া তথ্য প্রদান', 'পেমেন্ট জালিয়াতি', 'পরীক্ষার কনটেন্ট অপব্যবহার', 'স্প্যামিং'], iconKey: 'alert-triangle', tone: 'warning', enabled: true, order: 4 },
        { title: 'কনটেন্ট ও মেধাস্বত্ব', body: 'ক্যাম্পাসওয়ের কনটেন্ট, রিসোর্স, প্রশ্ন, ডিজাইন মেধাস্বত্বের আওতাভুক্ত। অনুমতি ছাড়া কপি, বিক্রি বা বাণিজ্যিক ব্যবহার করা যাবে না।', bullets: [], iconKey: 'book-open', tone: 'accent', enabled: true, order: 5 },
        { title: 'সাবস্ক্রিপশন, ফি ও রিফান্ড', body: 'কিছু সেবা ফ্রি এবং কিছু সেবা সাবস্ক্রিপশন বা সার্ভিস ফি-ভিত্তিক। ডিজিটাল সেবার ক্ষেত্রে সাধারণত অর্থ ফেরতযোগ্য নয়।', bullets: [], iconKey: 'award', tone: 'neutral', enabled: true, order: 6 },
        { title: 'দায়-সীমা', body: 'সরাসরি বা পরোক্ষ ক্ষতি, সুযোগ হারানো, বা প্ল্যাটফর্মের তথ্যের ভিত্তিতে নেওয়া সিদ্ধান্তের ফলাফলের জন্য ক্যাম্পাসওয়ের দায় আইনসম্মত সীমার মধ্যে সীমাবদ্ধ।', bullets: [], iconKey: 'shield', tone: 'neutral', enabled: true, order: 7 },
        { title: 'প্রযোজ্য আইন ও এখতিয়ার', body: 'এই শর্তাবলী গণপ্রজাতন্ত্রী বাংলাদেশের প্রচলিত আইন অনুযায়ী পরিচালিত হবে।', bullets: [], iconKey: 'globe', tone: 'info', enabled: true, order: 8 },
        { title: 'অ্যাডমিনের চূড়ান্ত সিদ্ধান্ত', body: 'ক্যাম্পাসওয়ে অ্যাডমিন যেকোনো সময় যেকোনো নিয়ম বাতিল, সংশোধন বা নতুন নিয়ম গ্রহণ করতে পারে। এ ক্ষেত্রে অ্যাডমিনের সিদ্ধান্তই চূড়ান্ত।', bullets: [], iconKey: 'target', tone: 'accent', enabled: true, order: 9 },
        { title: 'ব্যবহারকারীর স্বীকৃতি', body: 'ক্যাম্পাসওয়ের সেবা ব্যবহার করার মাধ্যমে আপনি নিশ্চিত করছেন যে এই শর্তাবলী আপনি পড়েছেন, বুঝেছেন এবং মেনে নিতে সম্মত হয়েছেন।', bullets: [], iconKey: 'mail', tone: 'success', enabled: true, order: 10 },
    ],
};

const privacyData = {
    eyebrow: 'আইনি',
    title: 'প্রাইভেসি পলিসি',
    subtitle: 'আপনার গোপনীয়তা আমাদের কাছে গুরুত্বপূর্ণ। এই প্রাইভেসি পলিসিতে আমরা সহজ ভাষায় ব্যাখ্যা করেছি, আমরা কী তথ্য সংগ্রহ করি, কেন করি, কীভাবে সুরক্ষিত রাখি।',
    lastUpdatedLabel: 'কার্যকর তারিখ: ২১ এপ্রিল ২০২৬ | সর্বশেষ হালনাগাদ: ২১ এপ্রিল ২০২৬',
    backLinkLabel: 'Back to Home',
    backLinkUrl: '/',
    sections: [
        { title: 'এই নীতিমালার উদ্দেশ্য', body: 'এই নীতিমালা ক্যাম্পাসওয়ের ওয়েবসাইট, অ্যাকাউন্ট, পরীক্ষা-প্রস্তুতি ফিচার, রিসোর্স, সাবস্ক্রিপশন, নোটিফিকেশন, সাপোর্ট এবং সংশ্লিষ্ট ডিজিটাল সেবার ক্ষেত্রে প্রযোজ্য।', bullets: [], iconKey: 'info', tone: 'info', enabled: true, order: 1 },
        { title: 'আমরা কী তথ্য সংগ্রহ করি', body: 'আমরা সাধারণত নিচের ধরনের তথ্য সংগ্রহ করতে পারি:', bullets: ['অ্যাকাউন্ট তথ্য: নাম, ইমেইল, মোবাইল নম্বর, প্রোফাইল তথ্য', 'একাডেমিক/ব্যবহার তথ্য: পরীক্ষায় অংশগ্রহণ, ফলাফল, শেখার অগ্রগতি', 'লেনদেন তথ্য: পেমেন্ট স্ট্যাটাস, ট্রান্সঅ্যাকশন আইডি', 'প্রযুক্তিগত তথ্য: ডিভাইস টাইপ, ব্রাউজার, আইপি, কুকি', 'যোগাযোগ তথ্য: সাপোর্টে পাঠানো বার্তা, ফিডব্যাক'], iconKey: 'eye', tone: 'neutral', enabled: true, order: 2 },
        { title: 'আমরা কেন তথ্য ব্যবহার করি', body: 'সংগ্রহ করা তথ্য আমরা সাধারণত নিচের কাজে ব্যবহার করি:', bullets: ['অ্যাকাউন্ট তৈরি ও পরিচালনা', 'শিক্ষাসেবা কার্যকরভাবে দিতে', 'নোটিফিকেশন ও আপডেট পাঠাতে', 'নিরাপত্তা ও প্রতারণা প্রতিরোধ', 'সেবার মান উন্নয়ন'], iconKey: 'database', tone: 'info', enabled: true, order: 3 },
        { title: 'তথ্য শেয়ারিং নীতি', body: 'আমরা আপনার ব্যক্তিগত তথ্য বিক্রি করি না। তবে প্রয়োজন হলে সীমিতভাবে তথ্য শেয়ার হতে পারে:', bullets: ['বিশ্বস্ত তৃতীয় পক্ষের সাথে (পেমেন্ট, হোস্টিং)', 'আইনগত বাধ্যবাধকতায়', 'আপনার স্পষ্ট সম্মতিতে', 'নিরাপত্তা ও জালিয়াতি প্রতিরোধে'], iconKey: 'shield', tone: 'warning', enabled: true, order: 4 },
        { title: 'ডেটা সুরক্ষা', body: 'আপনার তথ্য সুরক্ষায় আমরা যুক্তিসংগত প্রযুক্তিগত ও প্রশাসনিক ব্যবস্থা অনুসরণ করি। তবে ইন্টারনেটভিত্তিক কোনো সিস্টেম শতভাগ ঝুঁকিমুক্ত নয়।', bullets: ['সীমিত ও ভূমিকা-ভিত্তিক অ্যাক্সেস', 'নিরাপদ সংযোগ', 'সিস্টেম মনিটরিং'], iconKey: 'lock', tone: 'success', enabled: true, order: 5 },
        { title: 'আপনার অধিকার', body: 'আপনি সাধারণত নিম্নলিখিত অধিকারগুলো প্রয়োগ করতে পারেন:', bullets: ['নিজের তথ্য দেখার অনুরোধ', 'ভুল তথ্য সংশোধন', 'তথ্য মুছে ফেলার অনুরোধ', 'মার্কেটিং বার্তা থেকে অপ্ট-আউট'], iconKey: 'users', tone: 'accent', enabled: true, order: 6 },
        { title: 'অ্যাডমিনের চূড়ান্ত সিদ্ধান্ত', body: 'ক্যাম্পাসওয়ে অ্যাডমিন যেকোনো সময় এই প্রাইভেসি পলিসির যেকোনো ধারা বাতিল, সংশোধন বা নতুন ধারা গ্রহণ করতে পারে। অ্যাডমিনের সিদ্ধান্তই চূড়ান্ত।', bullets: [], iconKey: 'target', tone: 'accent', enabled: true, order: 7 },
        { title: 'ব্যবহারকারীর সম্মতি', body: 'ক্যাম্পাসওয়ের সেবা ব্যবহার করার মাধ্যমে আপনি এই প্রাইভেসি পলিসি পড়েছেন, বুঝেছেন এবং সম্মত হয়েছেন।\n\nগোপনীয়তা-সংক্রান্ত প্রশ্নের জন্য Contact/Support চ্যানেলে যোগাযোগ করুন।', bullets: [], iconKey: 'mail', tone: 'success', enabled: true, order: 8 },
    ],
};

async function updateStaticPages(): Promise<void> {
    console.log('[update-pages] Updating Terms & Privacy...');
    const result = await WebsiteSettings.updateOne(
        {},
        { $set: { 'staticPages.terms': termsData, 'staticPages.privacy': privacyData } },
    );
    console.log(`[update-pages] Modified: ${result.modifiedCount}`);
    console.log(`[update-pages] Terms sections: ${termsData.sections.length}`);
    console.log(`[update-pages] Privacy sections: ${privacyData.sections.length}`);
}

if (require.main === module) {
    (async () => {
        await connectDB();
        await updateStaticPages();
    })()
        .catch((e) => { console.error('[update-pages] Failed:', e); process.exitCode = 1; })
        .finally(async () => { if (mongoose.connection.readyState !== 0) await mongoose.connection.close(); });
}
