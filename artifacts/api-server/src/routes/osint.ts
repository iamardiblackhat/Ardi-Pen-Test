import { Router } from "express";
import {
  researchDomain,
  researchOpenSources,
} from "@workspace/ardi-agent/cyber";
import { z } from "zod";
import { rateLimit } from "../middlewares/rate-limit";
import { logger } from "../lib/logger";
import { scanLookalikeDomains } from "../lib/lookalike-scanner";
import { renderDossierHtml } from "../lib/dossier-renderer";

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
      const notConfigured =
        error instanceof Error && /not configured/i.test(error.message);
      res.status(503).json({
        error: notConfigured
          ? "Name and company research is not set up on this server. Website lookup still works. No result was invented."
          : "Live research could not complete. No result has been generated. Please try again later.",
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

router.get(
  "/osint/lookalikes/:domain",
  rateLimit(10, 60_000),
  async (req, res): Promise<void> => {
    const rawDomain = Array.isArray(req.params.domain)
      ? req.params.domain[0]
      : req.params.domain;
    res.setHeader("Cache-Control", "no-store");
    try {
      res.json(await scanLookalikeDomains(rawDomain));
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "The lookalike domain check failed.",
      });
    }
  },
);

const dossierRequest = z.object({
  subject: z.string().trim().min(2).max(200),
  domain: z.string().trim().max(253).optional(),
  region: z.enum(["uk", "europe", "global"]).default("global"),
  question: z.string().trim().min(5).max(2000).optional(),
  objective: z
    .enum(["person", "organisation", "domain", "incident", "threat", "exposure"])
    .default("organisation"),
});

router.post(
  "/osint/dossier",
  rateLimit(6, 60_000),
  async (req, res): Promise<void> => {
    const parsed = dossierRequest.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Enter a valid company name or subject for the dossier." });
      return;
    }
    const { subject, region, objective } = parsed.data;
    const rawDomain =
      parsed.data.domain?.trim() ||
      (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(subject) ? subject : "");
    const question =
      parsed.data.question ||
      `Compile a concise public due diligence summary for ${subject}, covering ownership, public presence, and any notable security or reputation risks.`;

    res.setHeader("Cache-Control", "no-store");
    try {
      const [research, domainData, lookalikes] = await Promise.all([
        researchOpenSources({ subject, objective, region, question }),
        rawDomain ? researchDomain(rawDomain).catch(() => null) : Promise.resolve(null),
        rawDomain ? scanLookalikeDomains(rawDomain).catch(() => null) : Promise.resolve(null),
      ]);

      const generatedAt = new Date().toISOString();
      const html = renderDossierHtml({
        subject,
        region,
        generatedAt,
        answer: research.answer,
        sources: research.sources,
        domainData,
        lookalikes,
      });

      res.json({
        subject,
        region,
        generatedAt,
        answer: research.answer,
        sources: research.sources,
        domainData,
        lookalikes,
        html,
      });
    } catch (error) {
      logger.error({ err: error }, "Dossier generation failed");
      res.status(503).json({
        error:
          error instanceof Error
            ? error.message
            : "Could not compile the due diligence dossier right now.",
      });
    }
  },
);

export default router;
