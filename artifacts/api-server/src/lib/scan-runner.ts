import { db, assetsTable, scansTable, findingsTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  runNmap,
  runNuclei,
  ScanEngineError,
  FALLBACK_MITRE,
  type RawFinding,
} from "@workspace/scan-engine";
import { logger } from "./logger";
import {
  cyberStrikeConfigured,
  cyberStrikeHealthy,
  runCyberStrikeScan,
  type CyberStrikeVuln,
} from "./cyberstrike";

/** Map a CyberStrike vulnerability onto Ardi's RawFinding shape. */
function cyberStrikeToRaw(v: CyberStrikeVuln, target: string): RawFinding {
  const remediation = v.recommendation ?? "Review and remediate per the evidence below.";
  const evidenceParts = [
    v.attack_vector && `Attack vector: ${v.attack_vector}`,
    v.endpoint && `Endpoint: ${v.endpoint}`,
    v.steps_to_reproduce && `Steps: ${v.steps_to_reproduce}`,
    v.poc && `PoC: ${v.poc}`,
    v.business_impact && `Impact: ${v.business_impact}`,
  ].filter(Boolean);
  return {
    title: v.title,
    severity: v.severity,
    category: "web",
    source: "nuclei", // schema's source enum; CyberStrike is a scanner source
    target: v.endpoint ?? target,
    cve: null,
    cvss: null,
    mitre: null,
    description: v.description ?? v.title,
    remediation,
    evidence: evidenceParts.join(" | ") || null,
    references: v.cwe_id ? [`https://cwe.mitre.org/data/definitions/${v.cwe_id.replace(/\D/g, "")}.html`] : [],
    fingerprint: `cyberstrike:${target}:${v.id}`,
  };
}

/**
 * Executes a scan for real: spawns the scanners, streams progress into the
 * database, and persists findings.
 *
 * Runs in-process for now. That is a deliberate, documented limitation: a
 * server restart mid-scan orphans the scan in `running`, which is why
 * `reconcileOrphanedScans()` exists below and runs at boot. The next step is a
 * durable queue (pg-boss on the existing Postgres), at which point this
 * function becomes the job handler unchanged.
 */

/** Scans currently executing in this process, so a scan cannot start twice. */
const inFlight = new Map<number, AbortController>();

export function isScanRunning(scanId: number): boolean {
  return inFlight.has(scanId);
}

export function cancelScan(scanId: number): boolean {
  const controller = inFlight.get(scanId);
  if (!controller) return false;
  controller.abort();
  return true;
}

async function setProgress(scanId: number, progress: number): Promise<void> {
  await db
    .update(scansTable)
    .set({ progress: Math.max(0, Math.min(100, Math.round(progress))) })
    .where(eq(scansTable.id, scanId));
}

async function persistFindings(
  scanId: number,
  assetId: number,
  findings: readonly RawFinding[],
): Promise<number> {
  if (findings.length === 0) return 0;

  // De-duplicate within the run. The same issue on the same host/port is one
  // finding, not one per template that happened to match it.
  const seen = new Set<string>();
  const rows = [];

  for (const f of findings) {
    if (seen.has(f.fingerprint)) continue;
    seen.add(f.fingerprint);
    rows.push({
      title: f.title,
      severity: f.severity,
      status: "open" as const,
      category: f.category,
      assetId,
      scanId,
      cve: f.cve,
      cvss: f.cvss,
      // Never guess a technique — an invented ID corrupts the client's
      // ATT&CK coverage metrics. See lib/scan-engine/src/mitre.ts.
      mitreId: f.mitre?.id ?? FALLBACK_MITRE.id,
      mitreTactic: f.mitre?.tactic ?? FALLBACK_MITRE.tactic,
      mitreTechnique: f.mitre?.technique ?? FALLBACK_MITRE.technique,
      description: f.description,
      remediation: f.remediation,
      evidence: f.evidence,
    });
  }

  await db.insert(findingsTable).values(rows);
  return rows.length;
}

