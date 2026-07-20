import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import { ExamQuestionModel } from '../models/examQuestion.model';
import Exam from '../models/Exam';
import ExamSession from '../models/ExamSession';
import { startExam } from '../services/ExamRunnerService';
import { logger } from '../utils/logger';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    if (process.env.MONGODB_URI) {
        await mongoose.connect(process.env.MONGODB_URI);
    } else {
        try {
            mongoServer = await MongoMemoryServer.create({
                binary: {
                    version: '4.0.25'
                }
            });
            await mongoose.connect(mongoServer.getUri());
        } catch (err) {
            console.warn('Failed to start MongoMemoryServer, falling back to localhost default...');
            await mongoose.connect('mongodb://127.0.0.1:27017/campusway_test');
        }
    }
}, 300000);

afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
});

beforeEach(async () => {
    await QuestionBankQuestion.deleteMany({});
    await ExamQuestionModel.deleteMany({});
    await Exam.deleteMany({});
    await ExamSession.deleteMany({});
    vi.restoreAllMocks();
});

describe('ExamQuestion Snapshot Regression Tests', () => {
    const studentId = new mongoose.Types.ObjectId();
    const deviceInfo = {
        ipAddress: '127.0.0.1',
        deviceInfo: 'Test Device',
        browserInfo: 'Test Browser',
        userAgent: 'Test UA',
        deviceFingerprint: 'fp-12345',
    };

    it('should return snapshot questions from ExamQuestionModel and ignore subsequent updates to QuestionBankQuestion', async () => {
        // 1. Create a question bank question
        const bq = await QuestionBankQuestion.create({
            question_en: 'Original Question Text',
            question_bn: 'মূল প্রশ্ন টেক্সট',
            correctKey: 'A',
            subject: 'Science',
            moduleCategory: 'General',
            options: [
                { key: 'A', text_en: 'Opt A', text_bn: 'বিকল্প ক' },
                { key: 'B', text_en: 'Opt B', text_bn: 'বিকল্প খ' }
            ],
            difficulty: 'easy',
            isActive: true,
            isArchived: false,
        });

        // 2. Create an Exam
        const exam = await Exam.create({
            title: 'Snapshot Test Exam',
            subject: 'Science',
            duration: 30,
            totalQuestions: 1,
            totalMarks: 5,
            isPublished: true,
            createdBy: new mongoose.Types.ObjectId(),
            startDate: new Date(Date.now() - 3600000), // started 1 hour ago
            endDate: new Date(Date.now() + 3600000),   // ends in 1 hour
            resultPublishDate: new Date(Date.now() + 86400000),
            accessMode: 'all',
            attemptLimit: 1,
            questionOrder: [bq._id],
        });

        // 3. Create the frozen snapshot
        const snapshot = await ExamQuestionModel.create({
            examId: String(exam._id),
            fromBankQuestionId: String(bq._id),
            orderIndex: 0,
            marks: 5,
            question_en: 'Frozen Question Text',
            question_bn: 'হিমায়িত প্রশ্ন টেক্সট',
            correctKey: 'A',
            options: [
                { key: 'A', text_en: 'Frozen Opt A', text_bn: 'হিমায়িত বিকল্প ক' },
                { key: 'B', text_en: 'Frozen Opt B', text_bn: 'হিমায়িত বিকল্প খ' }
            ],
            difficulty: 'easy',
        });

        // 4. Create active ExamSession (simulating user starting/resuming exam)
        const session = await ExamSession.create({
            exam: exam._id,
            student: studentId,
            attemptNo: 1,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 60000),
            status: 'in_progress',
            isActive: true,
            answers: [],
        });

        // 5. Update the live question in the question bank (simulating an edit)
        await QuestionBankQuestion.findByIdAndUpdate(bq._id, {
            question_en: 'MODIFIED Live Question Text',
            question_bn: 'পরিবর্তিত লাইভ প্রশ্ন টেক্সট',
        });

        // 6. Call startExam (which resumes session and builds session start response)
        const response = await startExam(String(exam._id), String(studentId), deviceInfo);

        // 7. Verify the output uses the frozen snapshot (ExamQuestionModel)
        expect(response.questions).toHaveLength(1);
        expect(response.questions[0]._id).toBe(String(snapshot._id));
        expect(response.questions[0].question_en).toBe('Frozen Question Text');
        expect(response.questions[0].question_bn).toBe('হিমায়িত প্রশ্ন টেক্সট');
        expect(response.questions[0].marks).toBe(5);
        expect(response.questions[0].options[0].text_en).toBe('Frozen Opt A');
        // Ensure student view does not leak correctKey
        expect(response.questions[0]).not.toHaveProperty('correctKey');
        expect(response.questions[0].options[0]).not.toHaveProperty('correctKey');
    });

    it('should fallback to QuestionBankQuestion for legacy exams with no snapshot and log a warning', async () => {
        const loggerWarnSpy = vi.spyOn(logger, 'warn');

        // 1. Create a question bank question
        const bq = await QuestionBankQuestion.create({
            question_en: 'Legacy Question Text',
            question_bn: 'লিগ্যাসি প্রশ্ন টেক্সট',
            correctKey: 'B',
            subject: 'Math',
            moduleCategory: 'General',
            options: [
                { key: 'A', text_en: 'Opt A', text_bn: 'বিকল্প ক' },
                { key: 'B', text_en: 'Opt B', text_bn: 'বিকল্প খ' }
            ],
            difficulty: 'medium',
            isActive: true,
            isArchived: false,
        });

        // 2. Create an Exam with NO snapshot created
        const exam = await Exam.create({
            title: 'Legacy Fallback Test Exam',
            subject: 'Math',
            duration: 40,
            totalQuestions: 1,
            totalMarks: 4,
            isPublished: true,
            createdBy: new mongoose.Types.ObjectId(),
            startDate: new Date(Date.now() - 3600000), // started 1 hour ago
            endDate: new Date(Date.now() + 3600000),   // ends in 1 hour
            resultPublishDate: new Date(Date.now() + 86400000),
            accessMode: 'all',
            attemptLimit: 1,
            questionOrder: [bq._id],
        });

        // 3. Create active ExamSession
        await ExamSession.create({
            exam: exam._id,
            student: studentId,
            attemptNo: 1,
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 40 * 60000),
            status: 'in_progress',
            isActive: true,
            answers: [],
        });

        // 4. Call startExam
        const response = await startExam(String(exam._id), String(studentId), deviceInfo);

        // 5. Verify it falls back to the live QuestionBankQuestion
        expect(response.questions).toHaveLength(1);
        expect(response.questions[0]._id).toBe(String(bq._id));
        expect(response.questions[0].question_en).toBe('Legacy Question Text');
        
        // 6. Verify warning log was triggered
        expect(loggerWarnSpy).toHaveBeenCalled();
        const warnMessage = loggerWarnSpy.mock.calls[0][0];
        expect(warnMessage).toContain('Legacy fallback for examId=');
    });
});
