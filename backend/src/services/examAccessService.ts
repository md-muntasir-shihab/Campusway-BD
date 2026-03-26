import mongoose from 'mongoose';
import { ExamSessionModel } from "../models/examSession.model";
import { PaymentModel } from "../models/payment.model";
import UserSubscription from '../models/UserSubscription';
import { UserModel } from "../models/user.model";
import StudentProfile from "../models/StudentProfile";

export const buildAccessPayload = async (exam: any, userId?: string) => {
  const blockReasons: string[] = [];
  if (!userId) blockReasons.push("LOGIN_REQUIRED");

  const now = new Date();
  if (now < new Date(exam.examWindowStartUTC) || now > new Date(exam.examWindowEndUTC)) blockReasons.push("EXAM_NOT_IN_WINDOW");

  let user: any = null;
  if (userId) {
    user = await UserModel.findOne({ userId });
    if (!user || (user.profileScore ?? 0) < 70) blockReasons.push("PROFILE_BELOW_70");
  }

  // Group-based visibility check
  const visibilityMode = exam.visibilityMode || 'all_students';
  if (userId && (visibilityMode === 'group_only' || visibilityMode === 'custom')) {
    const targetGroupIds = Array.isArray(exam.targetGroupIds) ? exam.targetGroupIds.map(String) : [];
    if (targetGroupIds.length > 0) {
      const profile = await StudentProfile.findOne({ user_id: userId }).select('groupIds').lean();
      const studentGroupIds = Array.isArray(profile?.groupIds) ? profile!.groupIds.map(String) : [];
      const hasGroupAccess = targetGroupIds.some((gId: string) => studentGroupIds.includes(gId));
      if (!hasGroupAccess) blockReasons.push("GROUP_RESTRICTED");
    }
  }

  if (userId && (exam.subscriptionRequired || exam.requiresActiveSubscription)) {
    const active = mongoose.Types.ObjectId.isValid(userId)
      ? await UserSubscription.findOne({
          userId: new mongoose.Types.ObjectId(userId),
          status: 'active',
          expiresAtUTC: { $gt: now },
        }).lean()
      : null;
    if (!active) blockReasons.push("SUBSCRIPTION_REQUIRED");
  }

  if (userId && (exam.paymentRequired || exam.requiresPayment)) {
    const paid = await PaymentModel.findOne({ userId, examId: String(exam._id), status: "paid" });
    if (!paid) blockReasons.push("PAYMENT_PENDING");
  }

  // Custom minimum profile score from exam settings
  if (userId && exam.minimumProfileScore && user) {
    const profileScore = Number(user.profileScore ?? 0);
    if (profileScore < Number(exam.minimumProfileScore)) blockReasons.push("PROFILE_SCORE_TOO_LOW");
  }

  if (userId) {
    const attempts = await ExamSessionModel.countDocuments({ examId: String(exam._id), userId, status: { $in: ["submitted", "evaluated", "expired"] } });
    if (attempts >= exam.attemptLimit && !exam.allowReAttempt) blockReasons.push("ATTEMPT_LIMIT_REACHED");
  }

  return {
    loginRequired: true as const,
    profileScoreMin: exam.minimumProfileScore || 70,
    subscriptionRequired: exam.subscriptionRequired || exam.requiresActiveSubscription,
    paymentRequired: exam.paymentRequired || exam.requiresPayment,
    priceBDT: exam.priceBDT ?? undefined,
    visibilityMode,
    accessStatus: blockReasons.length ? "blocked" : "allowed",
    blockReasons
  };
};
