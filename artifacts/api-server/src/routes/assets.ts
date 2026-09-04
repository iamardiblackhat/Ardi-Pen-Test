import { Router } from "express";
import { db, activityTable, assetsTable, scansTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
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
  const assets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.userId, req.user!.sub))
    .orderBy(assetsTable.createdAt);
  res.json(GetAssetsResponse.parse(assets.map(serializeAsset)));
});

// POST /api/assets
router.post("/assets", async (req, res): Promise<void> => {
  const parsed = CreateAssetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.authorizationConfirmed !== true) {
    res
      .status(400)
      .json({
        error: "Target authorisation must be confirmed before it enters scope.",
      });
    return;
  }
  const [asset] = await db
    .insert(assetsTable)
    .values({
      userId: req.user!.sub,
      name: parsed.data.name,
      type: parsed.data.type,
      target: parsed.data.target,
      description: parsed.data.description ?? null,
      tags: parsed.data.tags ?? [],
    })
    .returning();
  await db.insert(activityTable).values({
    userId: req.user!.sub,
    type: "asset_added",
    title: `Approved target added: ${asset.name}`,
    description: `${asset.target} was added to the authorised testing scope.`,
    severity: "info",
  });
  res.status(201).json(CreateAssetResponse.parse(serializeAsset(asset)));
});

// GET /api/assets/stats — must come before /:id
router.get("/assets/stats", async (req, res): Promise<void> => {
  const assets = await db
    .select()
    .from(assetsTable)
    .where(eq(assetsTable.userId, req.user!.sub));
  const byTypeMap = new Map<string, number>();
  const byRiskMap = new Map<string, number>();
  for (const a of assets) {
    byTypeMap.set(a.type, (byTypeMap.get(a.type) ?? 0) + 1);
    byRiskMap.set(a.riskLevel, (byRiskMap.get(a.riskLevel) ?? 0) + 1);
  }
  res.json(
    GetAssetStatsResponse.parse({
      byType: Array.from(byTypeMap.entries()).map(([type, count]) => ({
        type,
        count,
      })),
      byRisk: Array.from(byRiskMap.entries()).map(([risk, count]) => ({
        risk,
        count,
      })),
    }),
  );
});

// GET /api/assets/:id
router.get("/assets/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetAssetParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [asset] = await db
    .select()
    .from(assetsTable)
    .where(
      and(
        eq(assetsTable.id, parsed.data.id),
        eq(assetsTable.userId, req.user!.sub),
      ),
    );
  if (!asset) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(GetAssetResponse.parse(serializeAsset(asset)));
});

// PATCH /api/assets/:id
router.patch("/assets/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramParsed = UpdateAssetParams.safeParse({ id: parseInt(rawId, 10) });
  if (!paramParsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const bodyParsed = UpdateAssetBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: bodyParsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (bodyParsed.data.name !== undefined) updates.name = bodyParsed.data.name;
  if (bodyParsed.data.status !== undefined)
    updates.status = bodyParsed.data.status;
  if (bodyParsed.data.description !== undefined)
    updates.description = bodyParsed.data.description;
  if (bodyParsed.data.tags !== undefined) updates.tags = bodyParsed.data.tags;

  const [asset] = await db
    .update(assetsTable)
    .set(updates)
    .where(
      and(
        eq(assetsTable.id, paramParsed.data.id),
        eq(assetsTable.userId, req.user!.sub),
      ),
    )
    .returning();
  if (!asset) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateAssetResponse.parse(serializeAsset(asset)));
});

// DELETE /api/assets/:id
router.delete("/assets/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = DeleteAssetParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [owned] = await db
    .select({ id: assetsTable.id })
    .from(assetsTable)
    .where(
      and(
        eq(assetsTable.id, parsed.data.id),
        eq(assetsTable.userId, req.user!.sub),
      ),
    );
  if (!owned) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // Neither scans nor findings have a foreign key back to assets, so a
  // straight delete would silently orphan scan/finding history — including,
  // for a security product, the record of what was authorized and tested.
  // Block deletion rather than lose that; the user can rename/deactivate
  // instead once that exists.
  const [existingScan] = await db
    .select({ id: scansTable.id })
    .from(scansTable)
    .where(eq(scansTable.assetId, parsed.data.id))
    .limit(1);
  if (existingScan) {
    res
      .status(409)
      .json({ error: "This asset has scan history and cannot be deleted." });
    return;
  }

  await db.delete(assetsTable).where(eq(assetsTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
