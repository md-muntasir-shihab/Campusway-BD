import cron from "node-cron";
import { runRssIngestion } from "../services/rssIngestionService";

export const startRssWorker = () => {
  cron.schedule("*/10 * * * *", async () => {
    await runRssIngestion();
  });
};
