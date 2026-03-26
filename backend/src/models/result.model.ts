import { Schema, model } from "mongoose";

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
