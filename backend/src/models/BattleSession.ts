import mongoose, { Document, Schema } from 'mongoose';

export interface IBattleAnswer {
    questionId: mongoose.Types.ObjectId;
    answer: string;
    isCorrect: boolean;
    answeredAt: Date;
}

export interface IBattleReward {
    challenger: number;
    opponent: number;
}

export interface IBattleSession extends Document {
    challenger: mongoose.Types.ObjectId;
    opponent: mongoose.Types.ObjectId;
    topic?: mongoose.Types.ObjectId;
    subject?: string;
    questions: mongoose.Types.ObjectId[];
    status: 'pending' | 'active' | 'completed' | 'declined' | 'expired';
    duration: number;
    challengerAnswers: IBattleAnswer[];
    opponentAnswers: IBattleAnswer[];
    challengerScore: number;
    opponentScore: number;
    winner?: mongoose.Types.ObjectId;
    result: 'challenger_win' | 'opponent_win' | 'draw' | 'pending';
    xpAwarded: IBattleReward;
    coinsAwarded: IBattleReward;
    startedAt?: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const BattleAnswerSchema = new Schema<IBattleAnswer>(
    {
        questionId: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionBankQuestion',
            required: true,
        },
        answer: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        answeredAt: { type: Date, required: true },
    },
    { _id: false },
);

const BattleRewardSchema = new Schema<IBattleReward>(
    {
        challenger: { type: Number, default: 0 },
        opponent: { type: Number, default: 0 },
    },
    { _id: false },
);

const BattleSessionSchema = new Schema<IBattleSession>(
    {
        challenger: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        opponent: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        topic: {
            type: Schema.Types.ObjectId,
            ref: 'QuestionTopic',
            default: null,
        },
        subject: { type: String, default: null },
        questions: [
            {
                type: Schema.Types.ObjectId,
                ref: 'QuestionBankQuestion',
            },
        ],
        status: {
            type: String,
            enum: ['pending', 'active', 'completed', 'declined', 'expired'],
            default: 'pending',
        },
        duration: { type: Number, default: 300 },
        challengerAnswers: { type: [BattleAnswerSchema], default: [] },
        opponentAnswers: { type: [BattleAnswerSchema], default: [] },
        challengerScore: { type: Number, default: 0 },
        opponentScore: { type: Number, default: 0 },
        winner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        result: {
            type: String,
            enum: ['challenger_win', 'opponent_win', 'draw', 'pending'],
            default: 'pending',
        },
        xpAwarded: { type: BattleRewardSchema, default: () => ({ challenger: 0, opponent: 0 }) },
        coinsAwarded: { type: BattleRewardSchema, default: () => ({ challenger: 0, opponent: 0 }) },
        startedAt: { type: Date, default: null },
        completedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'battle_sessions' },
);

// Fast lookup of battles by challenger
BattleSessionSchema.index({ challenger: 1, createdAt: -1 });
// Fast lookup of battles by opponent
BattleSessionSchema.index({ opponent: 1, createdAt: -1 });
// Filter by status (e.g., find pending/active battles)
BattleSessionSchema.index({ status: 1 });

export default mongoose.model<IBattleSession>('BattleSession', BattleSessionSchema);
