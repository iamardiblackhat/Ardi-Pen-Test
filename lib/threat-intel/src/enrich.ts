import { OpenCtiClient } from "./opencti/client";
import {
  ATTACK_PATTERN_BY_MITRE_ID,
  THREATS_RELATED_TO_ENTITY,
  VULNERABILITIES_BY_NAMES,
  VULNERABILITY_BY_NAME,
} from "./opencti/queries";
import {
  filterGroup,
  OpenCtiError,
  type OpenCtiAttackPattern,
  type OpenCtiThreatRef,
  type OpenCtiVulnerability,
} from "./opencti/types";

const CVE_PATTERN = /^CVE-\d{4}-\d{4,7}$/i;
const MITRE_TECHNIQUE_PATTERN = /^T\d{4}(?:\.\d{3})?$/i;

/** Entity types on the `from` side of a relationship we consider a threat. */
const THREAT_ENTITY_TYPES = new Set(["Intrusion-Set", "Campaign", "Malware"]);

/**
 * Threat context attached to a finding. Every field is nullable on purpose:
 * OpenCTI having no record of a CVE is normal and must never be presented as
 * "not exploited". See `confidence` below.
 */
export interface ThreatContext {
  cve: string | null;
  /** True only when CISA lists the CVE as known-exploited. */
  knownExploited: boolean;
  /** EPSS probability of exploitation in the next 30 days, 0.0–1.0. */
  epssScore: number | null;
  epssPercentile: number | null;
  cvssBaseScore: number | null;
  cvssBaseSeverity: string | null;
  technique: {
    mitreId: string;
    name: string;
    detection: string | null;
    platforms: string[];
    killChainPhases: string[];
  } | null;
  /** Threat actors, campaigns, and malware families linked to this CVE. */
  threatActors: { name: string; type: string; aliases: string[] }[];
  /**
   * `matched`   — OpenCTI had a record and we used it.
   * `no-record` — OpenCTI answered, but knows nothing about this CVE.
   * `unavailable` — OpenCTI could not be reached; treat as unknown, not clean.
   */
  confidence: "matched" | "no-record" | "unavailable";
  retrievedAt: string;
}

export function emptyContext(
  cve: string | null,
  confidence: ThreatContext["confidence"],
): ThreatContext {
  return {
    cve,
    knownExploited: false,
    epssScore: null,
    epssPercentile: null,
    cvssBaseScore: null,
    cvssBaseSeverity: null,
    technique: null,
    threatActors: [],
    confidence,
    retrievedAt: new Date().toISOString(),
  };
}

/**
 * Validate before querying. A CVE ID arriving from scanner output is untrusted
 * input; rejecting anything that is not exactly `CVE-YYYY-NNNN` here means
 * malformed values never reach OpenCTI at all.
 */
export function isValidCve(value: string): boolean {
  return CVE_PATTERN.test(value);
}

export function isValidTechniqueId(value: string): boolean {
  return MITRE_TECHNIQUE_PATTERN.test(value);
}

export interface EnrichInput {
  cve?: string | null;
  mitreId?: string | null;
}

/**
 * Enrich a single finding with live threat intelligence.
 *
 * Never throws on an OpenCTI outage — returns `confidence: "unavailable"` so
 * the caller can render "threat intel unavailable" instead of the far more
 * dangerous "no known exploitation".
 */
export async function enrichFinding(
  client: OpenCtiClient,
  input: EnrichInput,
): Promise<ThreatContext> {
  const cve = input.cve && isValidCve(input.cve) ? input.cve.toUpperCase() : null;
  const mitreId =
    input.mitreId && isValidTechniqueId(input.mitreId)
      ? input.mitreId.toUpperCase()
      : null;

  if (!cve && !mitreId) return emptyContext(null, "no-record");

  try {
    const [vulnerability, technique] = await Promise.all([
      cve ? fetchVulnerability(client, cve) : Promise.resolve(null),
      mitreId ? fetchAttackPattern(client, mitreId) : Promise.resolve(null),
    ]);

    const threatActors = vulnerability
      ? await fetchRelatedThreats(client, vulnerability.id)
      : [];

    const context = emptyContext(cve, vulnerability || technique ? "matched" : "no-record");

    if (vulnerability) {
      context.knownExploited = vulnerability.x_opencti_cisa_kev === true;
      context.epssScore = vulnerability.x_opencti_epss_score;
      context.epssPercentile = vulnerability.x_opencti_epss_percentile;
      context.cvssBaseScore = vulnerability.x_opencti_cvss_base_score;
      context.cvssBaseSeverity = vulnerability.x_opencti_cvss_base_severity;
    }

    if (technique) {
      context.technique = {
        mitreId: technique.x_mitre_id ?? mitreId ?? "",
        name: technique.name,
        detection: technique.x_mitre_detection,
        platforms: technique.x_mitre_platforms ?? [],
        killChainPhases: (technique.killChainPhases ?? []).map((p) => p.phase_name),
      };
    }

    context.threatActors = threatActors;
    return context;
  } catch (error) {
    if (error instanceof OpenCtiError) return emptyContext(cve, "unavailable");
    throw error;
  }
}

