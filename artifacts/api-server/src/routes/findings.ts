import { Router } from "express";
import { db, activityTable, findingsTable, assetsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { enrich } from "../lib/threat-intel";
import { buildBlueTeamDefense } from "../lib/blue-team-defenses";
import { runServerlessScan } from "../lib/serverless-scanner";
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

async function getAssetMap(userId: number) {
  const assets = await db.select({ id: assetsTable.id, name: assetsTable.name }).from(assetsTable).where(eq(assetsTable.userId, userId));
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
  const findings = await db.select().from(findingsTable).where(eq(findingsTable.userId, req.user!.sub));
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
  const findings = await db.select().from(findingsTable).where(eq(findingsTable.userId, req.user!.sub));
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
  const findings = await db.select().from(findingsTable).where(eq(findingsTable.userId, req.user!.sub)).orderBy(findingsTable.createdAt);
  const assetMap = await getAssetMap(req.user!.sub);
  const serialized = findings.map(f => serializeFinding(f, assetMap.get(f.assetId) ?? "Unknown"));
  res.json(GetFindingsResponse.parse(serialized));
});

// GET /api/findings/:id
router.get("/findings/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = GetFindingParams.safeParse({ id: parseInt(rawId, 10) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const [f] = await db.select().from(findingsTable).where(and(eq(findingsTable.id, parsed.data.id), eq(findingsTable.userId, req.user!.sub)));
  if (!f) { res.status(404).json({ error: "Not found" }); return; }
  const assetMap = await getAssetMap(req.user!.sub);
  res.json(GetFindingResponse.parse(serializeFinding(f, assetMap.get(f.assetId) ?? "Unknown")));
});

// GET /api/findings/:id/threat-intel — live OpenCTI enrichment for one finding.
// Not part of the generated OpenAPI client; called directly by the finding
// detail view. Returns real KEV/EPSS/CVSS data and linked threat actors.
router.get("/findings/:id/threat-intel", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [f] = await db.select().from(findingsTable).where(and(eq(findingsTable.id, id), eq(findingsTable.userId, req.user!.sub)));
  if (!f) { res.status(404).json({ error: "Not found" }); return; }

  const intel = await enrich({ cve: f.cve ?? null, mitreId: f.mitreId, cvss: f.cvss ?? null });
  res.json({
    enabled: true,
    cve: f.cve ?? null,
    knownExploited: intel.knownExploited,
    epssScore: intel.epssScore,
    epssPercentile: intel.epssPercentile,
    cvssBaseScore: intel.cvssBaseScore,
    cvssBaseSeverity: intel.cvssBaseSeverity,
    threatActors: intel.threatActors,
    priority: intel.priority,
    confidence: intel.confidence,
    retrievedAt: intel.retrievedAt,
  });
});

// GET /api/findings/:id/defenses — compliance mapping & Nginx/Cloudflare/Sigma defense rules.
router.get("/findings/:id/defenses", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [f] = await db.select().from(findingsTable).where(and(eq(findingsTable.id, id), eq(findingsTable.userId, req.user!.sub)));
  if (!f) { res.status(404).json({ error: "Not found" }); return; }

  const [asset] = await db.select({ target: assetsTable.target }).from(assetsTable).where(eq(assetsTable.id, f.assetId));
  const defense = buildBlueTeamDefense({
    id: f.id,
    title: f.title,
    severity: f.severity,
    category: f.category,
    mitreId: f.mitreId,
    mitreTactic: f.mitreTactic,
    mitreTechnique: f.mitreTechnique,
    cve: f.cve ?? null,
    target: asset?.target ?? null,
  });

  res.json({
    findingId: f.id,
    ...defense,
  });
});

// POST /api/findings/:id/verify — one-click live re-test to verify remediation.
router.post("/findings/:id/verify", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [f] = await db.select().from(findingsTable).where(and(eq(findingsTable.id, id), eq(findingsTable.userId, req.user!.sub)));
  if (!f) { res.status(404).json({ error: "Not found" }); return; }

  const [asset] = await db.select().from(assetsTable).where(and(eq(assetsTable.id, f.assetId), eq(assetsTable.userId, req.user!.sub)));
  if (!asset) { res.status(404).json({ error: "Associated target not found" }); return; }

  try {
    const fresh = await runServerlessScan(asset.target);
    const matched = fresh.findings.find(
      (raw) =>
        raw.title === f.title ||
        (f.cve !== null && raw.cve === f.cve) ||
        (raw.category === f.category && raw.target === asset.target && raw.title === f.title),
    );
    const checkedAt = new Date();

    if (!matched) {
      const noteLine = `[Verified fixed by live re-test at ${checkedAt.toISOString()}]`;
      const nextNotes = f.notes ? `${f.notes}\n${noteLine}` : noteLine;
      await db
        .update(findingsTable)
        .set({ status: "resolved", resolvedAt: checkedAt, notes: nextNotes })
        .where(and(eq(findingsTable.id, f.id), eq(findingsTable.userId, req.user!.sub)));

      await db.insert(activityTable).values({
        userId: req.user!.sub,
        type: "finding_resolved",
        title: `Verified fix: ${f.title}`,
        description: `Live re-test confirmed the weakness is no longer present on ${asset.target}.`,
        severity: "info",
      });

      res.json({
        verified: true,
        status: "resolved",
        checkedAt: checkedAt.toISOString(),
        message: "Live re-test confirmed this issue is resolved.",
      });
      return;
    }

    const noteLine = `[Re-tested at ${checkedAt.toISOString()}: still present]`;
    const nextNotes = f.notes ? `${f.notes}\n${noteLine}` : noteLine;
    await db
      .update(findingsTable)
      .set({ notes: nextNotes })
      .where(and(eq(findingsTable.id, f.id), eq(findingsTable.userId, req.user!.sub)));

    res.json({
      verified: false,
      status: f.status,
      checkedAt: checkedAt.toISOString(),
      message: "Live re-test still observed this weakness on the target.",
      evidence: matched.evidence,
    });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Live verification scan failed.",
    });
  }
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
    .where(and(eq(findingsTable.id, paramParsed.data.id), eq(findingsTable.userId, req.user!.sub)))
    .returning();
  if (!f) { res.status(404).json({ error: "Not found" }); return; }
  const assetMap = await getAssetMap(req.user!.sub);
  res.json(UpdateFindingResponse.parse(serializeFinding(f, assetMap.get(f.assetId) ?? "Unknown")));
});

export default router;
