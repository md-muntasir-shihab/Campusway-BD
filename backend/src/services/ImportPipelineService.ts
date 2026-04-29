/**
 * ImportPipelineService
 *
 * Bulk question import from Excel (.xlsx), CSV, and JSON files.
 * Row-level validation: skip invalid rows, record errors, continue processing.
 * Async processing for files > 5000 rows via QuestionImportJob model.
 * Validates hierarchy references exist before insert.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import QuestionImportJob from '../models/QuestionImportJob';
import QuestionGroup from '../models/QuestionGroup';
import QuestionCategory from '../models/QuestionCategory';
import QuestionTopic from '../models/QuestionTopic';

// ─── Types ──────────────────────────────────────────────────

export interface ImportRowError {
    row: number;
    error: string;
}

export interface ImportResult {
    total: number;
    success: number;
    failed: number;
    errors: ImportRowError[];
    jobId?: string;
}

/**
 * Raw row data parsed from Excel/CSV/JSON before validation.
 * Column mapping per Requirement 10.1:
 *   questionText, option1, option2, option3, option4,
 *   correctOption (1-4), explanation, difficulty,
 *   topic, category, group, tags, year, source
 */
export interface RawImportRow {
    questionText?: string;
    option1?: string;
    option2?: string;
    option3?: string;
    option4?: string;
    correctOption?: string | number;
    explanation?: string;
    difficulty?: string;
    topic?: string;
    category?: string;
    group?: string;
    tags?: string;
    year?: string;
    source?: string;
}

// ─── Constants ──────────────────────────────────────────────

const ASYNC_THRESHOLD = 5000;

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

const CORRECT_OPTION_MAP: Record<string, 'A' | 'B' | 'C' | 'D'> = {
    '1': 'A',
    '2': 'B',
    '3': 'C',
    '4': 'D',
    a: 'A',
    b: 'B',
    c: 'C',
    d: 'D',
};

/** Maps lowercase header names to RawImportRow property names. */
const HEADER_TO_FIELD: Record<string, keyof RawImportRow> = {
    questiontext: 'questionText',
    option1: 'option1',
    option2: 'option2',
    option3: 'option3',
    option4: 'option4',
    correctoption: 'correctOption',
    explanation: 'explanation',
    difficulty: 'difficulty',
    topic: 'topic',
    category: 'category',
    group: 'group',
    tags: 'tags',
    year: 'year',
    source: 'source',
};

/** Positional column order (fallback when headers don't match). */
const POSITIONAL_FIELDS: (keyof RawImportRow)[] = [
    'questionText', 'option1', 'option2', 'option3', 'option4',
    'correctOption', 'explanation', 'difficulty',
    'topic', 'category', 'group', 'tags', 'year', 'source',
];

// ─── Row Validation ─────────────────────────────────────────

/**
 * Pure function: validate a single import row.
 * Returns null if valid, or an error message string if invalid.
 *
 * Exported for unit/property testing.
 */
export function validateImportRow(row: RawImportRow): string | null {
    // questionText is required
    if (!row.questionText || String(row.questionText).trim().length === 0) {
        return 'questionText is required';
    }

    // At least option1 and option2 are required for MCQ
    if (!row.option1 || String(row.option1).trim().length === 0) {
        return 'option1 is required';
    }
    if (!row.option2 || String(row.option2).trim().length === 0) {
        return 'option2 is required';
    }

    // correctOption must be 1-4 (or a-d)
    const correctStr = String(row.correctOption ?? '').trim().toLowerCase();
    if (!correctStr || !CORRECT_OPTION_MAP[correctStr]) {
        return 'correctOption must be 1, 2, 3, or 4';
    }

    // Validate correctOption doesn't reference an empty option
    const optionIndex =
        parseInt(correctStr, 10) ||
        (['a', 'b', 'c', 'd'].indexOf(correctStr) + 1);
    const optionFields = [row.option1, row.option2, row.option3, row.option4];
    if (optionIndex >= 1 && optionIndex <= 4) {
        const referencedOption = optionFields[optionIndex - 1];
        if (!referencedOption || String(referencedOption).trim().length === 0) {
            return `correctOption references option${optionIndex} which is empty`;
        }
    }

    // Validate difficulty if provided
    if (row.difficulty) {
        const diff = String(row.difficulty).trim().toLowerCase();
        if (diff && !VALID_DIFFICULTIES.includes(diff as typeof VALID_DIFFICULTIES[number])) {
            return `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}`;
        }
    }

    return null;
}

