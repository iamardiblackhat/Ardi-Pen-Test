import { Router } from "express";
import { db, reportsTable, scansTable, assetsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  GetReportsResponse,
  CreateReportBody,
  CreateReportResponse,
  GetReportParams,
  GetReportResponse,
} from "@workspace/api-zod";

const router = Router();

function serializeReport(r: typeof reportsTable.$inferSelect) {
  return {
    id: r.id,
    title: r.title,
    type: r.type,
    status: r.status,
    format: r.format,
    scanId: r.scanId ?? null,
    assetId: r.assetId ?? null,
    summary: r.summary ?? null,
    downloadUrl: r.downloadUrl ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

// GET /api/reports
router.get("/reports", async (req, res): Promise<void> => {
  const reports = await db.select().from(reportsTable).where(eq(reportsTable.userId, req.user!.sub)).orderBy(reportsTable.createdAt);
  res.json(GetReportsResponse.parse(reports.map(serializeReport)));
});

// POST /api/reports
router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // A report can reference a scan/asset the caller doesn't own — reject
  // rather than let it silently attach to someone else's data.
  if (parsed.data.scanId !== undefined) {
    const [scan] = await db.select({ id: scansTable.id }).from(scansTable).where(and(eq(scansTable.id, parsed.data.scanId), eq(scansTable.userId, req.user!.sub)));
    if (!scan) { res.status(400).json({ error: `No scan with ID ${parsed.data.scanId}.` }); return; }
  }
  if (parsed.data.assetId !== undefined) {
    const [asset] = await db.select({ id: assetsTable.id }).from(assetsTable).where(and(eq(assetsTable.id, parsed.data.assetId), eq(assetsTable.userId, req.user!.sub)));
    if (!asset) { res.status(400).json({ error: `No asset with ID ${parsed.data.assetId}.` }); return; }
  }

  const [report] = await db
    .insert(reportsTable)
    .values({
      userId: req.user!.sub,
      title: parsed.data.title,
      type: parsed.data.type,
      format: parsed.data.format,
      scanId: parsed.data.scanId ?? null,
      assetId: parsed.data.assetId ?? null,
      status: "ready",
      summary: `${parsed.data.type.charAt(0).toUpperCase() + parsed.data.type.slice(1)} report generated for ${parsed.data.title}`,
      // No file is actually generated yet, so there is nothing real to link
      // to. Leaving this null rather than fabricating a URL that 404s.
      downloadUrl: null,
    })
    .returning();
  res.status(201).json(CreateReportResponse.parse(serializeReport(report)));
});

// GET /api/reports/:id
router.get("/reports/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetReportParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [report] = await db.select().from(reportsTable).where(and(eq(reportsTable.id, parsed.data.id), eq(reportsTable.userId, req.user!.sub)));
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetReportResponse.parse(serializeReport(report)));
});

export default router;
