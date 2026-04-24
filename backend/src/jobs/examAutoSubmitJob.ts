import cron from "node-cron";
import ExamSession from "../models/ExamSession";
import { submitSession } from "../services/examSessionService";

export const startExamAutoSubmitJob = () => {
  cron.schedule("*/1 * * * *", async () => {
    const now = new Date();
    const sessions = await ExamSession.find({ status: "in_progress", expiresAtUTC: { $lt: now } }).limit(100);
    for (const session of sessions) {
      const examId = String((session as any).examId || session.exam);
      const userId = String((session as any).userId || session.student);
      await submitSession(examId, String(session._id), userId);
      session.status = "submitted";
      await session.save();
    }
  });
};
