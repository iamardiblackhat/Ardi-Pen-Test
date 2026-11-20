import type { LookalikeScanResult } from "./lookalike-scanner";
import type { WorkspaceBranding } from "./workspace-branding";

export interface DossierDomainData {
  domain: string;
  rdap: {
    handle: string | null;
    name: string | null;
    status: string[];
  } | null;
  dns: {
    ipv4: string[];
    ipv6: string[];
    mx: Array<{ exchange: string; priority: number }>;
    ns: string[];
  };
  certificates: Array<{
    name: string | null;
    issuer: string | null;
    notBefore: string | null;
    notAfter: string | null;
  }>;
}

export interface DossierInput {
  subject: string;
  region: string;
  generatedAt: string;
  answer: string;
  sources: string[];
  domainData: DossierDomainData | null;
  lookalikes: LookalikeScanResult | null;
  branding?: WorkspaceBranding | null;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderDossierHtml(input: DossierInput): string {
  const brandName = input.branding?.brandName?.trim() || "ARDI SEC";
  const accentColor =
    input.branding?.accentColor && /^#[0-9a-fA-F]{6}$/.test(input.branding.accentColor)
      ? input.branding.accentColor
      : "#16181d";
  const logoHtml = input.branding?.logoUrl
    ? `<img src="${esc(input.branding.logoUrl)}" alt="${esc(brandName)}" style="max-height:42px;max-width:200px;object-fit:contain;margin-bottom:10px;display:block;" />`
    : "";
  const footerLine = input.branding?.footerText?.trim()
    ? `${esc(input.branding.footerText.trim())}${input.branding.contactEmail ? ` | Contact: ${esc(input.branding.contactEmail)}` : ""}`
    : `${esc(brandName)} Due Diligence Dossier.${input.branding?.contactEmail ? ` Contact: ${esc(input.branding.contactEmail)}.` : ""} Compiled from live public records at generation time.`;

  const registeredLookalikes = (input.lookalikes?.candidates ?? []).filter(
    (c) => c.registered,
  );

  const domainSection = input.domainData
    ? `
    <section class="card">
      <h2>Website Registration &amp; Server Profile (${esc(input.domainData.domain)})</h2>
      <table class="meta">
        <tr><th>Registrar Handle</th><td>${esc(input.domainData.rdap?.handle ?? "Not listed")}</td></tr>
        <tr><th>IPv4 Servers</th><td>${esc(input.domainData.dns.ipv4.join(", ") || "None")}</td></tr>
        <tr><th>Nameservers</th><td>${esc(input.domainData.dns.ns.join(", ") || "None")}</td></tr>
        <tr><th>Mail Servers (MX)</th><td>${esc(input.domainData.dns.mx.map((m) => m.exchange).join(", ") || "None")}</td></tr>
        <tr><th>Public Certificates Logged</th><td>${input.domainData.certificates.length} record(s)</td></tr>
      </table>
    </section>`
    : "";

  const lookalikeSection = input.lookalikes
    ? `
    <section class="card">
      <h2>Brand Impersonation &amp; Lookalike Domains (${esc(input.lookalikes.domain)})</h2>
      <p class="muted">Checked ${input.lookalikes.checkedCount} lookalike domains. Found ${input.lookalikes.registeredCount} registered (${input.lookalikes.highRiskCount} high risk).</p>
      ${
        registeredLookalikes.length > 0
          ? `<table class="data">
              <thead><tr><th>Lookalike Domain</th><th>Risk</th><th>IP Address</th><th>Mail Capable</th><th>Web Status</th></tr></thead>
              <tbody>
                ${registeredLookalikes
                  .map(
                    (c) => `<tr>
                      <td><code>${esc(c.domain)}</code></td>
                      <td><strong>${esc(c.risk.toUpperCase())}</strong></td>
                      <td>${esc(c.ipv4[0] ?? "DNS only")}</td>
                      <td>${c.hasMail ? "Yes (MX active)" : "No"}</td>
                      <td>${c.httpStatus !== null ? `HTTP ${c.httpStatus}` : "No response"}</td>
                    </tr>`,
                  )
                  .join("")}
              </tbody>
            </table>`
          : `<p>No active lookalike or typosquatted domains were detected in this check.</p>`
      }
    </section>`
    : "";

  const sourcesList = input.sources.length
    ? `<ol class="sources">${input.sources
        .map(
          (url) =>
            `<li><a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(url)}</a></li>`,
        )
        .join("")}</ol>`
    : `<p class="muted">No external source links recorded.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(brandName)} Due Diligence Dossier: ${esc(input.subject)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { font: 14px/1.6 -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #16181d; margin: 0; padding: 36px; background: #fff; }
    .wrap { max-width: 860px; margin: 0 auto; }
    header { border-bottom: 3px solid ${accentColor}; padding-bottom: 16px; margin-bottom: 24px; }
    h1 { margin: 0 0 6px; font-size: 26px; }
    h2 { margin: 0 0 12px; font-size: 17px; color: #0f172a; }
    .muted { color: #5b6470; font-size: 13px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 18px; page-break-inside: avoid; }
    .answer { white-space: pre-wrap; margin: 0; }
    table.meta, table.data { border-collapse: collapse; width: 100%; font-size: 13px; margin-top: 8px; }
    table.meta th { text-align: left; color: #5b6470; padding: 5px 14px 5px 0; width: 220px; vertical-align: top; }
    table.meta td { padding: 5px 0; }
    table.data th, table.data td { border-bottom: 1px solid #e2e8f0; text-align: left; padding: 7px 10px 7px 0; }
    table.data th { color: #5b6470; font-size: 12px; text-transform: uppercase; }
    ol.sources { margin: 8px 0 0; padding-left: 20px; font-size: 12px; word-break: break-all; }
    ol.sources li { margin-bottom: 4px; }
    footer { margin-top: 28px; border-top: 1px solid #e2e8f0; padding-top: 12px; color: #5b6470; font-size: 12px; }
    @media print { body { padding: 0; } .card { border-color: #cbd5e1; } }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      ${logoHtml}
      <div class="muted" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:4px;color:${accentColor}">${esc(brandName)}</div>
      <h1>Due Diligence Dossier: ${esc(input.subject)}</h1>
      <div class="muted">Prepared by ${esc(brandName)} | Region: ${esc(input.region.toUpperCase())} | Generated ${esc(new Date(input.generatedAt).toUTCString())}</div>
    </header>
    <section class="card">
      <h2>Public Intelligence Summary</h2>
      <p class="answer">${esc(input.answer)}</p>
    </section>
    ${domainSection}
    ${lookalikeSection}
    <section class="card">
      <h2>Verified Public Sources (${input.sources.length})</h2>
      ${sourcesList}
    </section>
    <footer>${footerLine}</footer>
  </div>
</body>
</html>`;
}
