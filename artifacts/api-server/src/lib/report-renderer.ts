import type { findingsTable, assetsTable, scansTable, reportsTable } from "@workspace/db";
type Report = typeof reportsTable.$inferSelect;
type Finding = typeof findingsTable.$inferSelect;
type Asset = typeof assetsTable.$inferSelect;
type Scan = typeof scansTable.$inferSelect;
export const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;
export interface ReportData {
  report: Report;
  generatedAt: Date;
  owner: { name: string; email: string; orgName: string } | null;
  scan: Scan | null;
  asset: Asset | null;
  findings: Finding[];
  counts: Record<string, number>;
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
        scan: data.scan ? { id: data.scan.id, name: data.scan.name, type: data.scan.type, status: data.scan.status, progress: data.scan.progress } : null,
        asset: data.asset ? { id: data.asset.id, name: data.asset.name, target: data.asset.target } : null,
      },
      assessmentComplete: data.scan ? data.scan.status === "completed" : null,
      limitations: data.scan && data.scan.status !== "completed" ? ["This assessment did not complete. Recorded findings may be partial; absence of findings does not establish security."] : ["This report contains recorded findings and does not certify that a target is secure."],
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

  const assessmentNotice = scan && scan.status !== "completed"
    ? `<aside class="assessment-notice"><strong>Assessment incomplete — ${esc(scan.status)}</strong><p>This check did not finish. Recorded findings may be partial; no findings does not mean the target is secure.</p></aside>`
    : "";

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
  .assessment-notice { border:2px solid #a16207; background:#fffbeb; color:#713f12; border-radius:10px; padding:14px 18px; margin:18px 0; }
  .empty { color: #5b6470; font-style: italic; }
  footer { margin-top: 32px; border-top: 1px solid #e3e6ea; padding-top: 12px; color: #5b6470; font-size: 12px; }
  @media print { body { padding: 0; } .finding { border-color: #ccc; } }
</style></head>
<body><div class="wrap">
  <header>
    <h1>${esc(report.title)}</h1>
    <div class="muted">${esc(report.type.charAt(0).toUpperCase() + report.type.slice(1))} report · ${scopeLine}</div>
    <div class="muted">Generated ${esc(generatedAt.toUTCString())}${owner ? ` · ${esc(owner.orgName || owner.name || owner.email)}` : ""}</div>
    ${assessmentNotice}
<div class="chips">${summaryChips}</div>
    <div class="muted">${findings.length} finding${findings.length === 1 ? "" : "s"} in scope</div>
  </header>
  ${findingBlocks}
  <footer>ARDI SEC — Security assessment report. This report reflects findings recorded at generation time and does not certify that a target is secure.</footer>
</div></body></html>`;
}
