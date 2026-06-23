import mongoose, { Schema, Document } from 'mongoose';

export interface ITopicDifficulty extends Document {
    student: mongoose.Types.ObjectId;
    topic: mongoose.Types.ObjectId;
    /** Elo-like rating — starts at 1200, adjusts per answer */
    rating: number;
    /** Total questions answered for this topic */
    totalAnswered: number;
    /** Correct answers for this topic */
    correctCount: number;
    /** Rolling accuracy (0–1) */
    accuracy: number;
    /** Computed difficulty label */
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    lastUpdated: Date;
}

const TopicDifficultySchema = new Schema<ITopicDifficulty>(
    {
        student: { type: Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
        topic: { type: Schema.Types.ObjectId, ref: 'Topic', required: true, index: true },
        rating: { type: Number, default: 1200 },
        totalAnswered: { type: Number, default: 0 },
        correctCount: { type: Number, default: 0 },
        accuracy: { type: Number, default: 0 },
        difficultyLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            default: 'beginner',
        },
        lastUpdated: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

TopicDifficultySchema.index({ student: 1, topic: 1 }, { unique: true });

export default mongoose.model<ITopicDifficulty>('TopicDifficulty', TopicDifficultySchema);