// ─── Hierarchy Reference Validation ─────────────────────────

/** Escape special regex characters to prevent regex injection. */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate that referenced topic, category, and group values exist in the database.
 * Uses name-based lookup (case-insensitive) since import files use human-readable names.
 *
 * Requirement 10.7
 */
async function resolveHierarchyRefs(row: RawImportRow): Promise<{
    group_id?: mongoose.Types.ObjectId;
    subject_id?: mongoose.Types.ObjectId;
    topic_id?: mongoose.Types.ObjectId;
    error?: string;
}> {
    const result: {
        group_id?: mongoose.Types.ObjectId;
        subject_id?: mongoose.Types.ObjectId;
        topic_id?: mongoose.Types.ObjectId;
        error?: string;
    } = {};

    // Resolve group by name (title.en or title.bn) or code
    if (row.group && String(row.group).trim()) {
        const groupName = String(row.group).trim();
        const group = await QuestionGroup.findOne({
            $or: [
                { code: groupName.toLowerCase() },
                { 'title.en': { $regex: new RegExp(`^${escapeRegex(groupName)}$`, 'i') } },
                { 'title.bn': groupName },
            ],
            isActive: true,
        });
        if (!group) {
            result.error = `Group "${groupName}" not found`;
            return result;
        }
        result.group_id = group._id as mongoose.Types.ObjectId;
    }

    // Resolve category (subject) by name
    if (row.category && String(row.category).trim()) {
        const categoryName = String(row.category).trim();
        const query: Record<string, unknown> = {
            $or: [
                { code: categoryName.toLowerCase() },
                { 'title.en': { $regex: new RegExp(`^${escapeRegex(categoryName)}$`, 'i') } },
                { 'title.bn': categoryName },
            ],
            isActive: true,
        };
        if (result.group_id) {
            query.group_id = result.group_id;
        }
        const category = await QuestionCategory.findOne(query);
        if (!category) {
            result.error = `Category "${categoryName}" not found`;
            return result;
        }
        result.subject_id = category._id as mongoose.Types.ObjectId;
    }

    // Resolve topic by name
    if (row.topic && String(row.topic).trim()) {
        const topicName = String(row.topic).trim();
        const query: Record<string, unknown> = {
            $or: [
                { code: topicName.toLowerCase() },
                { 'title.en': { $regex: new RegExp(`^${escapeRegex(topicName)}$`, 'i') } },
                { 'title.bn': topicName },
            ],
            isActive: true,
        };
        if (result.subject_id) {
            query.category_id = result.subject_id;
        }
        const topic = await QuestionTopic.findOne(query);
        if (!topic) {
            result.error = `Topic "${topicName}" not found`;
            return result;
        }
        result.topic_id = topic._id as mongoose.Types.ObjectId;
    }

    return result;
}

// ─── Row to Document Conversion ─────────────────────────────

