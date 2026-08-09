import { Router } from "express";
import { db, assetsTable, scansTable, findingsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetDashboardStatsResponse,
  GetDashboardActivityResponse,
  GetFindingsBySeverityResponse,
  GetScanTrendResponse,
} from "@workspace/api-zod";

const router = Router();

// GET /api/dashboard/stats
router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const [assets, scans, findings] = await Promise.all([
    db.select().from(assetsTable).where(eq(assetsTable.userId, req.user!.sub)),
    db.select().from(scansTable).where(eq(scansTable.userId, req.user!.sub)),
    db.select().from(findingsTable).where(eq(findingsTable.userId, req.user!.sub)),
  ]);

  const totalAssets = assets.length;
  const activeScans = scans.filter(s => s.status === "running").length;
  const openFindings = findings.filter(f => f.status === "open" || f.status === "in_progress").length;
  const criticalFindings = findings.filter(f => f.severity === "critical" && f.status === "open").length;
  const resolvedFindings = findings.filter(f => f.status === "resolved").length;
  const complianceScore = 74; // static for demo

  const completedScans = scans.filter(s => s.completedAt);
  const lastScanAt = completedScans.length > 0
    ? completedScans.sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))[0].completedAt?.toISOString() ?? null
    : null;

  res.json(GetDashboardStatsResponse.parse({
    totalAssets,
    activeScans,
    openFindings,
    criticalFindings,
    resolvedFindings,
    complianceScore,
    lastScanAt,
  }));
});

// GET /api/dashboard/activity
router.get("/dashboard/activity", async (req, res): Promise<void> => {
  const items = await db.select().from(activityTable).where(eq(activityTable.userId, req.user!.sub)).orderBy(activityTable.createdAt);
  const serialized = items.slice(-20).reverse().map(a => ({
    id: a.id,
    type: a.type,
    title: a.title,
    description: a.description,
    severity: a.severity ?? null,
    createdAt: a.createdAt.toISOString(),
  }));
  res.json(GetDashboardActivityResponse.parse(serialized));
});

// GET /api/dashboard/findings-by-severity
router.get("/dashboard/findings-by-severity", async (req, res): Promise<void> => {
  const findings = await db.select().from(findingsTable).where(eq(findingsTable.userId, req.user!.sub));
  const severities = ["critical", "high", "medium", "low", "info"];
  const counts = severities.map(severity => ({
    severity,
    count: findings.filter(f => f.severity === severity).length,
  }));
  res.json(GetFindingsBySeverityResponse.parse(counts));
});

// GET /api/dashboard/scan-trend
router.get("/dashboard/scan-trend", async (req, res): Promise<void> => {
  const [scans, findings] = await Promise.all([
    db.select().from(scansTable).where(eq(scansTable.userId, req.user!.sub)),
    db.select().from(findingsTable).where(eq(findingsTable.userId, req.user!.sub)),
  ]);

  // Build last 8 weeks of data
  const weeks: { date: string; scans: number; findings: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const weekStart = new Date(d);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const scanCount = scans.filter(s => {
      const ts = s.createdAt;
      return ts >= weekStart && ts < weekEnd;
    }).length;
    const findingCount = findings.filter(f => {
      const ts = f.createdAt;
      return ts >= weekStart && ts < weekEnd;
    }).length;

    weeks.push({
      date: weekStart.toISOString().slice(0, 10),
      scans: scanCount,
      findings: findingCount,
    });
  }

  res.json(GetScanTrendResponse.parse(weeks));
});

export default router;
