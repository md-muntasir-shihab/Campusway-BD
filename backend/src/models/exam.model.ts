import { Schema, model } from "mongoose";

const examSchema = new Schema(
  {
    title: { type: String, required: true },
    title_bn: String,
    description: String,
    examCategory: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    bannerImageUrl: String,
    type: { type: String, enum: ["internal_mcq", "external_link"], default: "internal_mcq" },
    externalExamUrl: String,
    subscriptionRequired: { type: Boolean, default: false },
    paymentRequired: { type: Boolean, default: false },
    priceBDT: { type: Number, default: null },
    examWindowStartUTC: { type: Date, required: true },
    examWindowEndUTC: { type: Date, required: true },
    durationMinutes: { type: Number, required: true },
    resultPublishAtUTC: { type: Date, required: true },
    solutionReleaseRule: { type: String, enum: ["after_exam_end", "after_result_publish", "manual"], default: "after_result_publish" },
    solutionsEnabled: { type: Boolean, default: false },
    totalMarks: Number,
    negativeMarkingEnabled: { type: Boolean, default: false },
    negativePerWrong: { type: Number, default: 0 },
    answerChangeLimit: { type: Number, default: null },
    randomizeQuestions: { type: Boolean, default: false },
    randomizeOptions: { type: Boolean, default: false },
    allowBackNavigation: { type: Boolean, default: true },
    showQuestionPalette: { type: Boolean, default: true },
    showTimer: { type: Boolean, default: true },
    autoSubmitOnTimeout: { type: Boolean, default: true },
    attemptLimit: { type: Number, default: 1 },
    allowReAttempt: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdByAdminId: String
  },
  { timestamps: true }
);
examSchema.index({ examWindowStartUTC: 1, examWindowEndUTC: 1, examCategory: 1 });

export const ExamModel = model("exams", examSchema);
