import mongoose, { Document, Schema } from 'mongoose';

export interface ITopicMastery extends Document {
    student: mongoose.Types.ObjectId;
    topic: mongoose.Types.ObjectId;
    subject?: string;
    masteryLevel: 'beginner' | 'intermediate' | 'advanced' | 'mastered';
    totalAttempts: number;
    correctCount: number;
    lastScore: number;
    lastPracticeDate: Date;
    createdAt: Date;
    updatedAt: Date;
}

const TopicMasterySchema = new Schema<ITopicMastery>(
    {
        student: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        topic: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionTopic',
            required: true,
        },
        subject: { type: String, default: '' },
        masteryLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'mastered'],
            required: true,
            default: 'beginner',
        },
        totalAttempts: { type: Number, required: true, default: 0 },
        correctCount: { type: Number, required: true, default: 0 },
        lastScore: { type: Number, required: true, default: 0 },
        lastPracticeDate: { type: Date, required: true, default: Date.now },
    },
    { timestamps: true, collection: 'topic_mastery' },
);

// One mastery record per student per topic
TopicMasterySchema.index({ student: 1, topic: 1 }, { unique: true });
// Fast lookups by mastery level for a student
TopicMasterySchema.index({ student: 1, masteryLevel: 1 });

export default mongoose.model<ITopicMastery>('TopicMastery', TopicMasterySchema);
