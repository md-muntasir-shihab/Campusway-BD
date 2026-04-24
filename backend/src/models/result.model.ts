import { Schema, model } from "mongoose";

/**
 * Result model — stores evaluated exam results with scoring and ranking data.
 *
 * Key fields:
 * - `sessionId`: The exam session this result was computed from (unique)
 * - `examId`: The exam that was taken
 * - `userId`: The student who took the exam
 * - `obtainedMarks` / `totalMarks`: Score breakdown
 * - `correctCount`, `wrongCount`, `skippedCount`: Answer statistics
 * - `percentage`, `rank`: Computed performance metrics
 *
 * @collection results
 */
const resultSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    examId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    totalMarks: Number,
    obtainedMarks: Number,
    correctCount: Number,
    wrongCount: Number,
    skippedCount: Number,
    percentage: Number,
    rank: Number,
    evaluatedAtUTC: Date,
    timeTakenSeconds: Number
  },
  { timestamps: false }
);
resultSchema.index({ examId: 1, obtainedMarks: -1 });

export const ResultModel = model("results", resultSchema);
