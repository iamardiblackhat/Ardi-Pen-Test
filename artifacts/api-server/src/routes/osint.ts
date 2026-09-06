import { Router } from "express";
import {
  researchDomain,
  researchOpenSources,
} from "@workspace/ardi-agent/cyber";
import { z } from "zod";
import { rateLimit } from "../middlewares/rate-limit";
import { logger } from "../lib/logger";

const router = Router();

const researchRequest = z.object({
  subject: z.string().trim().min(2).max(200),
  question: z.string().trim().min(5).max(2000),
  objective: z.enum([
    "person",
    "organisation",
    "domain",
    "incident",
    "threat",
    "exposure",
  ]),
  region: z.enum(["uk", "europe", "global"]),
});

router.post(
  "/osint/research",
  rateLimit(6, 60000),
  async (req, res): Promise<void> => {
    const parsed = researchRequest.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error:
            "Enter a subject, a research question, and a valid search region.",
        });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    try {
      res.json(await researchOpenSources(parsed.data));
    } catch (error) {
      logger.error({ err: error }, "Public-source research failed");
      res
        .status(503)
        .json({
          error:
            "Live research could not complete. No result has been generated. Please try again later.",
        });
    }
  },
);

router.get("/osint/domain/:domain", async (req, res): Promise<void> => {
  const rawDomain = Array.isArray(req.params.domain)
    ? req.params.domain[0]
    : req.params.domain;
  try {
    res.json(await researchDomain(rawDomain));
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "The domain research request failed.",
    });
  }
});

export default router;
