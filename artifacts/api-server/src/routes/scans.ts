import { Router } from "express";
import { startScan, cancelScan } from "../lib/scan-runner";
import { db, scansTable, assetsTable, findingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetScansResponse,
  CreateScanBody,
  CreateScanResponse,
  GetScanParams,
  GetScanResponse,
  StartScanParams,
  StartScanResponse,
  StopScanParams,
  StopScanResponse,
  GetScanFindingsParams,
  GetScanFindingsResponse,
} from "@workspace/api-zod";

const router = Router();

async function serializeScan(s: typeof scansTable.$inferSelect) {
  const asset = await db.select({ name: assetsTable.name }).from(assetsTable).where(eq(assetsTable.id, s.assetId));
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    status: s.status,
    assetId: s.assetId,
    assetName: asset[0]?.name ?? "Unknown",
    progress: s.progress,
    startedAt: s.startedAt?.toISOString() ?? null,
    completedAt: s.completedAt?.toISOString() ?? null,
    findingsCount: s.findingsCount,
    criticalCount: s.criticalCount,
    highCount: s.highCount,
    duration: s.duration ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

// GET /api/scans
router.get("/scans", async (req, res): Promise<void> => {
  const scans = await db.select().from(scansTable).orderBy(scansTable.createdAt);
  const serialized = await Promise.all(scans.map(serializeScan));
  res.json(GetScansResponse.parse(serialized));
});

// POST /api/scans
router.post("/scans", async (req, res): Promise<void> => {
  const parsed = CreateScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [scan] = await db
    .insert(scansTable)
    .values({
      name: parsed.data.name,
      type: parsed.data.type,
      assetId: parsed.data.assetId,
    })
    .returning();
  res.status(201).json(CreateScanResponse.parse(await serializeScan(scan)));
});

// GET /api/scans/:id
router.get("/scans/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetScanParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, parsed.data.id));
  if (!scan) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetScanResponse.parse(await serializeScan(scan)));
});

// POST /api/scans/:id/start
router.post("/scans/:id/start", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = StartScanParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(scansTable).where(eq(scansTable.id, parsed.data.id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  if (existing.status === "running") {
    res.status(409).json({ error: "Scan is already running." });
    return;
  }

  // Actually launch the scanner. This spawns nmap/nuclei against the asset's
  // target and writes real findings; it returns immediately and the scan
  // continues in the background, reporting progress into the scans table.
  const result = startScan(parsed.data.id);
  if (!result.started) {
    res.status(409).json({ error: result.reason ?? "Could not start scan." });
    return;
  }

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, parsed.data.id));
  res.json(StartScanResponse.parse(await serializeScan(scan!)));
});

// POST /api/scans/:id/stop
router.post("/scans/:id/stop", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = StopScanParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  // Signal the running scanner to abort. If nothing is in flight (e.g. after
  // a restart) fall through and mark the row stopped anyway, so the UI never
  // strands on a scan that no longer exists.
  cancelScan(parsed.data.id);

  const [scan] = await db
    .update(scansTable)
    .set({ status: "stopped", completedAt: new Date() })
    .where(eq(scansTable.id, parsed.data.id))
    .returning();
  if (!scan) { res.status(404).json({ error: "Not found" }); return; }
  res.json(StopScanResponse.parse(await serializeScan(scan)));
});

// GET /api/scans/:id/findings
router.get("/scans/:id/findings", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetScanFindingsParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const findings = await db.select().from(findingsTable).where(eq(findingsTable.scanId, parsed.data.id));
  const assets = await db.select().from(assetsTable);
  const assetMap = new Map(assets.map(a => [a.id, a.name]));
  const serialized = findings.map(f => ({
    id: f.id,
    title: f.title,
    severity: f.severity,
    status: f.status,
    category: f.category,
    assetId: f.assetId,
    assetName: assetMap.get(f.assetId) ?? "Unknown",
    scanId: f.scanId,
    cve: f.cve ?? null,
    cvss: f.cvss ?? null,
    mitreId: f.mitreId,
    mitreTactic: f.mitreTactic,
    mitreTechnique: f.mitreTechnique,
    description: f.description,
    remediation: f.remediation,
    evidence: f.evidence ?? null,
    notes: f.notes ?? null,
    resolvedAt: f.resolvedAt?.toISOString() ?? null,
    createdAt: f.createdAt.toISOString(),
  }));
  res.json(GetScanFindingsResponse.parse(serialized));
});

export default router;
