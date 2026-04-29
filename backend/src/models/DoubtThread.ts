import mongoose, { Document, Schema } from 'mongoose';

export interface IReplyVoter {
    userId: mongoose.Types.ObjectId;
    vote: 'up' | 'down';
}

export interface IDoubtReply {
    author: mongoose.Types.ObjectId;
    content: string;
    upvotes: number;
    downvotes: number;
    voters: IReplyVoter[];
    isPinned: boolean;
    createdAt: Date;
}

export interface IDoubtThread extends Document {
    question: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
    aiExplanation?: string;
    status: 'open' | 'resolved';
    replies: IDoubtReply[];
    replyCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const ReplyVoterSchema = new Schema<IReplyVoter>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        vote: { type: String, enum: ['up', 'down'], required: true },
    },
    { _id: false },
);

const DoubtReplySchema = new Schema<IDoubtReply>(
    {
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        content: { type: String, required: true, trim: true },
        upvotes: { type: Number, default: 0 },
        downvotes: { type: Number, default: 0 },
        voters: { type: [ReplyVoterSchema], default: [] },
        isPinned: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
    },
    { _id: true },
);

const DoubtThreadSchema = new Schema<IDoubtThread>(
    {
        question: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionBankQuestion',
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        aiExplanation: { type: String, default: undefined },
        status: {
            type: String,
            enum: ['open', 'resolved'],
            default: 'open',
        },
        replies: { type: [DoubtReplySchema], default: [] },
        replyCount: { type: Number, default: 0 },
    },
    { timestamps: true, collection: 'doubt_threads' },
);

// Fast lookup of doubt threads by question, newest first
DoubtThreadSchema.index({ question: 1, createdAt: -1 });
// Fast lookup of doubt threads created by a specific user
DoubtThreadSchema.index({ createdBy: 1 });

export default mongoose.model<IDoubtThread>('DoubtThread', DoubtThreadSchema);
