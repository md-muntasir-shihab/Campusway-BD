import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import FounderProfile from '../models/FounderProfile';

dotenv.config();

const founderData = {
    name: 'MD Muntasir Shihab',
    tagline: 'Learn, Create, Deliver excellence',
    founderMessage: `প্রিয় শিক্ষার্থী,

ক্যাম্পাসওয়ে শুরু করার পেছনে আমাদের একটি সহজ বিশ্বাস কাজ করেছে: সঠিক দিকনির্দেশনা পেলে প্রতিটি শিক্ষার্থীই নিজের সেরাটা দিতে পারে। আমরা দেখেছি, অনেক মেধাবী শিক্ষার্থী শুধু নির্ভরযোগ্য তথ্য, পরিষ্কার পরিকল্পনা আর সময়মতো সহায়তার অভাবে পিছিয়ে পড়ে। সেই জায়গা থেকেই ক্যাম্পাসওয়ের যাত্রা।

আমাদের লক্ষ্য হলো তোমার পড়াশোনার পথকে সহজ, গুছানো এবং আত্মবিশ্বাসী করা। ভর্তি প্রস্তুতি, পরীক্ষা অনুশীলন, রিসোর্স, আপডেট বা সাপোর্ট, সবকিছু একসাথে এমনভাবে দিতে চাই, যাতে তুমি কম বিভ্রান্ত হয়ে বেশি মনোযোগ দিয়ে এগোতে পারো।

ক্যাম্পাসওয়ে শুধু একটি প্ল্যাটফর্ম নয়, এটি তোমার একাডেমিক যাত্রার একজন দায়িত্বশীল সহযাত্রী। তোমার স্বপ্নকে বাস্তবের কাছাকাছি নিতে আমরা প্রতিদিন কাজ করে যাচ্ছি, আন্তরিকতা ও দায়বদ্ধতা নিয়ে।

তোমার অগ্রগতি আমাদের অনুপ্রেরণা।
তোমার সাফল্যই আমাদের সার্থকতা।

— মোঃ মুনতাসির শিহাব
প্রতিষ্ঠাতা, ক্যাম্পাসওয়ে`,
    role: 'Founder & CEO',
    aboutText: 'CampusWay-এর প্রতিষ্ঠাতা ও পরিচালক। শিক্ষার্থীদের ভর্তি প্রস্তুতি ও একাডেমিক সহায়তায় একটি নির্ভরযোগ্য প্ল্যাটফর্ম গড়ে তোলার লক্ষ্যে কাজ করছেন।',
    fatherName: '',
    dateOfBirth: '১২ অক্টোবর ২০০৫',
    gender: 'পুরুষ',
    address: 'গ্রাম: ডাঙ্গাবাড়ী, ডাকঘর: ফুটকিবাড়ী-৫০৪১, ইউনিয়ন: গরিনাবাড়ী (ওয়ার্ড নং- ৭), উপজেলা: পঞ্চগড় সদর, জেলা: পঞ্চগড়।',
    location: 'পঞ্চগড় সদর, পঞ্চগড়, বাংলাদেশ',
    contactDetails: {
        phones: ['+880 1317 138570', '+880 1516 553350'],
        email: 'mm.xihab@gmail.com',
        website: 'campuswaybd.web.app',
    },
    skills: [
        'গ্রাফিক ডিজাইন',
        'ব্র্যান্ডিং',
        'লোগো ডিজাইন',
        'ওয়েব ডেভেলপমেন্ট (HTML, CSS)',
        'ডিজিটাল মার্কেটিং',
    ],
    education: [
        { institution: 'খুলনা বিশ্ববিদ্যালয়', degree: 'B.Sc. (স্নাতক)', field: 'পরিসংখ্যান (Statistics)', startYear: 2026, description: 'অধ্যয়নরত' },
        { institution: 'মকবুলার রহমান সরকারি কলেজ', degree: 'HSC', field: 'বিজ্ঞান', startYear: 2024, endYear: 2024, description: 'GPA 4.92' },
        { institution: 'আমেনা-বাকি রেসিডেন্সিয়াল মডেল স্কুল অ্যান্ড কলেজ', degree: 'SSC', field: 'বিজ্ঞান', startYear: 2022, endYear: 2022, description: 'GPA 5.00 (গোল্ডেন)' },
        { institution: 'আমেনা-বাকি রেসিডেন্সিয়াল মডেল স্কুল অ্যান্ড কলেজ', degree: 'JSC', field: 'সাধারণ', startYear: 2019, endYear: 2019, description: 'GPA 5.00 (গোল্ডেন)' },
        { institution: 'আমেনা-বাকি রেসিডেন্সিয়াল মডেল স্কুল অ্যান্ড কলেজ', degree: 'PSC', field: 'সাধারণ', startYear: 2016, endYear: 2016, description: 'GPA 5.00 (গোল্ডেন)' },
    ],
    experience: [
        {
            company: 'রংধনু ফাউন্ডেশন',
            role: 'সদর শাখা সভাপতি',
            startYear: 2023,
            current: false,
            description: 'সামাজিক সেবামূলক সংগঠন',
        },
    ],
};

export async function seedFounderProfile(): Promise<void> {
    console.log('[seed:founder] Seeding founder profile...');

    await FounderProfile.findOneAndUpdate(
        { name: founderData.name },
        { $set: founderData },
        { upsert: true, new: true },
    );

    console.log(`[seed:founder] Upserted: ${founderData.name}`);
    console.log('[seed:founder] Done.');
}

// Allow running standalone
if (require.main === module) {
    (async () => {
        await connectDB();
        await seedFounderProfile();
    })()
        .catch((error) => {
            console.error('[seed:founder] Failed:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.connection.close();
            }
        });
}
