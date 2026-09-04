import { Router } from "express";
import { logger } from "../lib/logger";
import {
  getIntelligenceFeed,
  getThreatIntelHealth,
  threatIntelEnabled,
  threatIntelPlatformUrl,
} from "../lib/threat-intel";

const router = Router();

router.get("/intelligence/feed", async (req, res): Promise<void> => {
  if (!threatIntelEnabled()) {
    res.status(503).json({
      configured: false,
      connected: false,
      error: "Threat intelligence is not configured.",
    });
    return;
  }

  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const requestedLimit = Number.parseInt(String(req.query.limit ?? "8"), 10);
  const firstPerType = Number.isFinite(requestedLimit) ? requestedLimit : 8;

  try {
    const [health, feed] = await Promise.all([
      getThreatIntelHealth(),
      getIntelligenceFeed({ search, firstPerType }),
    ]);
    res.json({
      configured: true,
      connected: health.supported,
      version: health.version,
      platformUrl: threatIntelPlatformUrl(),
      ...feed,
    });
  } catch (error) {
    logger.error({ err: error }, "Threat intelligence feed failed");
    res.status(502).json({
      configured: true,
      connected: false,
      error: "The live threat intelligence service is temporarily unavailable.",
    });
  }
});

export default router;
