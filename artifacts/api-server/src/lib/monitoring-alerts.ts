import { db, pool, assetsTable, scansTable, findingsTable, activityTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { startScan } from "./scan-runner";

export interface MonitoringAlert {
  id: number;
  userId: number;
  assetId: number;
  assetName: string;
  scanId: number;
  severity: "info" | "warning" | "critical";
  summary: string;
  newFindingsCount: number;
  resolvedFindingsCount: number;
  totalFindingsCount: number;
  createdAt: string;
}

let tableReady: Promise<void> | null = null;

function ensureAlertsTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS monitoring_alerts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          asset_id INTEGER NOT NULL,
          asset_name TEXT NOT NULL,
          scan_id INTEGER NOT NULL,
          severity TEXT NOT NULL DEFAULT 'info',
          summary TEXT NOT NULL,
          new_findings_count INTEGER NOT NULL DEFAULT 0,
          resolved_findings_count INTEGER NOT NULL DEFAULT 0,
          total_findings_count INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`,
      )
      .then(() => undefined)
      .catch(() => {
        tableReady = null;
      });
  }
  return tableReady;
}

export async function listMonitoringAlerts(userId: number, limit = 15): Promise<{
  monitoredAssetsCount: number;
  alerts: MonitoringAlert[];
}> {
  const assets = await db
    .select({ id: assetsTable.id, tags: assetsTable.tags })
    .from(assetsTable)
    .where(eq(assetsTable.userId, userId));

  const monitoredAssetsCount = assets.filter(
    (a) => Array.isArray(a.tags) && a.tags.includes("monitor:weekly"),
  ).length;

  try {
    await ensureAlertsTable();
    const res = await pool.query(
      `SELECT id, user_id, asset_id, asset_name, scan_id, severity, summary,
              new_findings_count, resolved_findings_count, total_findings_count, created_at
       FROM monitoring_alerts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit],
    );
    const alerts: MonitoringAlert[] = res.rows.map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      assetId: Number(r.asset_id),
      assetName: String(r.asset_name),
      scanId: Number(r.scan_id),
      severity: (r.severity as MonitoringAlert["severity"]) || "info",
      summary: String(r.summary),
      newFindingsCount: Number(r.new_findings_count ?? 0),
      resolvedFindingsCount: Number(r.resolved_findings_count ?? 0),
      totalFindingsCount: Number(r.total_findings_count ?? 0),
      createdAt: new Date(r.created_at).toISOString(),
    }));
    return { monitoredAssetsCount, alerts };
  } catch {
    return { monitoredAssetsCount, alerts: [] };
  }
}

export async function runWeeklyMonitoring(userId?: number): Promise<{
  checkedAssets: number;
  alertsCreated: number;
  results: Array<{ assetId: number; assetName: string; scanId: number; summary: string }>;
}> {
  await ensureAlertsTable();

  const allAssets = userId !== undefined
    ? await db.select().from(assetsTable).where(eq(assetsTable.userId, userId))
    : await db.select().from(assetsTable);

  const monitored = allAssets
    .filter((a) => Array.isArray(a.tags) && a.tags.includes("monitor:weekly"))
    .slice(0, 10);

  const results: Array<{ assetId: number; assetName: string; scanId: number; summary: string }> = [];

  for (const asset of monitored) {
    // Find previous completed scan before launching the new one
    const prevScans = await db
      .select()
      .from(scansTable)
      .where(
        and(
          eq(scansTable.assetId, asset.id),
          eq(scansTable.userId, asset.userId),
          eq(scansTable.status, "completed"),
        ),
      )
      .orderBy(desc(scansTable.createdAt))
      .limit(1);
    const previousScan = prevScans[0] ?? null;

    const [newScan] = await db
      .insert(scansTable)
      .values({
        userId: asset.userId,
        assetId: asset.id,
        name: `Weekly Monitor: ${asset.name}`,
        type: "vulnerability",
      })
      .returning();

    const started = startScan(newScan.id);
    if (started.started && started.completion) {
      await started.completion;
    }

    const currentFindings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.scanId, newScan.id));

    let newCount = 0;
    let resolvedCount = 0;

    if (previousScan) {
      const prevFindings = await db
        .select()
        .from(findingsTable)
        .where(eq(findingsTable.scanId, previousScan.id));
      const prevKeys = new Set(prevFindings.map((f) => `${f.title.toLowerCase()}::${f.category}`));
      const currKeys = new Set(currentFindings.map((f) => `${f.title.toLowerCase()}::${f.category}`));

      newCount = currentFindings.filter(
        (f) => !prevKeys.has(`${f.title.toLowerCase()}::${f.category}`),
      ).length;
      resolvedCount = prevFindings.filter(
        (f) => !currKeys.has(`${f.title.toLowerCase()}::${f.category}`),
      ).length;
    } else {
      newCount = currentFindings.length;
    }

    const hasCriticalOrHighNew = currentFindings.some(
      (f) => f.severity === "critical" || f.severity === "high",
    );
    const severity: MonitoringAlert["severity"] =
      newCount > 0 && hasCriticalOrHighNew
        ? "critical"
        : newCount > 0
          ? "warning"
          : "info";

    const summary = previousScan
      ? newCount === 0 && resolvedCount === 0
        ? `No changes detected on ${asset.name} (${currentFindings.length} open issue${currentFindings.length === 1 ? "" : "s"}).`
        : `${asset.name}: ${newCount} new issue${newCount === 1 ? "" : "s"} found, ${resolvedCount} resolved since last check.`
      : `First weekly monitoring baseline recorded for ${asset.name} (${currentFindings.length} issue${currentFindings.length === 1 ? "" : "s"}).`;

    await pool.query(
      `INSERT INTO monitoring_alerts
       (user_id, asset_id, asset_name, scan_id, severity, summary, new_findings_count, resolved_findings_count, total_findings_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        asset.userId,
        asset.id,
        asset.name,
        newScan.id,
        severity,
        summary,
        newCount,
        resolvedCount,
        currentFindings.length,
      ],
    );

    await db.insert(activityTable).values({
      userId: asset.userId,
      type: "scan",
      title: `Weekly monitor checked ${asset.name}`,
      description: summary,
      severity: severity === "critical" ? "high" : severity === "warning" ? "medium" : "info",
    });

    results.push({
      assetId: asset.id,
      assetName: asset.name,
      scanId: newScan.id,
      summary,
    });
  }

  return {
    checkedAssets: monitored.length,
    alertsCreated: results.length,
    results,
  };
}
