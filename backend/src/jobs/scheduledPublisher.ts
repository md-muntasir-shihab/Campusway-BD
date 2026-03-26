import cron from "node-cron";
import { NewsItemModel } from "../models/newsItem.model";

export const startScheduledPublisher = () => {
  cron.schedule("*/1 * * * *", async () => {
    const now = new Date();
    await NewsItemModel.updateMany(
      { status: "scheduled", scheduledAt: { $lte: now } },
      { $set: { status: "published", publishedAt: now } }
    );
  });
};
