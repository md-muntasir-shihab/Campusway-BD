import cron from "node-cron";
import { ExamSessionModel } from "../models/examSession.model";
import { submitSession } from "../services/examSessionService";

export function startModernExamCronJobs(): void {
  console.log("[cron] Starting modern exam auto-submit worker (every minute).");

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const bufferTime = new Date(now.getTime() - 5_000);

      const expired = await ExamSessionModel.find({
        status: "in_progress",
        expiresAtUTC: { $lt: bufferTime },
      }).select("_id examId userId").lean();

      if (expired.length === 0) return;

      console.log(`[CRON-MODERN] Found ${expired.length} expired sessions. Auto-submitting...`);
      for (const session of expired) {
        try {
          await submitSession(String(session.examId), String(session._id), String(session.userId));
          console.log(`[CRON-MODERN] Auto-submitted session ${session._id}`);
        } catch (err) {
          console.error(`[CRON-MODERN] Failed to auto-submit session ${session._id}:`, err);
        }
      }
    } catch (err) {
      console.error("[CRON-MODERN] Error in auto-submit cron:", err);
    }
  });
}
