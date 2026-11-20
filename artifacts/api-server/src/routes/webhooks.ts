import { Router } from "express";
import { z } from "zod";
import {
  deliverWebhookPayload,
  getWorkspaceWebhook,
  isSafeWebhookUrl,
  upsertWorkspaceWebhook,
} from "../lib/workspace-webhooks";

const router = Router();

const webhookBody = z.object({
  webhookUrl: z
    .string()
    .trim()
    .max(500)
    .refine(isSafeWebhookUrl, "Webhook URL must be a valid public HTTPS address.")
    .default(""),
  enabled: z.boolean().default(false),
  notifyOnMonitoring: z.boolean().default(true),
  notifyOnHighFindings: z.boolean().default(true),
});

router.get("/settings/webhooks", async (req, res): Promise<void> => {
  res.json(await getWorkspaceWebhook(req.user!.sub));
});

router.put("/settings/webhooks", async (req, res): Promise<void> => {
  const parsed = webhookBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid webhook settings." });
    return;
  }
  res.json(await upsertWorkspaceWebhook(req.user!.sub, parsed.data));
});

router.post("/settings/webhooks/test", async (req, res): Promise<void> => {
  const cfg = await getWorkspaceWebhook(req.user!.sub);
  const url = typeof req.body?.webhookUrl === "string" && req.body.webhookUrl.trim()
    ? req.body.webhookUrl.trim()
    : cfg.webhookUrl;

  if (!url) {
    res.status(400).json({ error: "Save a webhook URL first before sending a test alert." });
    return;
  }

  const delivery = await deliverWebhookPayload(url, {
    title: "Test Alert Connected",
    summary: "Your ARDI SEC alert webhook is working. Future weekly monitoring changes will appear here.",
    severity: "info",
    source: "test",
  });

  if (!delivery.delivered) {
    res.status(502).json({ error: delivery.error ?? "Webhook endpoint rejected the test alert." });
    return;
  }
  res.json({ delivered: true, status: delivery.status });
});

export default router;
