import { describe, it, expect, vi } from 'vitest';
import mongoose from 'mongoose';
import { ExamQuestionModel } from '../models/examQuestion.model';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import { buildSessionStartResponse } from '../services/ExamRunnerService';
import { logger } from '../utils/logger';

describe('ExamRunnerService — Question Snapshot Integrity', () => {
    it('returns frozen snapshot question text from ExamQuestionModel even if QuestionBankQuestion is later edited', async () => {
        const examId = new mongoose.Types.ObjectId().toString();
        const bankQuestionId = new mongoose.Types.ObjectId().toString();
        const examQuestionId = new mongoose.Types.ObjectId();

        const mockExam: any = {
            _id: examId,
            duration: 60,
            randomizeQuestions: false,
            defaultMarksPerQuestion: 1,
        };

        const mockSession: any = {
            _id: new mongoose.Types.ObjectId(),
            exam: new mongoose.Types.ObjectId(examId),
            student: new mongoose.Types.ObjectId(),
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000),
        };

        const snapshotDoc = {
            _id: examQuestionId,
            examId,
            fromBankQuestionId: bankQuestionId,
            orderIndex: 0,
            question_en: 'Original Question Text (Frozen)',
            question_bn: 'মূল প্রশ্ন টেক্সট (হিমায়িত)',
            questionImageUrl: 'https://example.com/original.png',
            options: [
                { key: 'A', text_en: 'Original Option A', text_bn: 'ক' },
                { key: 'B', text_en: 'Original Option B', text_bn: 'খ' },
            ],
            correctKey: 'A',
            marks: 2,
        };

        // Mock ExamQuestionModel.find to return frozen snapshot
        vi.spyOn(ExamQuestionModel, 'find').mockReturnValue({
            lean: vi.fn().mockResolvedValue([snapshotDoc]),
        } as any);

        // Call buildSessionStartResponse
        const response = await buildSessionStartResponse(mockSession, mockExam);

        expect(response.questions).toHaveLength(1);
        expect(response.questions[0]._id).toBe(examQuestionId.toString());
        expect(response.questions[0].question_en).toBe('Original Question Text (Frozen)');
        expect(response.questions[0].question_bn).toBe('মূল প্রশ্ন টেক্সট (হিমায়িত)');
        expect(response.questions[0].marks).toBe(2);
        expect(response.questions[0].options).toEqual([
            { key: 'A', text_en: 'Original Option A', text_bn: 'ক', imageUrl: undefined },
            { key: 'B', text_en: 'Original Option B', text_bn: 'খ', imageUrl: undefined },
        ]);
        // Confirm correctKey is omitted in student response
        expect((response.questions[0] as any).correctKey).toBeUndefined();

        vi.restoreAllMocks();
    });

    it('falls back to QuestionBankQuestion and logs a warning when no ExamQuestion snapshot exists (legacy exam)', async () => {
        const examId = new mongoose.Types.ObjectId().toString();
        const bankQuestionId = new mongoose.Types.ObjectId();

        const mockExam: any = {
            _id: examId,
            duration: 30,
            randomizeQuestions: false,
            defaultMarksPerQuestion: 1,
            questionOrder: [bankQuestionId],
        };

        const mockSession: any = {
            _id: new mongoose.Types.ObjectId(),
            exam: new mongoose.Types.ObjectId(examId),
            student: new mongoose.Types.ObjectId(),
            startedAt: new Date(),
            expiresAt: new Date(Date.now() + 1800000),
        };

        const legacyBankDoc = {
            _id: bankQuestionId,
            question_en: 'Legacy Bank Question',
            question_bn: 'লেগ্যাসি প্রশ্ন',
            question_type: 'mcq',
            options: [{ key: 'A', text_en: 'Opt A', text_bn: 'ক' }],
            marks: 1,
        };

        // Mock ExamQuestionModel.find to return empty array (legacy)
        vi.spyOn(ExamQuestionModel, 'find').mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
        } as any);

        // Mock QuestionBankQuestion.find to return legacy bank doc
        vi.spyOn(QuestionBankQuestion, 'find').mockReturnValue({
            lean: vi.fn().mockResolvedValue([legacyBankDoc]),
        } as any);

        const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

        const response = await buildSessionStartResponse(mockSession, mockExam);

        expect(response.questions).toHaveLength(1);
        expect(response.questions[0].question_en).toBe('Legacy Bank Question');
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining(`Legacy fallback for examId=${examId}`),
        );

        vi.restoreAllMocks();
    });
});
