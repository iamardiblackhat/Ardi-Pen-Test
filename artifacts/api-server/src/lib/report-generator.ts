import { db, findingsTable, assetsTable, scansTable, usersTable, reportsTable } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";

/**
 * Report generation from real data.
 *
 * A report row on its own is just metadata; historically "generate report"
 * produced a DB record marked `ready` but no downloadable artifact, so the
 * feature dead-ended. This builds the actual report content on demand from the
 * caller's own findings (scoped by scan or asset when the report specifies
 * one), in the formats the UI offers. No fabricated data — every value comes
 * from the database.
 */

type Report = typeof reportsTable.$inferSelect;
type Asset = typeof assetsTable.$inferSelect;
type Scan = typeof scansTable.$inferSelect;

import { SEVERITY_ORDER, type ReportData } from "./report-renderer";
export { renderReportHtml, renderReportJson } from "./report-renderer";
export type { ReportData } from "./report-renderer";

/** Load everything a report needs, scoped to the owning user. */
export async function gatherReportData(userId: number, report: Report): Promise<ReportData> {
  const filters = [eq(findingsTable.userId, userId)];
  if (report.scanId != null) filters.push(eq(findingsTable.scanId, report.scanId));
  else if (report.assetId != null) filters.push(eq(findingsTable.assetId, report.assetId));

  const findings = await db
    .select()
    .from(findingsTable)
    .where(and(...filters))
    .orderBy(desc(findingsTable.cvss), desc(findingsTable.createdAt));

  // Stable ordering by severity (text column), then CVSS already applied above.
  findings.sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity as never) - SEVERITY_ORDER.indexOf(b.severity as never),
  );

  const counts: Record<string, number> = {};
  for (const sev of SEVERITY_ORDER) counts[sev] = 0;
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;

  let scan: Scan | null = null;
  if (report.scanId != null) {
    const [s] = await db.select().from(scansTable).where(and(eq(scansTable.id, report.scanId), eq(scansTable.userId, userId)));
    scan = s ?? null;
  }
  let asset: Asset | null = null;
  if (report.assetId != null) {
    const [a] = await db.select().from(assetsTable).where(and(eq(assetsTable.id, report.assetId), eq(assetsTable.userId, userId)));
    asset = a ?? null;
  }

  const [user] = await db
    .select({ name: usersTable.name, email: usersTable.email, orgName: usersTable.orgName })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  return {
    report,
    generatedAt: new Date(),
    owner: user ?? null,
    scan,
    asset,
    findings,
    counts,
  };
}

