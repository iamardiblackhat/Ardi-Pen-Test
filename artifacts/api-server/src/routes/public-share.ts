import { Router } from "express";
import { db, reportsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { lookupActiveReportShare } from "../lib/report-shares";
import { gatherReportData, renderReportHtml } from "../lib/report-generator";

const router = Router();

// GET /api/share/:token — Public read-only white-labeled client report link
router.get("/share/:token", async (req, res): Promise<void> => {
  const rawToken = Array.isArray(req.params.token) ? req.params.token[0] : req.params.token;
  const token = (rawToken ?? "").trim();
  if (!token || token.length < 12 || token.length > 128) {
    res.status(404).type("text/html").send("<h1>Report link not found</h1><p>This share link is invalid or has expired.</p>");
    return;
  }

  const share = await lookupActiveReportShare(token);
  if (!share) {
    res
      .status(404)
      .type("text/html")
      .send("<h1>Report link expired or revoked</h1><p>Ask the report owner to generate a fresh share link.</p>");
    return;
  }

  const [report] = await db
    .select()
    .from(reportsTable)
    .where(and(eq(reportsTable.id, share.reportId), eq(reportsTable.userId, share.userId)));

  if (!report) {
    res.status(404).type("text/html").send("<h1>Report not found</h1>");
    return;
  }

  const data = await gatherReportData(share.userId, report);
  const baseHtml = renderReportHtml(data);

  // Inject a clean, non-printing toolbar at the top so clients can print or save as PDF with one click
  const printToolbar = `
  <div class="share-toolbar" style="position:sticky;top:0;z-index:10;background:#0f172a;color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font:13px -apple-system,Segoe UI,Roboto,sans-serif;margin:-40px -40px 28px -40px;">
    <span>Read-only client report link (valid until ${new Date(share.expiresAt).toLocaleDateString()})</span>
    <button onclick="window.print()" style="background:#fff;color:#0f172a;border:none;border-radius:6px;padding:6px 12px;font-weight:600;cursor:pointer;">Print / Save as PDF</button>
  </div>
  <style>@media print { .share-toolbar { display: none !important; } }</style>`;

  const finalHtml = baseHtml.replace("<body><div class=\"wrap\">", `<body>${printToolbar}<div class="wrap">`);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.send(finalHtml);
});

export default router;
