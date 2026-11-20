import { Router } from "express";
import { db, assetsTable, findingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\.svg$/i, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
}

function computeGrade(findings: Array<{ severity: string; status: string }>): {
  grade: string;
  color: string;
} {
  const open = findings.filter((f) => f.status === "open" || f.status === "in_progress");
  let score = 100;
  for (const f of open) {
    if (f.severity === "critical") score -= 35;
    else if (f.severity === "high") score -= 18;
    else if (f.severity === "medium") score -= 8;
    else if (f.severity === "low") score -= 3;
  }
  score = Math.max(0, score);
  if (score >= 95) return { grade: "A+", color: "#10b981" };
  if (score >= 85) return { grade: "A", color: "#10b981" };
  if (score >= 75) return { grade: "B", color: "#0ea5e9" };
  if (score >= 60) return { grade: "C", color: "#f59e0b" };
  if (score >= 45) return { grade: "D", color: "#f97316" };
  return { grade: "F", color: "#e11d48" };
}

function renderBadgeSvg(label: string, rightText: string, rightColor: string): string {
  const leftWidth = 112;
  const rightWidth = Math.max(76, rightText.length * 7 + 20);
  const totalWidth = leftWidth + rightWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" role="img" aria-label="${label}: ${rightText}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="28" rx="6" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="28" fill="#0f172a"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="28" fill="${rightColor}"/>
    <rect width="${totalWidth}" height="28" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11" font-weight="700">
    <text x="${leftWidth / 2}" y="18">${label}</text>
    <text x="${leftWidth + rightWidth / 2}" y="18">${rightText}</text>
  </g>
</svg>`;
}

// GET /api/badge/:domain — Live embeddable SVG security grade badge
router.get("/badge/:domain", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.domain) ? req.params.domain[0] : req.params.domain;
  const domain = normalizeDomain(raw ?? "");
  if (!domain) {
    res.status(400).type("image/svg+xml").send(renderBadgeSvg("ARDI SEC", "INVALID", "#64748b"));
    return;
  }

  try {
    const allAssets = await db.select().from(assetsTable);
    const matching = allAssets.find((a) => normalizeDomain(a.target) === domain);

    if (!matching || !matching.lastScannedAt) {
      res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.send(renderBadgeSvg("ARDI SEC", "MONITORED", "#6366f1"));
      return;
    }

    const findings = await db
      .select({ severity: findingsTable.severity, status: findingsTable.status })
      .from(findingsTable)
      .where(eq(findingsTable.assetId, matching.id));

    const { grade, color } = computeGrade(findings);
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(renderBadgeSvg("ARDI SEC", `GRADE ${grade}`, color));
  } catch {
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.send(renderBadgeSvg("ARDI SEC", "MONITORED", "#6366f1"));
  }
});

export default router;
