import mongoose from 'mongoose';
import { Exam } from './src/models/Exam';
import { QuestionBankQuestion } from './src/models/QuestionBankQuestion';
import * as dotenv from 'dotenv';
dotenv.config();

// Replicating the fallback logic
async function testGenerate() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');
    
    // Find an exam created by ExamBuilder (has questionOrder)
    const exam = await Exam.findOne({ status: 'published', questionOrder: { $exists: true, $not: {$size: 0} } });
    
    if (!exam) {
        console.log('No published exams with questionOrder found. Trying to find any exam...');
        const anyExam = await Exam.findOne();
        if (anyExam) {
            console.log(`Found exam: ${anyExam.title}, questionOrder:`, anyExam.questionOrder);
        } else {
            console.log('No exams at all in DB.');
        }
        process.exit(0);
    }
    
    console.log(`Testing Exam: ${exam.title} (${exam._id})`);
    console.log(`questionOrder length: ${exam.questionOrder.length}`);
    
    const qbQuestions = await mongoose.model('QuestionBankQuestion').find({
        _id: { $in: exam.questionOrder },
        isArchived: { $ne: true }
    }).lean();
    
    console.log(`Found ${qbQuestions.length} matching questions from QuestionBankQuestion collection.`);
    
    if (qbQuestions.length > 0) {
        console.log('✅ TEST PASSED: The exam will successfully load questions.');
        console.log(`Sample Question: ${qbQuestions[0].question_en || qbQuestions[0].question_bn}`);
    } else {
        console.log('❌ TEST FAILED: questions found is 0. The IDs in questionOrder might be invalid or archived.');
        console.log('IDs:', exam.questionOrder);
    }
    
    process.exit(0);
}

testGenerate().catch(console.error);
