import {
  OpenCtiClient,
  loadThreatIntelConfig,
  enrichFinding,
  priorityScore,
  emptyContext,
  loadIntelligenceFeed,
  type IntelligenceFeed,
  type ThreatContext,
} from "@workspace/threat-intel";
import { logger } from "./logger";
import { getEpss, getKevMap } from "./public-vuln-intel";

/**
 * Thin app-side wrapper over lib/threat-intel.
 *
 * The library was built and tested but never connected to a route — this file
 * is the connection. It reads config once, holds a single client, and exposes
 * `enrich()` for the findings route to call.
 *
 * OpenCTI is optional: with no OPENCTI_URL configured, `enrich()` returns an
 * honest "unavailable" context rather than failing. The finding still works;
 * it just carries no live threat intel.
 */

const config = loadThreatIntelConfig();
const client = config.enabled
  ? new OpenCtiClient({ url: config.url!, token: config.token!, timeoutMs: config.timeoutMs })
  : null;

if (config.enabled) {
  logger.info({ endpoint: config.url }, "OpenCTI threat intel enabled");
} else {
  logger.info("OpenCTI threat intel not configured (set OPENCTI_URL + OPENCTI_TOKEN to enable)");
}

export function threatIntelEnabled(): boolean {
  return config.enabled;
}

export function threatIntelPlatformUrl(): string | null {
  return config.url;
}

export async function getThreatIntelHealth(): Promise<{ version: string; supported: boolean }> {
  if (!client) throw new Error("Threat intelligence is not configured.");
  return client.healthCheck();
}

export async function getIntelligenceFeed(options: {
  search?: string;
  firstPerType?: number;
} = {}): Promise<IntelligenceFeed> {
  if (!client) throw new Error("Threat intelligence is not configured.");
  return loadIntelligenceFeed(client, options);
}

export interface EnrichedThreat extends ThreatContext {
  /** 0–100, exploitation-weighted. Higher = fix sooner. */
  priority: number;
}

/**
 * Enrich one finding's CVE/technique with live threat intelligence.
 * Never throws — an OpenCTI outage yields `confidence: "unavailable"`.
 */
export async function enrich(input: {
  cve: string | null;
  mitreId: string | null;
  cvss: number | null;
}): Promise<EnrichedThreat> {
  let ctx: ThreatContext;
  if (client) {
    ctx = await enrichFinding(client, {
      cve: input.cve,
      mitreId: input.mitreId === "unmapped" ? null : input.mitreId,
    });
  } else {
    ctx = emptyContext(input.cve, "no-record");
  }

  // Fill KEV / EPSS gaps from the authoritative public feeds (CISA + FIRST).
  if (input.cve) {
    const cve = input.cve.toUpperCase();
    const [kev, epss] = await Promise.all([getKevMap(), getEpss([cve])]);
    if (!kev && epss.size === 0 && !client) {
      ctx = emptyContext(input.cve, "unavailable");
    } else {
      if (kev?.has(cve)) ctx.knownExploited = true;
      const score = epss.get(cve);
      if (score && ctx.epssScore === null) {
        ctx.epssScore = score.epss;
        ctx.epssPercentile = score.percentile;
      }
      if (ctx.knownExploited || ctx.epssScore !== null) ctx.confidence = "matched";
    }
  }
  return { ...ctx, priority: priorityScore(ctx, input.cvss) };
}
