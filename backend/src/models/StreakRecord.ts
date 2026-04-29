import mongoose, { Document, Schema } from 'mongoose';

export interface IStreakCalendarEntry {
    date: string;
    active: boolean;
}

export interface IStreakRecord extends Document {
    student: mongoose.Types.ObjectId;
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date;
    streakCalendar: IStreakCalendarEntry[];
    createdAt: Date;
    updatedAt: Date;
}

const StreakCalendarEntrySchema = new Schema<IStreakCalendarEntry>(
    {
        date: { type: String, required: true },
        active: { type: Boolean, required: true, default: false },
    },
    { _id: false },
);

const StreakRecordSchema = new Schema<IStreakRecord>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        currentStreak: { type: Number, required: true, default: 0 },
        longestStreak: { type: Number, required: true, default: 0 },
        lastActivityDate: { type: Date, default: null },
        streakCalendar: { type: [StreakCalendarEntrySchema], default: [] },
    },
    { timestamps: true, collection: 'streak_records' },
);

// Fast lookups by student (unique already creates an index)
// Additional index for querying active streaks
StreakRecordSchema.index({ lastActivityDate: -1 });

export default mongoose.model<IStreakRecord>('StreakRecord', StreakRecordSchema);
