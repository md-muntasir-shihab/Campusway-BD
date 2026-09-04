import StudentDashboardConfig from '../models/StudentDashboardConfig';
import { getSecurityConfig } from './securityConfigService';

/**
 * Single source of truth for the profile-completion gate (fix C-2).
 *
 * Both `examController.startExam` and the student hub used to resolve this
 * independently and with DIFFERENT fallbacks — the hub hardcoded 70 while the
 * exam controller falls back to `StudentDashboardConfig.profileCompletionThreshold`.
 * Setting that config to e.g. 60 made the hub and the exam gate disagree,
 * producing a confusing "eligible for exams but startExam 403"s.
 *
 * Resolution order (consistent everywhere):
 *   1. Security config `profileScoreThreshold` when profile-score gating is on.
 *   2. `StudentDashboardConfig.profileCompletionThreshold`.
 *   3. 70 (default).
 */
export async function getProfileCompletionThreshold(): Promise<number> {
    const security = await getSecurityConfig(true);
    if (security.examProtection.requireProfileScoreForExam) {
        return Number(security.examProtection.profileScoreThreshold || 70);
    }
    const config = await StudentDashboardConfig.findOne().select('profileCompletionThreshold').lean();
    return Number(config?.profileCompletionThreshold || 70);
}
