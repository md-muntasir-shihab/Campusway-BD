import cron from "node-cron";
import { ExamSessionModel } from "../models/examSession.model";
import { submitSession } from "../services/examSessionService";

export const startExamAutoSubmitJob = () => {
  cron.schedule("*/1 * * * *", async () => {
    const now = new Date();
    const sessions = await ExamSessionModel.find({ status: "in_progress", expiresAtUTC: { $lt: now } }).limit(100);
    for (const session of sessions) {
      await submitSession(session.examId, String(session._id), session.userId);
      session.status = "submitted";
      await session.save();
    }
  });
};