export interface StartScanResult {
  started: boolean;
  reason?: string;
}

/**
 * Kicks off a scan. Returns immediately; the scan continues in the background.
 * Never throws — a scanner failure marks the scan `failed` and is recorded,
 * because an unhandled rejection here would take down the API server.
 */
export function startScan(scanId: number): StartScanResult {
  if (inFlight.has(scanId)) {
    return { started: false, reason: "Scan is already running." };
  }

  const controller = new AbortController();
  inFlight.set(scanId, controller);

  void execute(scanId, controller)
    .catch((error: unknown) => {
      logger.error({ err: error, scanId }, "Scan failed unexpectedly");
    })
    .finally(() => {
      inFlight.delete(scanId);
    });

  return { started: true };
}

async function execute(scanId: number, controller: AbortController): Promise<void> {
  const startedAt = Date.now();

  const [scan] = await db.select().from(scansTable).where(eq(scansTable.id, scanId));
  if (!scan) throw new Error(`Scan ${scanId} not found`);

  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, scan.assetId));
  if (!asset) throw new Error(`Asset ${scan.assetId} not found`);

  await db
    .update(scansTable)
    .set({ status: "running", startedAt: new Date(), progress: 0 })
    .where(eq(scansTable.id, scanId));
  await db.update(assetsTable).set({ status: "scanning" }).where(eq(assetsTable.id, asset.id));

  const collected: RawFinding[] = [];

  try {
    // ── Preferred engine: CyberStrike (autonomous AI pentest) ──────────────
    // If a CyberStrike server is configured and healthy, use it as the real
    // engine. It does far more than a port+template scan.
    if (cyberStrikeConfigured() && (await cyberStrikeHealthy())) {
      logger.info({ scanId }, "using CyberStrike engine");
      const run = await runCyberStrikeScan({
        target: asset.target,
        scanName: scan.name,
        signal: controller.signal,
        onProgress: (pct, message) => {
          logger.info({ scanId, pct, message }, "scan progress");
          void setProgress(scanId, pct);
        },
      });
      collected.push(...run.vulnerabilities.map((v) => cyberStrikeToRaw(v, asset.target)));

      const written = await persistFindings(scanId, asset.id, collected);
      const critical = collected.filter((f) => f.severity === "critical").length;
      const high = collected.filter((f) => f.severity === "high").length;
      const duration = Math.round((Date.now() - startedAt) / 1000);
      await db.update(scansTable).set({
        status: "completed", completedAt: new Date(), progress: 100,
        findingsCount: written, criticalCount: critical, highCount: high, duration,
      }).where(eq(scansTable.id, scanId));
      await db.update(assetsTable).set({
        status: "active",
        riskLevel: critical > 0 ? "critical" : high > 0 ? "high" : written > 0 ? "medium" : "low",
        lastScannedAt: new Date(),
      }).where(eq(assetsTable.id, asset.id));
      await db.insert(activityTable).values({
        type: "scan_completed",
        title: `CyberStrike scan completed on ${asset.name}`,
        description: `${written} findings (${critical} critical, ${high} high) in ${duration}s`,
        severity: critical > 0 ? "critical" : high > 0 ? "high" : "info",
      });
      logger.info({ scanId, written, engine: "cyberstrike" }, "scan completed");
      return;
    }

    // ── Fallback engine: built-in nmap + nuclei ────────────────────────────
    // Port and service discovery
    const nmap = await runNmap(asset.target, {
      onProgress: (pct, message) => {
        logger.info({ scanId, pct, message }, "scan progress");
        void setProgress(scanId, pct * 0.7);
      },
    });
    collected.push(...nmap.findings);

    if (controller.signal.aborted) throw new ScanEngineError("Scan cancelled.", { code: "cancelled" });

    // ── Vulnerability templates (web targets only) ─────────────────────────
    // A bare host with no HTTP service has nothing for nuclei to test, and
    // running it anyway wastes minutes per scan.
    const hasWeb = nmap.findings.some(
      (f) => /\b(80|443|8080|8443)\/tcp\b/.test(f.target) || /http/i.test(f.evidence ?? ""),
    );

    if (hasWeb) {
      const url = asset.target.startsWith("http") ? asset.target : `http://${asset.target}`;
      try {
        const nuclei = await runNuclei(url, {
          onProgress: (pct, message) => {
            logger.info({ scanId, pct, message }, "scan progress");
            void setProgress(scanId, 70 + pct * 0.25);
          },
        });
        collected.push(...nuclei.findings);
        if (nuclei.skipped > 0) {
          logger.warn({ scanId, skipped: nuclei.skipped }, "nuclei lines skipped as malformed");
        }
      } catch (error) {
        // A missing nuclei binary must not void a successful port scan.
        if (error instanceof ScanEngineError && error.code === "tool_missing") {
          logger.warn({ scanId }, "nuclei not installed — port scan results retained");
        } else {
          throw error;
        }
      }
    }

    // ── Persist ────────────────────────────────────────────────────────────
    const written = await persistFindings(scanId, asset.id, collected);
    const critical = collected.filter((f) => f.severity === "critical").length;
    const high = collected.filter((f) => f.severity === "high").length;
    const duration = Math.round((Date.now() - startedAt) / 1000);

    await db
      .update(scansTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        progress: 100,
        findingsCount: written,
        criticalCount: critical,
        highCount: high,
        duration,
      })
      .where(eq(scansTable.id, scanId));

    await db
      .update(assetsTable)
      .set({
        status: "active",
        riskLevel: critical > 0 ? "critical" : high > 0 ? "high" : written > 0 ? "medium" : "low",
        lastScannedAt: new Date(),
      })
      .where(eq(assetsTable.id, asset.id));

    await db.insert(activityTable).values({
      type: "scan_completed",
      title: `Scan completed on ${asset.name}`,
      description: `${written} findings (${critical} critical, ${high} high) in ${duration}s`,
      severity: critical > 0 ? "critical" : high > 0 ? "high" : "info",
    });

    logger.info({ scanId, written, critical, high, duration }, "scan completed");
  } catch (error) {
    const cancelled = error instanceof ScanEngineError && error.code === "cancelled";
    const message = error instanceof Error ? error.message : String(error);

    await db
      .update(scansTable)
      .set({
        status: cancelled ? "stopped" : "failed",
        completedAt: new Date(),
        duration: Math.round((Date.now() - startedAt) / 1000),
      })
      .where(eq(scansTable.id, scanId));

    await db.update(assetsTable).set({ status: "active" }).where(eq(assetsTable.id, asset.id));

    await db.insert(activityTable).values({
      type: "scan_failed",
      title: cancelled ? `Scan stopped on ${asset.name}` : `Scan failed on ${asset.name}`,
      description: message.slice(0, 500),
      severity: "medium",
    });

    logger.error({ scanId, err: error }, "scan ended without completing");
  }
}

/**
 * Marks scans left `running` by a previous process as failed.
 *
 * Without this, a restart mid-scan leaves a row stuck at "running" forever —
 * the user watches a progress bar that will never move and has no way to retry.
 * Call once at boot, before accepting traffic.
 */
export async function reconcileOrphanedScans(): Promise<number> {
  const orphaned = await db.select().from(scansTable).where(eq(scansTable.status, "running"));
  if (orphaned.length === 0) return 0;

  for (const scan of orphaned) {
    await db
      .update(scansTable)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(scansTable.id, scan.id));
    await db
      .update(assetsTable)
      .set({ status: "active" })
      .where(eq(assetsTable.id, scan.assetId));
  }

  logger.warn({ count: orphaned.length }, "Marked orphaned scans as failed after restart");
  return orphaned.length;
}
