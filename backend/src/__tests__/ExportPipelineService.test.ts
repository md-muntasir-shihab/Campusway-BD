/**
 * ExportPipelineService — Unit Tests
 *
 * Tests for exportQuestionsExcel, exportQuestionsCSV, exportResultsPDF.
 * Uses mongodb-memory-server for isolated database testing.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import ExcelJS from 'exceljs';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import Exam from '../models/Exam';
import ExamResult from '../models/ExamResult';
// Import User model so Mongoose can resolve populate('student') references
import '../models/User';
import {
    exportQuestionsExcel,
    exportQuestionsCSV,
    exportResultsPDF,
    generateExcelBuffer,
    generateCSVBuffer,
    generateResultsPDFBuffer,
    renderLatexToText,
} from '../services/ExportPipelineService';
import type { QuestionFilters, ExportJobResult } from '../services/ExportPipelineService';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await QuestionBankQuestion.deleteMany({});
    await Exam.deleteMany({});
    await ExamResult.deleteMany({});
});

// ─── Helpers ────────────────────────────────────────────────

function createSampleQuestion(overrides: Record<string, unknown> = {}) {
    return {
        question_en: 'What is 2+2?',
        question_bn: '২+২ কত?',
        subject: 'Math',
        moduleCategory: 'Arithmetic',
        topic: 'Addition',
        difficulty: 'easy' as const,
        languageMode: 'both' as const,
        options: [
            { key: 'A', text_en: '3', text_bn: '৩', isCorrect: false },
            { key: 'B', text_en: '4', text_bn: '৪', isCorrect: true },
            { key: 'C', text_en: '5', text_bn: '৫', isCorrect: false },
            { key: 'D', text_en: '6', text_bn: '৬', isCorrect: false },
        ],
        correctKey: 'B' as const,
        explanation_en: 'Basic addition',
        explanation_bn: 'মৌলিক যোগ',
        marks: 1,
        negativeMarks: 0,
        tags: ['math', 'basic'],
        sourceLabel: 'Textbook',
        yearOrSession: '2024',
        isActive: true,
        isArchived: false,
        contentHash: '',
        versionNo: 1,
        status: 'published',
        review_status: 'approved',
        ...overrides,
    };
}

// ─── Excel Export Tests ─────────────────────────────────────

describe('exportQuestionsExcel', () => {
    it('should generate a valid Excel buffer with correct columns', async () => {
        await QuestionBankQuestion.create(createSampleQuestion());

        const result = await exportQuestionsExcel({});
        expect(Buffer.isBuffer(result)).toBe(true);

        // Parse the Excel buffer to verify content
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(result as Buffer);

        const worksheet = workbook.worksheets[0];
        expect(worksheet).toBeDefined();
        expect(worksheet.name).toBe('Questions');

        // Verify header row
        const headerRow = worksheet.getRow(1);
        const headers = headerRow.values as (string | undefined)[];
        expect(headers).toContain('questionText');
        expect(headers).toContain('option1');
        expect(headers).toContain('option2');
        expect(headers).toContain('correctOption');
        expect(headers).toContain('difficulty');

        // Verify data row exists
        expect(worksheet.rowCount).toBe(2); // header + 1 data row
    });

    it('should export questions matching filters only', async () => {
        await QuestionBankQuestion.create([
            createSampleQuestion({ subject: 'Math', difficulty: 'easy' }),
            createSampleQuestion({
                question_en: 'What is gravity?',
                subject: 'Physics',
                difficulty: 'hard',
            }),
        ]);

        const result = await exportQuestionsExcel({ difficulty: 'easy' });
        expect(Buffer.isBuffer(result)).toBe(true);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(result as Buffer);
        const worksheet = workbook.worksheets[0];

        // Should only have header + 1 matching row
        expect(worksheet.rowCount).toBe(2);
    });

    it('should return empty Excel with only headers when no questions match', async () => {
        const result = await exportQuestionsExcel({ difficulty: 'hard' });
        expect(Buffer.isBuffer(result)).toBe(true);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(result as Buffer);
        const worksheet = workbook.worksheets[0];

        // Only header row
        expect(worksheet.rowCount).toBe(1);
    });

    it('should map correctKey to numeric correctOption', async () => {
        await QuestionBankQuestion.create(
            createSampleQuestion({ correctKey: 'C' }),
        );

        const result = await exportQuestionsExcel({});
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(result as Buffer);
        const worksheet = workbook.worksheets[0];

        // correctOption is the 6th column (1-based index)
        const dataRow = worksheet.getRow(2);
        const correctOptionValue = dataRow.getCell(6).value;
        expect(correctOptionValue).toBe('3'); // C maps to 3
    });

    it('should exclude archived questions', async () => {
        await QuestionBankQuestion.create([
            createSampleQuestion({ isArchived: false }),
            createSampleQuestion({
                question_en: 'Archived Q',
                isArchived: true,
            }),
        ]);

        const result = await exportQuestionsExcel({});
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(result as Buffer);
        const worksheet = workbook.worksheets[0];

        // Only 1 non-archived question + header
        expect(worksheet.rowCount).toBe(2);
    });
});

// ─── CSV Export Tests ───────────────────────────────────────

describe('exportQuestionsCSV', () => {
    it('should generate a UTF-8 CSV buffer with BOM', async () => {
        await QuestionBankQuestion.create(createSampleQuestion());

        const result = await exportQuestionsCSV({});
        expect(Buffer.isBuffer(result)).toBe(true);

        const csvString = (result as Buffer).toString('utf-8');

        // Verify UTF-8 BOM
        expect(csvString.charCodeAt(0)).toBe(0xfeff);

        // Verify header row
        expect(csvString).toContain('questionText');
        expect(csvString).toContain('option1');
        expect(csvString).toContain('correctOption');
    });

    it('should include Bengali text in CSV output', async () => {
        await QuestionBankQuestion.create(createSampleQuestion());

        const result = await exportQuestionsCSV({});
        const csvString = (result as Buffer).toString('utf-8');

        // Bengali question text should be present
        expect(csvString).toContain('২+২ কত?');
    });

    it('should escape fields containing commas and quotes', async () => {
        await QuestionBankQuestion.create(
            createSampleQuestion({
                question_bn: 'প্রশ্ন, "উত্তর" দিন',
            }),
        );

        const result = await exportQuestionsCSV({});
        const csvString = (result as Buffer).toString('utf-8');

        // Field with comma and quotes should be properly escaped
        expect(csvString).toContain('"প্রশ্ন, ""উত্তর"" দিন"');
    });

    it('should apply filters to CSV export', async () => {
        await QuestionBankQuestion.create([
            createSampleQuestion({ difficulty: 'easy' }),
            createSampleQuestion({
                question_en: 'Hard Q',
                question_bn: 'কঠিন প্রশ্ন',
                difficulty: 'hard',
            }),
        ]);

        const result = await exportQuestionsCSV({ difficulty: 'easy' });
        const csvString = (result as Buffer).toString('utf-8');
        const lines = csvString.trim().split('\n');

        // Header + 1 data row
        expect(lines.length).toBe(2);
    });
});

// ─── PDF Export Tests ───────────────────────────────────────

describe('exportResultsPDF', () => {
    it('should generate a valid PDF buffer', async () => {
        const exam = await Exam.create({
            title: 'Math Final Exam',
            title_bn: 'গণিত চূড়ান্ত পরীক্ষা',
            subject: 'Math',
            totalQuestions: 10,
            totalMarks: 100,
            duration: 60,
            negativeMarking: false,
            negativeMarkValue: 0,
            randomizeQuestions: false,
            randomizeOptions: false,
            allowBackNavigation: true,
            showQuestionPalette: true,
            showRemainingTime: true,
            autoSubmitOnTimeout: true,
            allowPause: false,
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-06-01'),
            scheduleWindows: [],
            resultPublishDate: new Date('2024-06-02'),
            isPublished: true,
            showAnswersAfterExam: true,
            defaultMarksPerQuestion: 10,
            accessMode: 'all',
            allowedUsers: [],
            assignedUniversityIds: [],
            attemptLimit: 1,
        });

        const studentId = new mongoose.Types.ObjectId();
        await ExamResult.create({
            exam: exam._id,
            student: studentId,
            answers: [],
            totalMarks: 100,
            obtainedMarks: 75,
            correctCount: 7,
            wrongCount: 2,
            unansweredCount: 1,
            percentage: 75,
            rank: 1,
            timeTaken: 3000,
            submittedAt: new Date(),
        });

        const result = await exportResultsPDF(
            (exam._id as mongoose.Types.ObjectId).toString(),
        );
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);

        // PDF files start with %PDF
        const pdfHeader = result.subarray(0, 5).toString('ascii');
        expect(pdfHeader).toBe('%PDF-');
    });

    it('should throw error for non-existent exam', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        await expect(exportResultsPDF(fakeId)).rejects.toThrow(
            `Exam "${fakeId}" not found`,
        );
    });

    it('should generate PDF even with zero results', async () => {
        const exam = await Exam.create({
            title: 'Empty Exam',
            subject: 'Science',
            totalQuestions: 5,
            totalMarks: 50,
            duration: 30,
            negativeMarking: false,
            negativeMarkValue: 0,
            randomizeQuestions: false,
            randomizeOptions: false,
            allowBackNavigation: true,
            showQuestionPalette: true,
            showRemainingTime: true,
            autoSubmitOnTimeout: true,
            allowPause: false,
            startDate: new Date(),
            endDate: new Date(),
            scheduleWindows: [],
            resultPublishDate: new Date(),
            isPublished: true,
            showAnswersAfterExam: true,
            defaultMarksPerQuestion: 10,
            accessMode: 'all',
            allowedUsers: [],
            assignedUniversityIds: [],
            attemptLimit: 1,
        });

        const result = await exportResultsPDF(
            (exam._id as mongoose.Types.ObjectId).toString(),
        );
        expect(Buffer.isBuffer(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
    });
});

// ─── LaTeX Rendering Tests ──────────────────────────────────

describe('renderLatexToText', () => {
    it('should return empty string for empty input', () => {
        expect(renderLatexToText('')).toBe('');
    });

    it('should pass through text without LaTeX', () => {
        expect(renderLatexToText('Hello World')).toBe('Hello World');
    });

    it('should render inline LaTeX expressions', () => {
        const result = renderLatexToText('The answer is $x^2$');
        expect(result).toBeTruthy();
        expect(result).not.toContain('$');
        expect(result.length).toBeGreaterThan(0);
    });

    it('should render block LaTeX expressions', () => {
        const result = renderLatexToText('Formula: $$\\frac{a}{b}$$');
        expect(result).toBeTruthy();
        expect(result).not.toContain('$$');
    });

    it('should handle invalid LaTeX gracefully', () => {
        const result = renderLatexToText('Bad: $\\invalid_command$');
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
    });

    it('should handle mixed Bengali and LaTeX', () => {
        const result = renderLatexToText('যদি $x = 5$ হয়, তাহলে $x^2 = 25$');
        expect(result).toBeTruthy();
        expect(result).toContain('যদি');
        expect(result).toContain('হয়, তাহলে');
    });
});

// ─── Async Threshold Tests ──────────────────────────────────

describe('async processing for large datasets', () => {
    it('should return Buffer for small datasets (Excel)', async () => {
        const result = await exportQuestionsExcel({});
        expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should return Buffer for small datasets (CSV)', async () => {
        const result = await exportQuestionsCSV({});
        expect(Buffer.isBuffer(result)).toBe(true);
    });
});

// ─── generateCSVBuffer Tests ────────────────────────────────

describe('generateCSVBuffer', () => {
    it('should produce CSV with BOM and correct row count', () => {
        const questions = [
            createSampleQuestion(),
            createSampleQuestion({ question_en: 'Q2', question_bn: 'প্রশ্ন ২' }),
        ] as unknown as import('../models/QuestionBankQuestion').IQuestionBankQuestion[];

        const buffer = generateCSVBuffer(questions);
        const csv = buffer.toString('utf-8');

        // BOM check
        expect(csv.charCodeAt(0)).toBe(0xfeff);

        // Header + 2 data rows
        const lines = csv.trim().split('\n');
        expect(lines.length).toBe(3);
    });
});

// ─── generateExcelBuffer Tests ──────────────────────────────

describe('generateExcelBuffer', () => {
    it('should produce Excel with correct worksheet and row count', async () => {
        const questions = [
            createSampleQuestion(),
        ] as unknown as import('../models/QuestionBankQuestion').IQuestionBankQuestion[];

        const buffer = await generateExcelBuffer(questions);
        expect(Buffer.isBuffer(buffer)).toBe(true);

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const ws = workbook.worksheets[0];

        expect(ws.name).toBe('Questions');
        expect(ws.rowCount).toBe(2); // header + 1 row
    });
});
