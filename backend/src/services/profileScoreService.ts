import mongoose from 'mongoose';
import StudentProfile, { IStudentProfile } from '../models/StudentProfile';

// ---------------------------------------------------------------------------
// Weight table (total = 100)
// ---------------------------------------------------------------------------

const WEIGHTS: Array<{ field: string; label: string; weight: number }> = [
    { field: 'full_name',        label: 'Full name',        weight: 10 },
    { field: 'phone',            label: 'Phone',            weight: 10 },
    { field: 'email',            label: 'Email',            weight: 10 },
    { field: 'dob',              label: 'Date of birth',    weight: 5  },
    { field: 'department',       label: 'Department',       weight: 5  },
    { field: 'ssc_batch',        label: 'SSC batch',        weight: 5  },
    { field: 'hsc_batch',        label: 'HSC batch',        weight: 5  },
    { field: 'college_name',     label: 'College name',     weight: 10 },
    { field: 'college_address',  label: 'College address',  weight: 5  },
    { field: 'present_address',  label: 'Present address',  weight: 5  },
    { field: 'guardian_phone',   label: 'Guardian phone',   weight: 5  },
    { field: 'profile_photo_url',label: 'Profile photo',    weight: 5  },
    { field: 'gender',           label: 'Gender',           weight: 5  },
    { field: 'district',         label: 'District',         weight: 5  },
    { field: 'roll_number',      label: 'Roll number',      weight: 5  },
];

function hasValue(v: unknown): boolean {
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.trim().length > 0;
    if (v instanceof Date) return Number.isFinite(v.getTime());
    return true;
}

// ---------------------------------------------------------------------------
// Core computation
// ---------------------------------------------------------------------------

export interface ProfileScoreResult {
    score: number;
    missingFields: string[];
}

/**
 * Compute a 0-100 profile completeness score from a StudentProfile document.
 * Uses aliased field checks so that both field name variants are accepted.
 */
export function computeProfileScore(profile: Partial<IStudentProfile>): ProfileScoreResult {
    const p = (profile ?? {}) as Record<string, unknown>;
    const missingFields: string[] = [];
    let score = 0;

    for (const rule of WEIGHTS) {
        let present = hasValue(p[rule.field]);

        // Aliased field checks
        if (!present && rule.field === 'phone') {
            present = hasValue(p['phone_number']);
        }
        if (!present && rule.field === 'college_name') {
            present = hasValue(p['institution_name']);
        }

        if (present) {
            score += rule.weight;
        } else {
            missingFields.push(rule.label);
        }
    }

    return { score: Math.min(100, score), missingFields };
}

// ---------------------------------------------------------------------------
// Persistence helper
// ---------------------------------------------------------------------------

/**
 * Load the student's StudentProfile, compute the profile score, and persist
 * profile_completion_percentage back to MongoDB.
 * Also stores the missingFields list in profile.meta.missingFields.
 */
export async function updateStudentProfileScore(
    userId: mongoose.Types.ObjectId | string,
): Promise<void> {
    const userOid =
        typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

    const profileDoc = await StudentProfile.findOne({ user_id: userOid });
    if (!profileDoc) return;

    const { score, missingFields } = computeProfileScore(profileDoc.toObject());

    profileDoc.profile_completion_percentage = score;

    const profileDocAny = profileDoc as unknown as Record<string, unknown>;
    const existingMeta = (profileDocAny['meta'] ?? {}) as Record<string, unknown>;
    profileDocAny['meta'] = {
        ...existingMeta,
        missingFields,
        profileScoreUpdatedAt: new Date(),
    };

    await profileDoc.save();
}
