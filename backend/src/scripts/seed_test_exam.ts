import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import Exam from '../models/Exam';
import Question from '../models/Question';
import User from '../models/User';

async function run() {
    try {
        await connectDB();

        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.error('No admin found. Run e2e:prepare first.');
            process.exit(1);
        }

        // Clean up previous test exam
        await Exam.deleteMany({ title: 'E2E Test Exam' });

        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const exam = await Exam.create({
            title: 'E2E Test Exam',
            subject: 'General Knowledge',
            description: 'A test exam for Playwright E2E verification.',
            instructions: 'Please answer all questions. Do not switch tabs.',
            duration: 30,
            totalMarks: 50,
            passMarks: 20,
            status: 'live', // Corrected status
            isPublished: true,
            startDate: now,
            endDate: tomorrow,
            resultPublishDate: tomorrow,
            createdBy: admin._id,
            category: 'Mixed',
            difficulty: 'medium',
            defaultMarksPerQuestion: 5,
            negativeMarking: true,
            negativeMarkValue: 1,
            totalQuestions: 3, // Required field
            security_policies: {
                tab_switch_limit: 3,
                copy_paste_violations: 3,
                camera_enabled: false,
                require_fullscreen: false, // Set to false for easier E2E testing
                auto_submit_on_violation: false,
            },
            require_instructions_agreement: true
        });

        const questions = [
            {
                exam: exam._id,
                question: 'What is the capital of France?',
                optionA: 'London',
                optionB: 'Berlin',
                optionC: 'Paris',
                optionD: 'Madrid',
                correctAnswer: 'C',
                questionType: 'mcq',
                marks: 5,
                order: 1
            },
            {
                exam: exam._id,
                question: 'Which planet is known as the Red Planet?',
                optionA: 'Venus',
                optionB: 'Mars',
                optionC: 'Jupiter',
                optionD: 'Saturn',
                correctAnswer: 'B',
                questionType: 'mcq',
                marks: 5,
                order: 2
            },
            {
                exam: exam._id,
                question: 'What is 5 + 7?',
                optionA: '10',
                optionB: '11',
                optionC: '12',
                optionD: '13',
                correctAnswer: 'C',
                questionType: 'mcq',
                marks: 5,
                order: 3
            }
        ];

        await Question.insertMany(questions);

        console.log('Test exam seeded successfully.');
        console.log('Exam ID:', exam._id);

    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

run();
