/**
 * Study Routine Service
 *
 * Manages per-student weekly study schedules, exam countdowns, and adherence tracking.
 *
 * Key functions:
 *   - getRoutine: Returns the student's study routine (or creates a default one)
 *   - updateRoutine: Updates weekly schedule and exam countdowns
 *   - toggleItemCompletion: Toggles a schedule item's completed status
 *   - computeAdherence: Pure function — calculates adherence = (completed / planned) × 100
 *   - addExamCountdown: Adds an exam countdown entry
 *   - removeExamCountdown: Removes an exam countdown by index
 *
 * Requirements: 25.1, 25.2, 25.3, 25.5, 25.6
 */
import mongoose from 'mongoose';
import StudyRoutine, {
    type IStudyRoutine,
    type IWeeklyScheduleEntry,
    type IExamCountdown,
} from '../models/StudyRoutine';

// ─── Exported Types ─────────────────────────────────────────

/** Data shape accepted by updateRoutine */
export interface UpdateRoutineData {
    weeklySchedule?: IWeeklyScheduleEntry[];
    examCountdowns?: IExamCountdown[];
}

// ─── Pure Helper ────────────────────────────────────────────

/**
 * Pure function: compute routine adherence percentage.
 *
 * adherence = (completed / planned) × 100, rounded to the nearest integer.
 * If there are no planned items, adherence is 0.
 *
 * Requirement 25.6
 */
export function computeAdherence(weeklySchedule: IWeeklyScheduleEntry[]): number {
    let planned = 0;
    let completed = 0;

    for (const dayEntry of weeklySchedule) {
        for (const item of dayEntry.items) {
            planned += 1;
            if (item.completed) {
                completed += 1;
            }
        }
    }

    if (planned === 0) {
        return 0;
    }

    return Math.round((completed / planned) * 100);
}

// ─── Helpers ────────────────────────────────────────────────

function toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
}

// ─── getRoutine ─────────────────────────────────────────────

/**
 * Retrieve the student's study routine. If none exists, create a default
 * empty routine and return it.
 *
 * Requirement 25.1, 25.5
 */
export async function getRoutine(studentId: string): Promise<IStudyRoutine> {
    const studentObjectId = toObjectId(studentId);

    let routine = await StudyRoutine.findOne({ student: studentObjectId });

    if (!routine) {
        routine = await StudyRoutine.create({
            student: studentObjectId,
            weeklySchedule: [],
            examCountdowns: [],
            adherencePercentage: 0,
        });
    }

    return routine;
}

// ─── updateRoutine ──────────────────────────────────────────

/**
 * Update the student's weekly schedule and/or exam countdowns.
 * Recomputes adherence percentage after the update.
 *
 * Requirement 25.1, 25.2, 25.3
 */
export async function updateRoutine(
    studentId: string,
    data: UpdateRoutineData,
): Promise<IStudyRoutine> {
    const routine = await getRoutine(studentId);

    if (data.weeklySchedule !== undefined) {
        routine.weeklySchedule = data.weeklySchedule;
    }

    if (data.examCountdowns !== undefined) {
        routine.examCountdowns = data.examCountdowns;
    }

    // Recompute adherence from the (possibly updated) schedule
    routine.adherencePercentage = computeAdherence(routine.weeklySchedule);

    await routine.save();
    return routine;
}

// ─── toggleItemCompletion ───────────────────────────────────

/**
 * Toggle the `completed` flag of a specific schedule item identified by
 * day name and item index. Recomputes adherence after toggling.
 *
 * Throws if the day or item index is not found.
 *
 * Requirement 25.5, 25.6
 */
export async function toggleItemCompletion(
    studentId: string,
    day: string,
    itemIndex: number,
): Promise<IStudyRoutine> {
    const routine = await getRoutine(studentId);

    const dayEntry = routine.weeklySchedule.find((entry) => entry.day === day);
    if (!dayEntry) {
        throw new Error(`No schedule entry found for day: ${day}`);
    }

    if (itemIndex < 0 || itemIndex >= dayEntry.items.length) {
        throw new Error(
            `Item index ${itemIndex} out of range for ${day} (has ${dayEntry.items.length} items)`,
        );
    }

    dayEntry.items[itemIndex].completed = !dayEntry.items[itemIndex].completed;

    // Recompute adherence
    routine.adherencePercentage = computeAdherence(routine.weeklySchedule);

    // Mark the nested array as modified so Mongoose persists the change
    routine.markModified('weeklySchedule');
    await routine.save();

    return routine;
}

// ─── addExamCountdown ───────────────────────────────────────

/**
 * Add an exam countdown entry to the student's routine.
 *
 * Requirement 25.3
 */
export async function addExamCountdown(
    studentId: string,
    examTitle: string,
    examDate: Date,
): Promise<IStudyRoutine> {
    const routine = await getRoutine(studentId);

    routine.examCountdowns.push({ examTitle, examDate });

    await routine.save();
    return routine;
}

// ─── removeExamCountdown ────────────────────────────────────

/**
 * Remove an exam countdown entry by its index.
 *
 * Throws if the index is out of range.
 *
 * Requirement 25.3
 */
export async function removeExamCountdown(
    studentId: string,
    index: number,
): Promise<IStudyRoutine> {
    const routine = await getRoutine(studentId);

    if (index < 0 || index >= routine.examCountdowns.length) {
        throw new Error(
            `Countdown index ${index} out of range (has ${routine.examCountdowns.length} entries)`,
        );
    }

    routine.examCountdowns.splice(index, 1);

    // Mark the nested array as modified so Mongoose persists the change
    routine.markModified('examCountdowns');
    await routine.save();

    return routine;
}