function buildQuestionDoc(
    row: RawImportRow,
    adminId: string,
    refs: {
        group_id?: mongoose.Types.ObjectId;
        subject_id?: mongoose.Types.ObjectId;
        topic_id?: mongoose.Types.ObjectId;
    },
) {
    const correctStr = String(row.correctOption ?? '').trim().toLowerCase();
    const correctKey = CORRECT_OPTION_MAP[correctStr] || 'A';

    const options: { key: 'A' | 'B' | 'C' | 'D'; text_en: string; isCorrect: boolean }[] = [
        { key: 'A', text_en: String(row.option1 || '').trim(), isCorrect: correctKey === 'A' },
        { key: 'B', text_en: String(row.option2 || '').trim(), isCorrect: correctKey === 'B' },
    ];

    if (row.option3 && String(row.option3).trim()) {
        options.push({ key: 'C', text_en: String(row.option3).trim(), isCorrect: correctKey === 'C' });
    }
    if (row.option4 && String(row.option4).trim()) {
        options.push({ key: 'D', text_en: String(row.option4).trim(), isCorrect: correctKey === 'D' });
    }

    const difficulty = row.difficulty
        ? (String(row.difficulty).trim().toLowerCase() as 'easy' | 'medium' | 'hard')
        : 'medium';

    const tags = row.tags
        ? String(row.tags).split(',').map((t) => t.trim()).filter(Boolean)
        : [];

    return {
        question_en: String(row.questionText || '').trim(),
        question_type: 'mcq' as const,
        options,
        correctKey,
        explanation_en: String(row.explanation || '').trim(),
        difficulty,
        subject: row.category ? String(row.category).trim() : 'General',
        moduleCategory: row.category ? String(row.category).trim() : 'General',
        topic: row.topic ? String(row.topic).trim() : '',
        tags,
        yearOrSession: row.year ? String(row.year).trim() : '',
        sourceLabel: row.source ? String(row.source).trim() : '',
        marks: 1,
        negativeMarks: 0,
        languageMode: 'en' as const,
        status: 'draft' as const,
        review_status: 'pending' as const,
        isActive: true,
        isArchived: false,
        versionNo: 1,
        contentHash: '',
        group_id: refs.group_id || undefined,
        subject_id: refs.subject_id || undefined,
        topic_id: refs.topic_id || undefined,
        created_by: new mongoose.Types.ObjectId(adminId),
    };
}

// ─── Core Processing ────────────────────────────────────────

/**
 * Process an array of parsed rows: validate each, resolve hierarchy refs, insert valid ones.
 * Returns ImportResult with row-level error details.
 *
 * Requirements 10.4, 10.5, 10.7
 */
async function processRows(rows: RawImportRow[], adminId: string): Promise<ImportResult> {
    const importResult: ImportResult = {
        total: rows.length,
        success: 0,
        failed: 0,
        errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 1; // 1-indexed for user-facing errors

        // Step 1: Validate row structure
        const validationError = validateImportRow(row);
        if (validationError) {
            importResult.failed++;
            importResult.errors.push({ row: rowNumber, error: validationError });
            continue;
        }

        // Step 2: Resolve hierarchy references
        const refs = await resolveHierarchyRefs(row);
        if (refs.error) {
            importResult.failed++;
            importResult.errors.push({ row: rowNumber, error: refs.error });
            continue;
        }

        // Step 3: Build and insert document
        try {
            const doc = buildQuestionDoc(row, adminId, refs);
            await QuestionBankQuestion.create(doc);
            importResult.success++;
        } catch (err: unknown) {
            importResult.failed++;
            const message = err instanceof Error ? err.message : 'Unknown insertion error';
            importResult.errors.push({ row: rowNumber, error: message });
        }
    }

    return importResult;
}

// ─── Header Matching ────────────────────────────────────────

/**
 * Match a raw header string to a RawImportRow field name.
 * Tries exact lowercase match first, then substring match.
 */
function matchHeader(header: string): keyof RawImportRow | undefined {
    const lower = header.trim().toLowerCase().replace(/[\s_-]+/g, '');
    return HEADER_TO_FIELD[lower];
}

// ─── Excel Import ───────────────────────────────────────────

/**
 * Parse rows from an Excel (.xlsx) buffer.
 * First row is treated as header. Columns mapped by header name or position.
 *
 * Requirement 10.1
 */
