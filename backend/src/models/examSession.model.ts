import { Schema, model } from "mongoose";

const examSessionSchema = new Schema(
  {
    examId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    attemptNo: { type: Number, required: true },
    status: { type: String, enum: ["in_progress", "submitted", "expired", "evaluated"], default: "in_progress", index: true },
    startedAtUTC: Date,
    expiresAtUTC: Date,
    submittedAtUTC: Date,
    timeTakenSeconds: Number,
    lastSavedAtUTC: Date,
    ip: String,
    deviceInfo: String,
    browserInfo: String,
    tabSwitchCount: { type: Number, default: 0 },
    fullscreenExitCount: { type: Number, default: 0 },
    suspiciousFlags: [String],
    questionOrder: [String],
    optionOrderMap: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);
examSessionSchema.index({ expiresAtUTC: 1, status: 1 });

export const ExamSessionModel = model("exam_sessions", examSessionSchema);
