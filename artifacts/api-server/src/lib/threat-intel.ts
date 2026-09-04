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
  if (!client) {
    const ctx = emptyContext(input.cve, "unavailable");
    return { ...ctx, priority: priorityScore(ctx, input.cvss) };
  }

  const ctx = await enrichFinding(client, {
    cve: input.cve,
    mitreId: input.mitreId === "unmapped" ? null : input.mitreId,
  });
  return { ...ctx, priority: priorityScore(ctx, input.cvss) };
}
