import { Router } from "express";
import { db, findingsTable, assetsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetFindingsResponse,
  GetFindingParams,
  GetFindingResponse,
  UpdateFindingParams,
  UpdateFindingBody,
  UpdateFindingResponse,
  GetMitreCoverageResponse,
  GetFindingStatsResponse,
} from "@workspace/api-zod";

const router = Router();

async function getAssetMap() {
  const assets = await db.select({ id: assetsTable.id, name: assetsTable.name }).from(assetsTable);
  return new Map(assets.map(a => [a.id, a.name]));
}

function serializeFinding(f: typeof findingsTable.$inferSelect, assetName: string) {
  return {
    id: f.id,
    title: f.title,
    severity: f.severity,
    status: f.status,
    category: f.category,
    assetId: f.assetId,
    assetName,
    scanId: f.scanId,
    cve: f.cve ?? null,
    cvss: f.cvss ?? null,
    mitreId: f.mitreId,
    mitreTactic: f.mitreTactic,
    mitreTechnique: f.mitreTechnique,
    description: f.description,
    remediation: f.remediation,
    evidence: f.evidence ?? null,
    notes: f.notes ?? null,
    resolvedAt: f.resolvedAt?.toISOString() ?? null,
    createdAt: f.createdAt.toISOString(),
  };
}

// GET /api/findings/mitre-coverage — must be before /:id
router.get("/findings/mitre-coverage", async (req, res): Promise<void> => {
  const findings = await db.select().from(findingsTable);
  const tacticMap = new Map<string, Map<string, { count: number; severity: string }>>();

  for (const f of findings) {
    if (!tacticMap.has(f.mitreTactic)) tacticMap.set(f.mitreTactic, new Map());
    const techniques = tacticMap.get(f.mitreTactic)!;
    const key = `${f.mitreId}:${f.mitreTechnique}`;
    const existing = techniques.get(key);
    if (existing) {
      existing.count++;
      // Escalate severity
      const order = ["critical", "high", "medium", "low", "info"];
      if (order.indexOf(f.severity) < order.indexOf(existing.severity)) {
        existing.severity = f.severity;
      }
    } else {
      techniques.set(key, { count: 1, severity: f.severity });
    }
  }

  const tacticIds: Record<string, string> = {
    "Initial Access": "TA0001",
    "Execution": "TA0002",
    "Persistence": "TA0003",
    "Privilege Escalation": "TA0004",
    "Defense Evasion": "TA0005",
    "Credential Access": "TA0006",
    "Discovery": "TA0007",
    "Lateral Movement": "TA0008",
    "Collection": "TA0009",
    "Exfiltration": "TA0010",
    "Impact": "TA0040",
    "Command and Control": "TA0011",
  };

  const result = Array.from(tacticMap.entries()).map(([tacticName, techniques]) => ({
    id: tacticIds[tacticName] ?? "TA0000",
    name: tacticName,
    techniques: Array.from(techniques.entries()).map(([key, data]) => {
      const [id, name] = key.split(":");
      return { id, name, count: data.count, severity: data.severity };
    }),
  }));

  res.json(GetMitreCoverageResponse.parse(result));
});

// GET /api/findings/stats — must be before /:id
router.get("/findings/stats", async (req, res): Promise<void> => {
  const findings = await db.select().from(findingsTable);
  const total = findings.length;
  const open = findings.filter(f => f.status === "open" || f.status === "in_progress").length;
  const resolved = findings.filter(f => f.status === "resolved").length;

  // Group by month
  const monthMap = new Map<string, { discovered: number; resolved: number }>();
  for (const f of findings) {
    const month = f.createdAt.toISOString().slice(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, { discovered: 0, resolved: 0 });
    monthMap.get(month)!.discovered++;
    if (f.status === "resolved") monthMap.get(month)!.resolved++;
  }

  const byMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  res.json(GetFindingStatsResponse.parse({ total, open, resolved, mttr: null, byMonth }));
});

// GET /api/findings
router.get("/findings", async (req, res): Promise<void> => {
  const findings = await db.select().from(findingsTable).orderBy(findingsTable.createdAt);
  const assetMap = await getAssetMap();
  const serialized = findings.map(f => serializeFinding(f, assetMap.get(f.assetId) ?? "Unknown"));
  res.json(GetFindingsResponse.parse(serialized));
});

// GET /api/findings/:id
router.get("/findings/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetFindingParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [f] = await db.select().from(findingsTable).where(eq(findingsTable.id, parsed.data.id));
  if (!f) { res.status(404).json({ error: "Not found" }); return; }
  const assetMap = await getAssetMap();
  res.json(GetFindingResponse.parse(serializeFinding(f, assetMap.get(f.assetId) ?? "Unknown")));
});

// PATCH /api/findings/:id
router.patch("/findings/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const paramParsed = UpdateFindingParams.safeParse({ id: parseInt(rawId, 10) });
  if (!paramParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = UpdateFindingBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: bodyParsed.error.message }); return; }

  const updates: Record<string, unknown> = {};
  if (bodyParsed.data.status !== undefined) updates.status = bodyParsed.data.status;
  if (bodyParsed.data.notes !== undefined) updates.notes = bodyParsed.data.notes;
  if (bodyParsed.data.status === "resolved") updates.resolvedAt = new Date();

  const [f] = await db
    .update(findingsTable)
    .set(updates)
    .where(eq(findingsTable.id, paramParsed.data.id))
    .returning();
  if (!f) { res.status(404).json({ error: "Not found" }); return; }
  const assetMap = await getAssetMap();
  res.json(UpdateFindingResponse.parse(serializeFinding(f, assetMap.get(f.assetId) ?? "Unknown")));
});

export default router;
