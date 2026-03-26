import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import News from '../models/News';

dotenv.config();

async function run(): Promise<void> {
    await connectDB();

    const filter = {
        $or: [
            { coverImageSource: 'default' },
            {
                $and: [
                    {
                        $or: [
                            { coverImageSource: { $exists: false } },
                            { coverImageSource: '' },
                            { coverImageSource: null },
                        ],
                    },
                    {
                        $or: [
                            { coverImageUrl: { $exists: false } },
                            { coverImageUrl: '' },
                            { coverImageUrl: null },
                        ],
                    },
                    {
                        $or: [
                            { coverImage: { $exists: false } },
                            { coverImage: '' },
                            { coverImage: null },
                        ],
                    },
                ],
            },
        ],
    };

    const result = await News.updateMany(
        filter,
        {
            $set: {
                coverImageSource: 'default',
                coverImageUrl: '',
                coverImage: '',
                featuredImage: '',
                thumbnailImage: '',
            },
        }
    );

    console.log('[migrate-news-default-banner] matched:', Number(result.matchedCount || 0));
    console.log('[migrate-news-default-banner] modified:', Number(result.modifiedCount || 0));
}

run()
    .catch((error) => {
        console.error('[migrate-news-default-banner] failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    });
