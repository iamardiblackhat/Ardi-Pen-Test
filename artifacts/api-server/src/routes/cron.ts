import { Router } from "express";
import { runWeeklyMonitoring } from "../lib/monitoring-alerts";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/cron/weekly-monitor
// Called automatically by Vercel Cron every Monday at 08:00 UTC.
router.get("/cron/weekly-monitor", async (req, res): Promise<void> => {
  const cronSecret = process.env["CRON_SECRET"];
  const authHeader = req.headers["authorization"];
  const isVercelCron = req.headers["x-vercel-cron"] === "1";

  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !isVercelCron) {
    res.status(401).json({ error: "Unauthorized cron trigger." });
    return;
  }

  try {
    const summary = await runWeeklyMonitoring();
    res.json({
      ok: true,
      ranAt: new Date().toISOString(),
      ...summary,
    });
  } catch (err) {
    logger.error({ err }, "Weekly monitoring cron failed");
    res.status(500).json({ error: "Weekly monitoring run failed." });
  }
});

export default router;
