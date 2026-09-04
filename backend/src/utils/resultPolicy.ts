/**
 * Pure result/certificate policy helpers (fixes C-6 and C-7).
 *
 * Extracted from examController so they can be unit-tested without a DB and
 * reused consistently. Both are deterministic functions of their inputs.
 */

export type ResultPublishMode = 'immediate' | 'manual' | 'scheduled';

export function getResultPublishMode(exam: Record<string, unknown>): ResultPublishMode {
    const mode = String(exam.resultPublishMode || '').trim().toLowerCase();
    if (mode === 'immediate' || mode === 'manual' || mode === 'scheduled') {
        return mode;
    }
    return 'scheduled';
}

/**
 * Whether exam results are published as of `now`.
 *
 * Fix C-6: a 'scheduled' exam with no valid `resultPublishDate` previously
 * returned false forever (results never published, students stuck). We now
 * fall back to the exam window's `endDate` (the same default adminExamController
 * applies on create) so such exams auto-publish once the window closes.
 */
export function isExamResultPublished(exam: Record<string, unknown>, now = new Date()): boolean {
    const mode = getResultPublishMode(exam);
    if (mode === 'immediate') return true;

    const publishDateRaw = exam.resultPublishDate
        || (mode === 'scheduled' ? exam.endDate : undefined);
    const publishDate = publishDateRaw ? new Date(String(publishDateRaw)) : null;
    if (!publishDate || Number.isNaN(publishDate.getTime())) return false;
    return now >= publishDate;
}

export interface CertificateEligibilityResult {
    eligible: boolean;
    reasons: string[];
    minPercentage: number;
    passThreshold: number;
}

/**
 * Certificate eligibility for a single result.
 *
 * Fix C-7: `Exam` has no `passMarks`/`pass_marks`, so passThreshold used to
 * always equal minPercentage and the `passOnly` rule was dead. We now read the
 * real top-level `passPercentage` (the same field examManagementController and
 * examPdfController use for pass/fail), falling back to minPercentage when unset,
 * so the pass-only rule actually gates the certificate.
 */
export function certificateEligibility(
    exam: Record<string, unknown>,
    result: Record<string, unknown>,
    resultPublished: boolean,
): CertificateEligibilityResult {
    const settings = ((exam.certificateSettings as Record<string, unknown> | undefined) || {});
    const enabled = Boolean(settings.enabled);
    const minPercentageRaw = Number(settings.minPercentage ?? 40);
    const minPercentage = Number.isFinite(minPercentageRaw) ? minPercentageRaw : 40;
    const passOnly = settings.passOnly === undefined ? true : Boolean(settings.passOnly);
    const passThresholdRaw = Number((exam.passPercentage as number | undefined) ?? minPercentage);
    const passThreshold = Number.isFinite(passThresholdRaw) ? passThresholdRaw : minPercentage;
    const percentage = Number(result.percentage || 0);

    const reasons: string[] = [];
    if (!enabled) reasons.push('certificate_disabled');
    if (!resultPublished) reasons.push('result_not_published');
    if (percentage < minPercentage) reasons.push('minimum_percentage_not_met');
    if (passOnly && percentage < passThreshold) reasons.push('pass_criteria_not_met');

    return {
        eligible: reasons.length === 0,
        reasons,
        minPercentage,
        passThreshold,
    };
}