async function parseExcelRows(file: Buffer): Promise<RawImportRow[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) return [];

    const rows: RawImportRow[] = [];
    let columnMapping: (keyof RawImportRow | undefined)[] = [];

    worksheet.eachRow((row, rowNumber) => {
        const values = row.values
            ? (row.values as (string | number | undefined | null)[]).slice(1)
            : [];

        if (rowNumber === 1) {
            // Build column mapping from header row
            columnMapping = values.map((v) => {
                if (v == null) return undefined;
                return matchHeader(String(v));
            });

            // If no headers matched, use positional mapping
            const matchedCount = columnMapping.filter(Boolean).length;
            if (matchedCount === 0) {
                columnMapping = POSITIONAL_FIELDS.slice(0, values.length) as (keyof RawImportRow | undefined)[];
            }
            return;
        }

        const rawRow: Partial<RawImportRow> = {};
        for (let col = 0; col < values.length && col < columnMapping.length; col++) {
            const field = columnMapping[col];
            if (field && values[col] != null) {
                (rawRow as Record<string, unknown>)[field] = String(values[col]);
            }
        }

        // Only add rows that have at least some data
        if (Object.keys(rawRow).length > 0) {
            rows.push(rawRow as RawImportRow);
        }
    });

    return rows;
}

/**
 * Import questions from an Excel (.xlsx) file.
 * For files > 5000 rows, creates a QuestionImportJob for async processing.
 *
 * Requirements 10.1, 10.6
 */
export async function importExcel(file: Buffer, adminId: string): Promise<ImportResult> {
    const rows = await parseExcelRows(file);

    if (rows.length > ASYNC_THRESHOLD) {
        return createAsyncJob(rows, adminId, 'excel');
    }

    return processRows(rows, adminId);
}

// ─── CSV Import ─────────────────────────────────────────────

/**
 * Parse rows from a CSV buffer.
 * Uses the same column mapping as Excel imports.
 *
 * Requirement 10.2
 */
async function parseCSVRows(file: Buffer): Promise<RawImportRow[]> {
    const rows: RawImportRow[] = [];

    return new Promise((resolve, reject) => {
        const stream = Readable.from(file);
        stream
            .pipe(
                csvParser({
                    mapHeaders: ({ header }: { header: string }) => {
                        const field = matchHeader(header);
                        return field || header.trim().toLowerCase();
                    },
                }),
            )
            .on('data', (data: Record<string, string>) => {
                const rawRow: Partial<RawImportRow> = {};
                for (const [key, value] of Object.entries(data)) {
                    const field = HEADER_TO_FIELD[key] || matchHeader(key);
                    if (field && value != null && String(value).trim()) {
                        (rawRow as Record<string, unknown>)[field] = value;
                    }
                }
                if (Object.keys(rawRow).length > 0) {
                    rows.push(rawRow as RawImportRow);
                }
            })
            .on('end', () => resolve(rows))
            .on('error', (err: Error) => reject(err));
    });
}

/**
 * Import questions from a CSV file.
 * Same column mapping as Excel imports.
 * For files > 5000 rows, creates a QuestionImportJob for async processing.
 *
 * Requirements 10.2, 10.6
 */
export async function importCSV(file: Buffer, adminId: string): Promise<ImportResult> {
    const rows = await parseCSVRows(file);

    if (rows.length > ASYNC_THRESHOLD) {
        return createAsyncJob(rows, adminId, 'csv');
    }

    return processRows(rows, adminId);
}

// ─── JSON Import ────────────────────────────────────────────

/**
 * Parse and validate rows from a JSON buffer.
 * Expects an array of objects matching the RawImportRow schema.
 *
 * Requirement 10.3
 */
