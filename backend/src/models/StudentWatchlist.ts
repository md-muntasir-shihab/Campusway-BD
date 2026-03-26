import mongoose, { Document, Schema } from 'mongoose';

export interface IStudentWatchlist extends Document {
    studentId: mongoose.Types.ObjectId;
    itemType: 'university' | 'resource' | 'exam' | 'news';
    itemId: mongoose.Types.ObjectId;
    createdAt: Date;
}

const StudentWatchlistSchema = new Schema<IStudentWatchlist>(
    {
        studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        itemType: { type: String, enum: ['university', 'resource', 'exam', 'news'], required: true },
        itemId: { type: Schema.Types.ObjectId, required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: 'student_watchlists' },
);

StudentWatchlistSchema.index({ studentId: 1, itemType: 1, itemId: 1 }, { unique: true });
StudentWatchlistSchema.index({ studentId: 1, itemType: 1, createdAt: -1 });

export default mongoose.model<IStudentWatchlist>('StudentWatchlist', StudentWatchlistSchema);
