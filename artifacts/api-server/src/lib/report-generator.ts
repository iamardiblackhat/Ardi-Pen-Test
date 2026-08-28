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
type Finding = typeof findingsTable.$inferSelect;
type Asset = typeof assetsTable.$inferSelect;
type Scan = typeof scansTable.$inferSelect;

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

export interface ReportData {
  report: Report;
  generatedAt: Date;
  owner: { name: string; email: string; orgName: string } | null;
  scan: Scan | null;
  asset: Asset | null;
  findings: Finding[];
  counts: Record<string, number>;
}

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

/** Structured JSON payload for `format: "json"`. */
export function renderReportJson(data: ReportData): string {
  return JSON.stringify(
    {
      title: data.report.title,
      type: data.report.type,
      generatedAt: data.generatedAt.toISOString(),
      owner: data.owner,
      scope: {
        scan: data.scan ? { id: data.scan.id, name: data.scan.name, type: data.scan.type } : null,
        asset: data.asset ? { id: data.asset.id, name: data.asset.name, target: data.asset.target } : null,
      },
      summary: data.counts,
      findings: data.findings.map((f) => ({
        id: f.id,
        title: f.title,
        severity: f.severity,
        status: f.status,
        category: f.category,
        cve: f.cve,
        cvss: f.cvss,
        mitre: { id: f.mitreId, tactic: f.mitreTactic, technique: f.mitreTechnique },
        description: f.description,
        remediation: f.remediation,
        evidence: f.evidence,
        discoveredAt: f.createdAt.toISOString(),
      })),
    },
    null,
    2,
  );
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#b3123b",
  high: "#c2410c",
  medium: "#a16207",
  low: "#2563eb",
  info: "#475569",
};

/** Self-contained, print-ready HTML for `format: "html"`. */
export function renderReportHtml(data: ReportData): string {
  const { report, findings, counts, owner, scan, asset, generatedAt } = data;

  const scopeLine = scan
    ? `Scan: ${esc(scan.name)} (${esc(scan.type)})`
    : asset
      ? `Asset: ${esc(asset.name)} — ${esc(asset.target)}`
      : "Scope: all assets";

  const summaryChips = SEVERITY_ORDER.map(
    (sev) =>
      `<span class="chip" style="border-color:${SEVERITY_COLOR[sev]};color:${SEVERITY_COLOR[sev]}">${counts[sev] ?? 0} ${sev}</span>`,
  ).join("");

  const findingBlocks = findings.length
    ? findings
        .map(
          (f) => `
      <section class="finding">
        <div class="finding-head">
          <span class="sev" style="background:${SEVERITY_COLOR[f.severity] ?? "#475569"}">${esc(f.severity)}</span>
          <h3>${esc(f.title)}</h3>
        </div>
        <table class="meta">
          <tr><th>Status</th><td>${esc(f.status)}</td><th>Category</th><td>${esc(f.category)}</td></tr>
          <tr><th>CVE</th><td>${esc(f.cve ?? "—")}</td><th>CVSS</th><td>${f.cvss ?? "—"}</td></tr>
          <tr><th>MITRE</th><td colspan="3">${esc(f.mitreId)} · ${esc(f.mitreTactic)} · ${esc(f.mitreTechnique)}</td></tr>
        </table>
        <h4>Description</h4><p>${esc(f.description)}</p>
        <h4>Remediation</h4><p>${esc(f.remediation)}</p>
        ${f.evidence ? `<h4>Evidence</h4><pre>${esc(f.evidence)}</pre>` : ""}
      </section>`,
        )
        .join("")
    : `<p class="empty">No findings are recorded for this scope.</p>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(report.title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font: 14px/1.55 -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #16181d; margin: 0; padding: 40px; background: #fff; }
  .wrap { max-width: 860px; margin: 0 auto; }
  header { border-bottom: 3px solid #16181d; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { margin: 0 0 4px; font-size: 26px; }
  .muted { color: #5b6470; font-size: 13px; }
  .chips { margin: 16px 0 8px; display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { border: 1px solid; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; }
  .finding { border: 1px solid #e3e6ea; border-radius: 10px; padding: 16px 18px; margin: 16px 0; page-break-inside: avoid; }
  .finding-head { display: flex; align-items: center; gap: 10px; }
  .finding-head h3 { margin: 0; font-size: 16px; }
  .sev { color: #fff; text-transform: uppercase; font-size: 11px; font-weight: 700; letter-spacing: .04em; padding: 3px 8px; border-radius: 6px; }
  table.meta { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
  table.meta th { text-align: left; color: #5b6470; font-weight: 600; padding: 3px 12px 3px 0; white-space: nowrap; width: 1%; }
  table.meta td { padding: 3px 18px 3px 0; }
  h4 { margin: 12px 0 4px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #5b6470; }
  p { margin: 0 0 4px; }
  pre { background: #f5f6f8; border: 1px solid #e3e6ea; border-radius: 8px; padding: 10px; overflow-x: auto; font-size: 12px; white-space: pre-wrap; word-break: break-word; }
  .empty { color: #5b6470; font-style: italic; }
  footer { margin-top: 32px; border-top: 1px solid #e3e6ea; padding-top: 12px; color: #5b6470; font-size: 12px; }
  @media print { body { padding: 0; } .finding { border-color: #ccc; } }
</style></head>
<body><div class="wrap">
  <header>
    <h1>${esc(report.title)}</h1>
    <div class="muted">${esc(report.type.charAt(0).toUpperCase() + report.type.slice(1))} report · ${scopeLine}</div>
    <div class="muted">Generated ${esc(generatedAt.toUTCString())}${owner ? ` · ${esc(owner.orgName || owner.name || owner.email)}` : ""}</div>
    <div class="chips">${summaryChips}</div>
    <div class="muted">${findings.length} finding${findings.length === 1 ? "" : "s"} in scope</div>
  </header>
  ${findingBlocks}
  <footer>Ardi — autonomous penetration testing. This report reflects findings recorded at generation time.</footer>
</div></body></html>`;
}