function parseJSONRows(file: Buffer): RawImportRow[] {
    const text = file.toString('utf-8');
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
        throw new Error('JSON import file must contain an array of question objects');
    }

    return parsed.map((item: Record<string, unknown>) => ({
        questionText: item.questionText != null ? String(item.questionText) : undefined,
        option1: item.option1 != null ? String(item.option1) : undefined,
        option2: item.option2 != null ? String(item.option2) : undefined,
        option3: item.option3 != null ? String(item.option3) : undefined,
        option4: item.option4 != null ? String(item.option4) : undefined,
        correctOption: item.correctOption != null ? String(item.correctOption) : undefined,
        explanation: item.explanation != null ? String(item.explanation) : undefined,
        difficulty: item.difficulty != null ? String(item.difficulty) : undefined,
        topic: item.topic != null ? String(item.topic) : undefined,
        category: item.category != null ? String(item.category) : undefined,
        group: item.group != null ? String(item.group) : undefined,
        tags: item.tags != null ? String(item.tags) : undefined,
        year: item.year != null ? String(item.year) : undefined,
        source: item.source != null ? String(item.source) : undefined,
    }));
}

/**
 * Import questions from a JSON file.
 * Validates each object against the expected schema.
 * For files > 5000 rows, creates a QuestionImportJob for async processing.
 *
 * Requirements 10.3, 10.6
 */
export async function importJSON(file: Buffer, adminId: string): Promise<ImportResult> {
    let rows: RawImportRow[];
    try {
        rows = parseJSONRows(file);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid JSON format';
        return { total: 0, success: 0, failed: 0, errors: [{ row: 0, error: message }] };
    }

    if (rows.length > ASYNC_THRESHOLD) {
        return createAsyncJob(rows, adminId, 'json');
    }

    return processRows(rows, adminId);
}

// ─── Async Job Processing ───────────────────────────────────

/**
 * Create a QuestionImportJob for async processing of large files (> 5000 rows).
 * Stores the rows in the job options and returns immediately with the job ID.
 *
 * Requirement 10.6
 */
async function createAsyncJob(
    rows: RawImportRow[],
    adminId: string,
    format: string,
): Promise<ImportResult> {
    const job = await QuestionImportJob.create({
        status: 'pending',
        sourceFileName: `import.${format}`,
        createdBy: new mongoose.Types.ObjectId(adminId),
        totalRows: rows.length,
        options: { rows, adminId, format },
    });

    return {
        total: rows.length,
        success: 0,
        failed: 0,
        errors: [],
        jobId: (job._id as mongoose.Types.ObjectId).toString(),
    };
}

/**
 * Process an async import job. Called by a background worker/cron.
 * Updates the QuestionImportJob document with progress and results.
 *
 * Requirement 10.6
 */
export async function processAsyncImport(jobId: string): Promise<void> {
    const job = await QuestionImportJob.findById(jobId);
    if (!job) throw new Error(`Import job "${jobId}" not found`);
    if (job.status !== 'pending') throw new Error(`Import job "${jobId}" is not in pending status`);

    const opts = job.options as { rows: RawImportRow[]; adminId: string } | undefined;
    if (!opts?.rows || !opts?.adminId) {
        job.status = 'failed';
        job.rowErrors = [{ rowNumber: 0, reason: 'Missing job options (rows or adminId)' }];
        job.finishedAt = new Date();
        await job.save();
        return;
    }

    job.status = 'processing';
    job.startedAt = new Date();
    await job.save();

    try {
        const importResult = await processRows(opts.rows, opts.adminId);

        job.status = 'completed';
        job.importedRows = importResult.success;
        job.failedRows = importResult.failed;
        job.totalRows = importResult.total;
        job.rowErrors = importResult.errors.map((e) => ({
            rowNumber: e.row,
            reason: e.error,
        }));
        job.finishedAt = new Date();
        await job.save();
    } catch (err: unknown) {
        job.status = 'failed';
        job.rowErrors = [{
            rowNumber: 0,
            reason: err instanceof Error ? err.message : 'Unknown processing error',
        }];
        job.finishedAt = new Date();
        await job.save();
    }
}
