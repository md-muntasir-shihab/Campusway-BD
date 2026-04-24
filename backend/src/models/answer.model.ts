import { Schema, model } from "mongoose";

/**
 * Answer model — stores individual question responses submitted during an exam session.
 *
 * Key fields:
 * - `sessionId`: The exam session this answer belongs to
 * - `examId`: The exam being taken
 * - `userId`: The student who submitted the answer
 * - `questionId`: The question being answered
 * - `selectedKey`: The chosen option (A–D) or null if skipped
 * - `changeCount`: Number of times the student changed their answer
 *
 * @collection answers
 */
const answerSchema = new Schema(
  {
    sessionId: { type: String, required: true, index: true },
    examId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    questionId: { type: String, required: true },
    selectedKey: { type: String, enum: ["A", "B", "C", "D", null], default: null },
    changeCount: { type: Number, default: 0 },
    updatedAtUTC: { type: Date, default: Date.now }
  },
  { timestamps: false }
);
answerSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

export const AnswerModel = model("answers", answerSchema);
