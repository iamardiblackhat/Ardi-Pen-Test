import { Router } from "express";
import { z } from "zod";
import {
  createWorkspaceApiKey,
  listWorkspaceApiKeys,
  revokeWorkspaceApiKey,
} from "../lib/workspace-api-keys";

const router = Router();

const createKeyBody = z.object({
  name: z.string().trim().min(2, "Enter a name like 'GitHub Actions'").max(80),
});

router.get("/settings/api-keys", async (req, res): Promise<void> => {
  res.json({ keys: await listWorkspaceApiKeys(req.user!.sub) });
});

router.post("/settings/api-keys", async (req, res): Promise<void> => {
  const parsed = createKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid API key name." });
    return;
  }
  const created = await createWorkspaceApiKey(req.user!.sub, parsed.data.name);
  res.status(201).json(created);
});

router.delete("/settings/api-keys/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid key id." });
    return;
  }
  const revoked = await revokeWorkspaceApiKey(req.user!.sub, id);
  if (!revoked) {
    res.status(404).json({ error: "API key not found." });
    return;
  }
  res.json({ revoked: true });
});

export default router;
