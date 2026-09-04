/**
 * Types mirroring the subset of the OpenCTI GraphQL schema we consume.
 *
 * Scope note: we target the OpenCTI **Community Edition** (Apache-2.0) only.
 * No Enterprise Edition entity or field is referenced here, because the EE
 * licence forbids the commercial redistribution this product needs.
 *
 * The GraphQL schema is version-sensitive — the `FilterGroup` shape below
 * landed in OpenCTI 5.12 and replaced the older flat `filters` array. Pin the
 * server version in `OPENCTI_API_VERSION` and fail loudly on mismatch rather
 * than silently returning empty enrichment.
 */

/** OpenCTI releases this client has been exercised against. */
export const SUPPORTED_OPENCTI_MAJOR = 7;

export type FilterOperator = "eq" | "not_eq" | "gt" | "lt" | "match";
export type FilterMode = "and" | "or";

export interface Filter {
  key: string[];
  values: string[];
  operator: FilterOperator;
  mode: FilterMode;
}

export interface FilterGroup {
  mode: FilterMode;
  filters: Filter[];
  filterGroups: FilterGroup[];
}

/**
 * Build a single-clause FilterGroup. OpenCTI rejects a bare `filters` array,
 * so even one-key lookups must be wrapped like this.
 */
export function filterGroup(
  key: string,
  values: string[],
  operator: FilterOperator = "eq",
): FilterGroup {
  return {
    mode: "and",
    filters: [{ key: [key], values, operator, mode: "or" }],
    filterGroups: [],
  };
}

/** An OpenCTI `Vulnerability` entity — one CVE. */
export interface OpenCtiVulnerability {
  id: string;
  standard_id: string;
  name: string;
  description: string | null;
  created: string | null;
  modified: string | null;
  /** CVSS v3 base score, 0.0–10.0. */
  x_opencti_cvss_base_score: number | null;
  x_opencti_cvss_base_severity: string | null;
  /** EPSS probability of exploitation in the next 30 days, 0.0–1.0. */
  x_opencti_epss_score: number | null;
  x_opencti_epss_percentile: number | null;
  /** Present on CISA's Known Exploited Vulnerabilities catalogue. */
  x_opencti_cisa_kev: boolean | null;
}

/** An OpenCTI `AttackPattern` entity — one MITRE ATT&CK technique. */
export interface OpenCtiAttackPattern {
  id: string;
  standard_id: string;
  name: string;
  description: string | null;
  /** e.g. "T1190". */
  x_mitre_id: string | null;
  x_mitre_platforms: string[] | null;
  x_mitre_detection: string | null;
  killChainPhases: { kill_chain_name: string; phase_name: string }[] | null;
}

/** A threat actor group (`IntrusionSet`) or `Campaign` linked to an entity. */
export interface OpenCtiThreatRef {
  id: string;
  standard_id: string;
  entity_type: string;
  name: string;
  description: string | null;
  aliases: string[] | null;
}

export type IntelligenceRecordKind =
  | "campaign"
  | "threat-actor"
  | "malware"
  | "attack-pattern"
  | "indicator"
  | "report"
  | "vulnerability";

export interface IntelligenceRecord {
  id: string;
  standardId: string;
  kind: IntelligenceRecordKind;
  name: string;
  description: string | null;
  aliases: string[];
  confidence: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  reference: string | null;
  pattern: string | null;
}

export interface IntelligenceFeed {
  generatedAt: string;
  totals: Record<IntelligenceRecordKind, number>;
  records: IntelligenceRecord[];
}

export interface GraphQLError {
  message: string;
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

/** Thrown for transport, auth, and GraphQL-level failures alike. */
export class OpenCtiError extends Error {
  readonly status: number | null;
  readonly errors: GraphQLError[];

  constructor(
    message: string,
    options: { status?: number | null; errors?: GraphQLError[]; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "OpenCtiError";
    this.status = options.status ?? null;
    this.errors = options.errors ?? [];
  }
}
