import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import QuestionBankQuestion from '../models/QuestionBankQuestion';

// A local mock of the before and after logic to benchmark them head-to-head

async function runBenchmark() {
    console.log("Setting up DB...");
    const mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    console.log("Seeding data...");
    const questions = [];
    for(let i=0; i<150; i++) {
        questions.push({
            question_en: `Q${i}`,
            difficulty: i < 50 ? 'easy' : (i < 100 ? 'medium' : 'hard'),
            subject: 'Math',
            moduleCategory: 'Algebra',
            isActive: true,
            isArchived: false,
            correctKey: 'A',
            options: [{key:'A', text_en:'A'},{key:'B', text_en:'B'},{key:'C', text_en:'C'},{key:'D', text_en:'D'}]
        });
    }
    await QuestionBankQuestion.insertMany(questions);

    const baseFilter = { isActive: true, isArchived: false, subject: 'Math', moduleCategory: 'Algebra' };

    const distribution = { easy: 10, medium: 10, hard: 10 };

    console.log("Running BEFORE...");
    const beforeStart = performance.now();
    for(let run=0; run<100; run++) {
        for (const level of ['easy', 'medium', 'hard'] as const) {
            const count = distribution[level];
            const available = await QuestionBankQuestion.countDocuments({
                ...baseFilter,
                difficulty: level,
            });
            if (available < count) throw new Error('Shortage');
        }
    }
    const beforeEnd = performance.now();

    console.log("Running AFTER...");
    const afterStart = performance.now();
    for(let run=0; run<100; run++) {
        const levelsToFetch = ['easy', 'medium', 'hard'].filter(l => distribution[l as keyof typeof distribution] > 0);

        const counts = await QuestionBankQuestion.aggregate([
            { $match: { ...baseFilter, difficulty: { $in: levelsToFetch } } },
            { $group: { _id: "$difficulty", count: { $sum: 1 } } }
        ]);

        const countsMap = counts.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {});

        for (const level of ['easy', 'medium', 'hard'] as const) {
            const count = distribution[level];
            if (count <= 0) continue;

            const available = countsMap[level] || 0;
            if (available < count) throw new Error('Shortage');
        }
    }
    const afterEnd = performance.now();

    console.log(`BEFORE (Sequential counts): ${(beforeEnd - beforeStart).toFixed(2)}ms`);
    console.log(`AFTER (Aggregation count): ${(afterEnd - afterStart).toFixed(2)}ms`);
    console.log(`Improvement: ${(((beforeEnd - beforeStart) - (afterEnd - afterStart)) / (beforeEnd - beforeStart) * 100).toFixed(2)}%`);

    await mongoose.disconnect();
    await mongoServer.stop();
}

runBenchmark().catch(console.error);
