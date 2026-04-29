import StudentProfile from '../models/StudentProfile';

/**
 * Returns YYYY-MM-DD in Asia/Dhaka regardless of server TZ.
 * CampusWay treats Bangladesh local day boundaries as the streak day.
 */
function getDhakaDateKey(date: Date): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(date);
}

function diffInDhakaDays(a: Date, b: Date): number {
    const aKey = getDhakaDateKey(a);
    const bKey = getDhakaDateKey(b);
    const aDate = new Date(`${aKey}T00:00:00+06:00`);
    const bDate = new Date(`${bKey}T00:00:00+06:00`);
    const ms = bDate.getTime() - aDate.getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
}

export interface StreakUpdateResult {
    streak_current: number;
    streak_longest: number;
    streak_last_activity_date: Date;
    incrementedToday: boolean;
}

/**
 * Records a daily activity for a student and updates streak counters.
 *
 * Rules:
 *   - If last activity was today (Dhaka TZ): no change.
 *   - If last activity was yesterday: increment current streak by 1.
 *   - If last activity was 2+ days ago: reset current streak to 1.
 *   - If no prior activity: set current streak to 1.
 *   - longest streak is updated whenever current exceeds it.
 */
export async function recordStudentActivity(userId: string): Promise<StreakUpdateResult | null> {
    const profile = await StudentProfile.findOne({ user_id: userId });
    if (!profile) return null;

    const now = new Date();
    const last = profile.streak_last_activity_date ?? null;

    let current = profile.streak_current ?? 0;
    let longest = profile.streak_longest ?? 0;
    let incrementedToday = false;

    if (!last) {
        current = 1;
        incrementedToday = true;
    } else {
        const days = diffInDhakaDays(last, now);
        if (days <= 0) {
            // Same Dhaka day — no change to streak counter
            incrementedToday = false;
        } else if (days === 1) {
            current = (current || 0) + 1;
            incrementedToday = true;
        } else {
            current = 1;
            incrementedToday = true;
        }
    }

    if (current > longest) longest = current;

    profile.streak_current = current;
    profile.streak_longest = longest;
    profile.streak_last_activity_date = now;
    profile.last_practice_at = now;

    // Reset daily counter at Dhaka midnight rollover
    if (last && diffInDhakaDays(last, now) >= 1) {
        profile.daily_practice_count_today = 0;
    }

    await profile.save();

    return {
        streak_current: current,
        streak_longest: longest,
        streak_last_activity_date: now,
        incrementedToday,
    };
}

export async function incrementDailyPracticeCount(userId: string, by = 1): Promise<void> {
    await StudentProfile.updateOne(
        { user_id: userId },
        { $inc: { daily_practice_count_today: by }, $set: { last_practice_at: new Date() } },
    );
}
