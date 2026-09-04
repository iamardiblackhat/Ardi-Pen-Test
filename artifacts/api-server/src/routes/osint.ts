import { Router } from "express";
import { researchDomain } from "@workspace/ardi-agent/cyber";

const router = Router();

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
