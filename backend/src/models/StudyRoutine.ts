import mongoose, { Document, Schema } from 'mongoose';

export interface IScheduleItem {
    subject: string;
    topic?: string;
    goal: string;
    completed: boolean;
}

export interface IWeeklyScheduleEntry {
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    items: IScheduleItem[];
}

export interface IExamCountdown {
    examTitle: string;
    examDate: Date;
}

export interface IStudyRoutine extends Document {
    student: mongoose.Types.ObjectId;
    weeklySchedule: IWeeklyScheduleEntry[];
    examCountdowns: IExamCountdown[];
    adherencePercentage: number;
    createdAt: Date;
    updatedAt: Date;
}

const ScheduleItemSchema = new Schema<IScheduleItem>(
    {
        subject: { type: String, required: true, trim: true },
        topic: { type: String, trim: true, default: undefined },
        goal: { type: String, required: true, trim: true },
        completed: { type: Boolean, required: true, default: false },
    },
    { _id: false },
);

const WeeklyScheduleEntrySchema = new Schema<IWeeklyScheduleEntry>(
    {
        day: {
            type: String,
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            required: true,
        },
        items: { type: [ScheduleItemSchema], default: [] },
    },
    { _id: false },
);

const ExamCountdownSchema = new Schema<IExamCountdown>(
    {
        examTitle: { type: String, required: true, trim: true },
        examDate: { type: Date, required: true },
    },
    { _id: false },
);

const StudyRoutineSchema = new Schema<IStudyRoutine>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        weeklySchedule: { type: [WeeklyScheduleEntrySchema], default: [] },
        examCountdowns: { type: [ExamCountdownSchema], default: [] },
        adherencePercentage: { type: Number, required: true, default: 0, min: 0, max: 100 },
    },
    { timestamps: true, collection: 'study_routines' },
);

export default mongoose.model<IStudyRoutine>('StudyRoutine', StudyRoutineSchema);
