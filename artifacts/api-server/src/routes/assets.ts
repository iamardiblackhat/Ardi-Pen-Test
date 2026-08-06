import { Router } from "express";
import { db, assetsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  GetAssetsResponse,
  CreateAssetBody,
  CreateAssetResponse,
  GetAssetParams,
  GetAssetResponse,
  UpdateAssetParams,
  UpdateAssetBody,
  UpdateAssetResponse,
  DeleteAssetParams,
  GetAssetStatsResponse,
} from "@workspace/api-zod";

const router = Router();

function serializeAsset(a: typeof assetsTable.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    target: a.target,
    status: a.status,
    riskLevel: a.riskLevel,
    tags: a.tags ?? [],
    lastScannedAt: a.lastScannedAt?.toISOString() ?? null,
    openFindings: a.openFindings,
    description: a.description ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

// GET /api/assets
router.get("/assets", async (req, res): Promise<void> => {
  const assets = await db.select().from(assetsTable).orderBy(assetsTable.createdAt);
  res.json(GetAssetsResponse.parse(assets.map(serializeAsset)));
});

// POST /api/assets
router.post("/assets", async (req, res): Promise<void> => {
  const parsed = CreateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [asset] = await db
    .insert(assetsTable)
    .values({
      name: parsed.data.name,
      type: parsed.data.type,
      target: parsed.data.target,
      description: parsed.data.description ?? null,
      tags: parsed.data.tags ?? [],
    })
    .returning();
  res.status(201).json(CreateAssetResponse.parse(serializeAsset(asset)));
});

// GET /api/assets/stats — must come before /:id
router.get("/assets/stats", async (req, res): Promise<void> => {
  const assets = await db.select().from(assetsTable);
  const byTypeMap = new Map<string, number>();
  const byRiskMap = new Map<string, number>();
  for (const a of assets) {
    byTypeMap.set(a.type, (byTypeMap.get(a.type) ?? 0) + 1);
    byRiskMap.set(a.riskLevel, (byRiskMap.get(a.riskLevel) ?? 0) + 1);
  }
  res.json(
    GetAssetStatsResponse.parse({
      byType: Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count })),
      byRisk: Array.from(byRiskMap.entries()).map(([risk, count]) => ({ risk, count })),
    })
  );
});

// GET /api/assets/:id
router.get("/assets/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetAssetParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, parsed.data.id));
  if (!asset) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetAssetResponse.parse(serializeAsset(asset)));
});

// PATCH /api/assets/:id
router.patch("/assets/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramParsed = UpdateAssetParams.safeParse({ id: parseInt(rawId, 10) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateAssetBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: bodyParsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (bodyParsed.data.name !== undefined) updates.name = bodyParsed.data.name;
  if (bodyParsed.data.status !== undefined) updates.status = bodyParsed.data.status;
  if (bodyParsed.data.description !== undefined) updates.description = bodyParsed.data.description;
  if (bodyParsed.data.tags !== undefined) updates.tags = bodyParsed.data.tags;

  const [asset] = await db
    .update(assetsTable)
    .set(updates)
    .where(eq(assetsTable.id, paramParsed.data.id))
    .returning();
  if (!asset) { res.status(404).json({ error: "Not found" }); return; }
  res.json(UpdateAssetResponse.parse(serializeAsset(asset)));
});

// DELETE /api/assets/:id
router.delete("/assets/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteAssetParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(assetsTable).where(eq(assetsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
