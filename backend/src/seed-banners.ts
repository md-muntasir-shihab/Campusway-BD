
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Banner from './models/Banner';

dotenv.config();

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');

    console.log('Seeding banners...');
    const banners = [
        {
            title: 'Welcome to CampusWay',
            subtitle: 'Your ultimate guide to university admissions in Bangladesh',
            imageUrl: 'https://images.unsplash.com/photo-1523050335392-9ae824979603?q=80&w=1200',
            linkUrl: '/universities',
            isActive: true,
            order: 0
        },
        {
            title: 'Upcoming Admission Exams',
            subtitle: 'Check out the schedule for engineering and medical universities',
            imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200',
            linkUrl: '/exams',
            isActive: true,
            order: 1
        }
    ];

    await Banner.deleteMany({});
    await Banner.insertMany(banners);
    console.log('✅ Banners seeded successfully');

    await mongoose.disconnect();
}

seed();
