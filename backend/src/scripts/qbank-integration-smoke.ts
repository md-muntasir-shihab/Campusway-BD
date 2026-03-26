import assert from 'assert';
import {
    normalizeQuestionPayload,
    detectSimilarQuestions,
} from '../utils/questionBank';

type Row = Record<string, unknown>;

function mapRow(row: Row, mapping: Record<string, string>): Row {
    const out: Row = {};
    for (const [target, source] of Object.entries(mapping)) {
        out[target] = row[source];
    }
    return out;
}

function runImportMappingIntegration(): void {
    const rawRows: Row[] = [
        {
            প্রশ্ন: 'বাংলা সাহিত্যের প্রথম নারী কবি কে?',
            বিষয়: 'বাংলা',
            অধ্যায়: 'সাহিত্য',
            অপশন_A: 'চন্দ্রাবতী',
            অপশন_B: 'বেগম রোকেয়া',
            অপশন_C: 'কামিনী রায়',
            সঠিক_উত্তর: 'A',
        },
    ];

    const mapping = {
        question_text: 'প্রশ্ন',
        subject: 'বিষয়',
        chapter: 'অধ্যায়',
        optionA: 'অপশন_A',
        optionB: 'অপশন_B',
        optionC: 'অপশন_C',
        correctAnswer: 'সঠিক_উত্তর',
    };

    const mapped = rawRows.map((row) => mapRow(row, mapping));
    const normalized = normalizeQuestionPayload(mapped[0], 'pending_review');
    assert.equal(normalized.errors.length, 0, 'Mapped payload should be valid');
    assert.equal(normalized.normalized.subject, 'বাংলা');
    assert.equal(normalized.normalized.correct_answer[0], 'A');
}

function runPickerCompatibilityIntegration(): void {
    const candidate = normalizeQuestionPayload(
        {
            question_text: 'বাংলাদেশের জাতীয় কবি কে?',
            subject: 'বাংলা',
            optionA: 'কাজী নজরুল ইসলাম',
            optionB: 'রবীন্দ্রনাথ ঠাকুর',
            correctAnswer: 'A',
        },
        'approved',
    ).normalized;

    const matches = detectSimilarQuestions(
        { question: candidate.question, options: candidate.options },
        [
            {
                _id: '65f1a50bd4f5f735d393d100',
                question: 'বাংলাদেশের জাতীয় কবি কে',
                optionA: 'কাজী নজরুল ইসলাম',
                optionB: 'রবীন্দ্রনাথ ঠাকুর',
            },
        ],
        0.7,
    );
    assert.ok(matches.length > 0, 'Picker candidate should detect similarity');
}

function run(): void {
    runImportMappingIntegration();
    runPickerCompatibilityIntegration();
    console.log('[qbank-integration-smoke] all checks passed');
}

run();
