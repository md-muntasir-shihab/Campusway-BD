/**
 * Exam Model Bridge — maps between the modern (formerly exam.model.ts → `exams` collection)
 * and the rich (Exam.ts → `exam_collection`) field names. The consolidation target
 * is the rich model; this bridge allows modern routes to transition incrementally.
 *
 * Usage: Import from this bridge when you need field-name mapping between
 * the modern API format and the canonical Exam model.
 */
import Exam, { type IExam } from '../models/Exam';

/**
 * Map a modern-model payload to the rich model's field names.
 */
export function modernToRich(input: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = { ...input };

    // Field renames: modern → rich
    if ('durationMinutes' in mapped) {
        mapped.duration = mapped.durationMinutes;
        delete mapped.durationMinutes;
    }
    if ('examWindowStartUTC' in mapped) {
        mapped.startDate = mapped.examWindowStartUTC;
        delete mapped.examWindowStartUTC;
    }
    if ('examWindowEndUTC' in mapped) {
        mapped.endDate = mapped.examWindowEndUTC;
        delete mapped.examWindowEndUTC;
    }
    if ('resultPublishAtUTC' in mapped) {
        mapped.resultPublishDate = mapped.resultPublishAtUTC;
        delete mapped.resultPublishAtUTC;
    }
    if ('negativeMarkingEnabled' in mapped) {
        mapped.negativeMarking = mapped.negativeMarkingEnabled;
        delete mapped.negativeMarkingEnabled;
    }
    if ('negativePerWrong' in mapped) {
        mapped.negativeMarkValue = mapped.negativePerWrong;
        delete mapped.negativePerWrong;
    }
    if ('showTimer' in mapped) {
        mapped.showRemainingTime = mapped.showTimer;
        delete mapped.showTimer;
    }
    if ('answerChangeLimit' in mapped) {
        mapped.answerEditLimitPerQuestion = mapped.answerChangeLimit;
        delete mapped.answerChangeLimit;
    }
    if ('createdByAdminId' in mapped) {
        mapped.createdBy = mapped.createdByAdminId;
        delete mapped.createdByAdminId;
    }

    // type field rename (modern uses type for delivery, rich uses deliveryMode)
    if (mapped.type === 'internal_mcq' || mapped.type === 'external_link') {
        mapped.deliveryMode = mapped.type === 'internal_mcq' ? 'internal' : 'external_link';
        delete mapped.type;
    }

    return mapped;
}

/**
 * Map a rich model document to the modern field names (for API responses
 * consumed by modern frontend code).
 */
export function richToModern(doc: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = { ...doc };

    mapped.durationMinutes = mapped.duration;
    mapped.examWindowStartUTC = mapped.startDate;
    mapped.examWindowEndUTC = mapped.endDate;
    mapped.resultPublishAtUTC = mapped.resultPublishDate;
    mapped.negativeMarkingEnabled = mapped.negativeMarking;
    mapped.negativePerWrong = mapped.negativeMarkValue;
    mapped.showTimer = mapped.showRemainingTime;
    mapped.answerChangeLimit = mapped.answerEditLimitPerQuestion;

    return mapped;
}

export { Exam as ExamUnified, type IExam };
