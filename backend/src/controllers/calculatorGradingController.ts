import { Request, Response } from 'express';
import CalculatorGrading, { IGradeRow } from '../models/CalculatorGrading';
import { ResponseBuilder } from '../utils/responseBuilder';

const TABLE_KEYS = ['bdBoardTable', 'publicUniTable', 'privateUniTable', 'oaTable'] as const;
type TableKey = (typeof TABLE_KEYS)[number];

/**
 * Validates a single grade row: marks must be within range and ordered,
 * and the point must be non-negative.
 */
function isValidRow(row: Partial<IGradeRow>): row is IGradeRow {
    const { minMark, maxMark, grade, point } = row;
    return (
        typeof minMark === 'number' &&
        typeof maxMark === 'number' &&
        typeof grade === 'string' &&
        grade.trim().length > 0 &&
        typeof point === 'number' &&
        minMark >= 0 &&
        maxMark <= 100 &&
        minMark < maxMark &&
        point >= 0
    );
}

/**
 * Validates a full table: every row valid + no overlapping mark ranges.
 * Gaps between ranges are permitted (a mark in a gap simply yields no grade),
 * but overlapping ranges would produce ambiguous results and are rejected.
 */
function isValidTable(rows: unknown): rows is IGradeRow[] {
    if (!Array.isArray(rows) || rows.length === 0) return false;
    if (!rows.every(isValidRow)) return false;
    const sorted = [...(rows as IGradeRow[])].sort((a, b) => a.minMark - b.minMark);
    for (let i = 1; i < sorted.length; i++) {
        // Overlap check: this row must start strictly after the previous ends.
        if (sorted[i].minMark <= sorted[i - 1].maxMark) return false;
    }
    return true;
}

/**
 * @desc    Get calculator grading tables (Public)
 * @route   GET /api/v1/calculators/grading
 * @access  Public
 */
export const getGrading = async (req: Request, res: Response) => {
    try {
        const grading = await CalculatorGrading.getSingleton();
        ResponseBuilder.send(res, 200, ResponseBuilder.success(grading, 'Grading tables retrieved'));
    } catch (error: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('INTERNAL_ERROR', error.message));
    }
};

/**
 * @desc    Update calculator grading tables
 * @route   PUT /api/v1/calculators/grading
 * @access  Private/Admin (site_settings:edit)
 */
export const updateGrading = async (req: Request, res: Response) => {
    try {
        const grading = await CalculatorGrading.getSingleton();

        for (const key of TABLE_KEYS) {
            const incoming = req.body?.[key];
            if (incoming === undefined) continue;
            if (!isValidTable(incoming)) {
                ResponseBuilder.send(
                    res,
                    400,
                    ResponseBuilder.error(
                        'INVALID_GRADING',
                        `Invalid grade table '${key}': each row needs valid min<max marks (0-100), a non-empty grade, point >= 0, and ranges must not overlap.`
                    )
                );
                return;
            }
            // Sub-doc arrays expose .set() on the Mongoose array type, which
            // also marks the path modified — re-cast to access it safely.
            (grading[key] as unknown as { set(v: IGradeRow[]): void }).set(incoming as IGradeRow[]);
        }

        await grading.save();
        ResponseBuilder.send(res, 200, ResponseBuilder.success(grading, 'Grading tables updated successfully'));
    } catch (error: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('INTERNAL_ERROR', error.message));
    }
};

/** Re-export the validated keys for route wiring / typing consumers. */
export { TABLE_KEYS, isValidTable };
export type { TableKey };
