import { Router } from "express";
import { logger } from "../lib/logger";
import {
  getIntelligenceFeed,
  getThreatIntelHealth,
  threatIntelEnabled,
  threatIntelPlatformUrl,
} from "../lib/threat-intel";

import { loadBotazezFeed } from "../lib/botazez-intelligence";
import { rateLimit } from "../middlewares/rate-limit";

const router = Router();

router.get("/intelligence/feed", rateLimit(30, 60_000), async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 200) : undefined;
  const requestedLimit = Number.parseInt(String(req.query.limit ?? "10"), 10);
  const firstPerType = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(50, requestedLimit)) : 10;
  res.setHeader("Cache-Control", "no-store");

  if (threatIntelEnabled()) {
    try {
      const [health, feed] = await Promise.all([getThreatIntelHealth(), getIntelligenceFeed({ search, firstPerType })]);
      if (!health.supported) throw new Error("Unsupported threat-intelligence connection");
      res.json({ configured: true, connected: true, version: health.version, platformUrl: threatIntelPlatformUrl(), provider: "opencti", ...feed });
      return;
    } catch (error) {
      logger.warn({ err: error }, "Primary intelligence feed failed; trying Botazez public records");
    }
  }
  try {
    res.json(await loadBotazezFeed(search, firstPerType));
  } catch (error) {
    logger.warn({ err: error }, "Botazez intelligence feed failed");
    res.status(502).json({ configured: true, connected: false, error: "Botazez’s public cyber-threat feed is temporarily unavailable. Please try again shortly." });
  }
});

export default router;
