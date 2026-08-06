import { Router } from "express";
import { db, reportsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
  const reports = await db.select().from(reportsTable).orderBy(reportsTable.createdAt);
  res.json(GetReportsResponse.parse(reports.map(serializeReport)));
});

// POST /api/reports
router.post("/reports", async (req, res): Promise<void> => {
  const parsed = CreateReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [report] = await db
    .insert(reportsTable)
    .values({
      title: parsed.data.title,
      type: parsed.data.type,
      format: parsed.data.format,
      scanId: parsed.data.scanId ?? null,
      assetId: parsed.data.assetId ?? null,
      status: "ready",
      summary: `${parsed.data.type.charAt(0).toUpperCase() + parsed.data.type.slice(1)} report generated for ${parsed.data.title}`,
      downloadUrl: `/api/reports/download/${Date.now()}.${parsed.data.format}`,
    })
    .returning();
  res.status(201).json(CreateReportResponse.parse(serializeReport(report)));
});

// GET /api/reports/:id
router.get("/reports/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetReportParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, parsed.data.id));
  if (!report) { res.status(404).json({ error: "Not found" }); return; }
  res.json(GetReportResponse.parse(serializeReport(report)));
});

export default router;
