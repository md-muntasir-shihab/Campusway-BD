import { Schema, model } from "mongoose";

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