/**
 * Batch-enrich a scan's worth of findings.
 *
 * Deduplicates CVEs first — a scan routinely reports the same CVE across many
 * hosts, and issuing one OpenCTI round trip per finding is how you get rate
 * limited by your own threat-intel platform.
 */
export async function enrichFindings(
  client: OpenCtiClient,
  inputs: EnrichInput[],
): Promise<Map<string, ThreatContext>> {
  const results = new Map<string, ThreatContext>();

  const uniqueCves = [
    ...new Set(
      inputs
        .map((i) => i.cve)
        .filter((c): c is string => typeof c === "string" && isValidCve(c))
        .map((c) => c.toUpperCase()),
    ),
  ];

  if (uniqueCves.length === 0) return results;

  let vulnerabilities: OpenCtiVulnerability[];
  try {
    const data = await client.request<{
      vulnerabilities: { edges: { node: OpenCtiVulnerability }[] };
    }>(VULNERABILITIES_BY_NAMES, {
      filters: filterGroup("name", uniqueCves),
      first: uniqueCves.length,
    });
    vulnerabilities = data.vulnerabilities.edges.map((e) => e.node);
  } catch (error) {
    if (!(error instanceof OpenCtiError)) throw error;
    for (const cve of uniqueCves) results.set(cve, emptyContext(cve, "unavailable"));
    return results;
  }

  const byName = new Map(vulnerabilities.map((v) => [v.name.toUpperCase(), v]));

  for (const cve of uniqueCves) {
    const vulnerability = byName.get(cve);
    if (!vulnerability) {
      results.set(cve, emptyContext(cve, "no-record"));
      continue;
    }

    const context = emptyContext(cve, "matched");
    context.knownExploited = vulnerability.x_opencti_cisa_kev === true;
    context.epssScore = vulnerability.x_opencti_epss_score;
    context.epssPercentile = vulnerability.x_opencti_epss_percentile;
    context.cvssBaseScore = vulnerability.x_opencti_cvss_base_score;
    context.cvssBaseSeverity = vulnerability.x_opencti_cvss_base_severity;
    context.threatActors = await fetchRelatedThreats(client, vulnerability.id);
    results.set(cve, context);
  }

  return results;
}

/**
 * Real-world exploitation should outrank raw CVSS when ordering remediation
 * work. A CVSS 7.5 on CISA's KEV list is a fire; a CVSS 9.8 with an EPSS of
 * 0.0001 and no known actor is paperwork. Returns 0–100.
 */
export function priorityScore(context: ThreatContext, baseCvss: number | null): number {
  const cvss = context.cvssBaseScore ?? baseCvss ?? 0;
  let score = cvss * 6; // 0–60

  if (context.knownExploited) score += 30;
  if (context.epssScore !== null) score += context.epssScore * 20;
  if (context.threatActors.length > 0) score += 8;

  return Math.round(Math.min(100, score));
}

async function fetchVulnerability(
  client: OpenCtiClient,
  cve: string,
): Promise<OpenCtiVulnerability | null> {
  const data = await client.request<{
    vulnerabilities: { edges: { node: OpenCtiVulnerability }[] };
  }>(VULNERABILITY_BY_NAME, { filters: filterGroup("name", [cve]) });

  return data.vulnerabilities.edges[0]?.node ?? null;
}

async function fetchAttackPattern(
  client: OpenCtiClient,
  mitreId: string,
): Promise<OpenCtiAttackPattern | null> {
  const data = await client.request<{
    attackPatterns: { edges: { node: OpenCtiAttackPattern }[] };
  }>(ATTACK_PATTERN_BY_MITRE_ID, { filters: filterGroup("x_mitre_id", [mitreId]) });

  return data.attackPatterns.edges[0]?.node ?? null;
}

async function fetchRelatedThreats(
  client: OpenCtiClient,
  entityId: string,
): Promise<ThreatContext["threatActors"]> {
  try {
    const data = await client.request<{
      stixCoreRelationships: {
        edges: { node: { from: OpenCtiThreatRef | null } }[];
      };
    }>(THREATS_RELATED_TO_ENTITY, { toId: entityId, first: 25 });

    const seen = new Set<string>();
    const actors: ThreatContext["threatActors"] = [];

    for (const edge of data.stixCoreRelationships.edges) {
      const from = edge.node.from;
      if (!from || !THREAT_ENTITY_TYPES.has(from.entity_type)) continue;
      if (seen.has(from.id)) continue;
      seen.add(from.id);
      actors.push({
        name: from.name,
        type: from.entity_type,
        aliases: from.aliases ?? [],
      });
    }

    return actors;
  } catch (error) {
    // Relationship traversal is the slowest call and the least critical —
    // degrade to "no actors known" rather than failing the whole enrichment.
    if (error instanceof OpenCtiError) return [];
    throw error;
  }
}
