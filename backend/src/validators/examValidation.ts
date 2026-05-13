/**
 * Exam payload validation utility.
 *
 * Validates exam creation/update payloads:
 * - Non-empty title
 * - Duration > 0
 * - Group-only visibility includes at least one target group
 * - If question payload is provided inline, validate mark integrity
 *
 * Requirements: 8.7, 8.8, 8.9, 8.10, 13.5, 13.6, 13.7, 13.8, 13.9
 */

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateExamPayload(payload: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const hasQuestionsField = Object.prototype.hasOwnProperty.call(payload, 'questions');
    const questions = Array.isArray(payload.questions) ? payload.questions as Array<{ marks: number }> : null;
    const totalMarks = Number(payload.totalMarks ?? 0);

    // 1. Title validation (Requirements 8.7, 13.5)
    if (!(payload.title as string)?.trim()) {
        errors.push('Exam title is required');
    }

    // 2. Duration validation (Requirements 8.9, 13.7)
    if ((payload.duration as number) <= 0) {
        errors.push('Duration must be greater than 0');
    }

    // 3. Inline question validation.
    // Admin draft create/edit flows save metadata before attaching questions,
    // so question/mark requirements only apply when questions are sent inline.
    if (hasQuestionsField) {
        if (!questions || questions.length === 0) {
            errors.push('At least 1 question is required');
        } else {
            if (totalMarks <= 0) {
                errors.push('Total marks must be greater than 0');
            }

            const sum = questions.reduce((acc, q) => acc + Number(q.marks || 0), 0);
            if (sum !== totalMarks) {
                errors.push(`Sum of question marks (${sum}) does not equal total marks (${payload.totalMarks})`);
            }
        }
    }

    // 4. group_only visibility requires at least one targetGroupId (Requirement 5.1)
    if (String(payload.visibilityMode) === 'group_only') {
        const targetGroupIds = Array.isArray(payload.targetGroupIds) ? payload.targetGroupIds : [];
        if (targetGroupIds.length === 0) {
            errors.push('At least one target group is required when visibility is set to group_only');
        }
    }

    return { valid: errors.length === 0, errors };
}
