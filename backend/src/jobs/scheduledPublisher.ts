import cron from "node-cron";
import News from "../models/News";

export const startScheduledPublisher = () => {
  cron.schedule("*/1 * * * *", async () => {
    const now = new Date();
    await News.updateMany(
      { status: "scheduled", scheduledAt: { $lte: now } },
      { $set: { status: "published", publishedAt: now } }
    );
  });
};
