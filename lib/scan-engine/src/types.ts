/**
 * Core contracts for the scan engine.
 *
 * The engine layer is deliberately split from the *parsing* layer: an engine
 * knows how to invoke a scanner and stream results, a parser knows how to turn
 * that scanner's output bytes into `RawFinding`s. Everything here is the seam
 * between them, plus the shapes that cross into the persistence layer.
 *
 * `RawFinding` is intentionally close to — but not identical to — the `findings`
 * table in `@workspace/db`. The differences are all "the parser cannot know
 * this": `assetId` and `scanId` are assigned by the caller that owns the scan,
 * and `mitre` may be `null` here where the column is `NOT NULL`. Guessing a
 * MITRE technique is worse than admitting we do not have one, so the mapping
 * returns null and the caller applies `FALLBACK_MITRE` (or drops the finding).
 */

/** Severity values the app persists. Mirrors `findings.severity`. */
export type Severity = "critical" | "high" | "medium" | "low" | "info";

/** Ordering used for sorting and for "worst severity" rollups. */
export const SEVERITY_RANK: Readonly<Record<Severity, number>> = Object.freeze({
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
});

/**
 * A validated scan target.
 *
 * Always a discriminated union, never a bare string. The whole point of
 * `parseTarget` is that a value of this type has *already* been proven free of
 * shell metacharacters, argument-injection prefixes and SSRF-into-metadata
 * addresses; passing strings around would let an unvalidated one sneak into an
 * argv array at a call site nobody reviewed.
 */
export type ScanTarget =
  | {
      readonly kind: "hostname";
      /** Lower-cased, RFC 1123 valid hostname. Safe to place in argv. */
      readonly value: string;
      /** Exactly what the user typed, for display and audit only. */
      readonly input: string;
    }
  | {
      readonly kind: "ipv4";
      readonly value: string;
      readonly octets: readonly [number, number, number, number];
      readonly input: string;
    }
  | {
      readonly kind: "cidr";
      /** Normalised `network/prefix`, e.g. `192.0.2.0/24`. */
      readonly value: string;
      readonly network: string;
      readonly prefix: number;
      /** Number of addresses in the block, for scan-budget estimation. */
      readonly size: number;
      readonly input: string;
    }
  | {
      readonly kind: "url";
      /** Normalised absolute URL with no query or fragment. */
      readonly value: string;
      readonly scheme: "http" | "https";
      /** Host component — itself a validated hostname or IPv4 literal. */
      readonly host: string;
      readonly port: number | null;
      readonly path: string;
      readonly input: string;
    };

/** Scan aggressiveness. Maps onto scanner flag sets at the adapter layer. */
export type ScanProfile = "quick" | "standard" | "deep";

export interface ScanConfig {
  readonly profile: ScanProfile;
  /**
   * Port specification in nmap syntax (`80,443,8000-8100`). Validate with
   * `parsePortSpec` before it reaches argv — it is user input too.
   */
  readonly ports?: string;
  /** Wall-clock budget for the whole scan. */
  readonly timeoutMs: number;
  /** Parallel probes. Engines should treat this as an upper bound, not a goal. */
  readonly maxConcurrency?: number;
  /** Requests per second ceiling, for staying inside a client's rate limits. */
  readonly rateLimit?: number;
  /**
   * Opt-in to scanning RFC 1918 / loopback / link-local space.
   *
   * Off by default. On-prem engagements legitimately need it; SaaS scans of
   * customer-supplied targets must not have it, or the scanner becomes an SSRF
   * proxy into its own cloud metadata service.
   */
  readonly allowPrivateRanges?: boolean;
  /** Nuclei template IDs or tags to restrict the run to. */
  readonly templates?: readonly string[];
}

/** MITRE ATT&CK attribution for a finding. */
export interface MitreMapping {
  /** Technique or sub-technique ID, e.g. `T1190` or `T1059.007`. */
  readonly id: string;
  /** Tactic display name, e.g. `Initial Access`. */
  readonly tactic: string;
  /** Technique display name, e.g. `Exploit Public-Facing Application`. */
  readonly technique: string;
}

/**
 * A finding as produced by a parser, before it is tied to an asset/scan row.
 *
 * `fingerprint` is a stable, human-readable dedupe key rather than a hash:
 * findings get re-discovered on every scan and the caller needs to recognise
 * "same issue, seen again" without re-reading every field. Readable beats
 * opaque here because these end up in support tickets.
 */
export interface RawFinding {
  readonly title: string;
  readonly severity: Severity;
  /** Coarse bucket, e.g. `network`, `web`, `tls`, `exposure`. */
  readonly category: string;
  /** Which tool produced it. */
  readonly source: "nmap" | "nuclei";
  /** The specific host/port/URL this was observed on. */
  readonly target: string;
  readonly cve: string | null;
  /** CVSS base score 0.0–10.0, or null when the tool did not supply one. */
  readonly cvss: number | null;
  /** Null when unmapped — see the module doc-comment. */
  readonly mitre: MitreMapping | null;
  readonly description: string;
  readonly remediation: string;
  /** Raw observed proof: banner, matched request, matcher name. */
  readonly evidence: string | null;
  readonly references: readonly string[];
  readonly fingerprint: string;
}

/**
 * Applied by the persistence layer when `RawFinding.mitre` is null, because
 * `findings.mitre_id` is `NOT NULL`. Kept explicit and obviously-not-a-real-
 * technique so an unmapped finding is visible in the UI instead of being
 * quietly filed under a plausible-looking wrong technique.
 */
export const FALLBACK_MITRE: MitreMapping = Object.freeze({
  id: "unmapped",
  tactic: "Unmapped",
  technique: "Unmapped",
});

/** Progress callback. `pct` is 0–100 and must be monotonically non-decreasing. */
export type ProgressCallback = (pct: number, message: string) => void;

/**
 * A scanner adapter.
 *
 * `run` returns an async iterable so findings surface as the tool emits them —
 * a deep scan can run for an hour, and the UI should not wait for the last
 * packet to show the first open port. Implementations must stop cleanly when
 * the consumer breaks out of the loop (i.e. on `return()`), killing the child
 * process rather than leaking it.
 */
export interface ScanEngine {
  /** Stable identifier, e.g. `nmap` or `nuclei`. */
  readonly name: string;
  run(
    target: string,
    config: ScanConfig,
    onProgress: ProgressCallback,
  ): AsyncIterable<RawFinding>;
}

/** Why a `ScanEngineError` was raised. Callers switch on this, not on message text. */
export type ScanEngineErrorCode =
  | "invalid_target"
  | "invalid_config"
  | "parse_error"
  /** The scanner binary is not installed or not on PATH. Actionable by an
   *  operator (install it), unlike `tool_failed` which is a runtime fault. */
  | "tool_missing"
  | "tool_failed"
  | "timeout"
  | "cancelled";

export class ScanEngineError extends Error {
  readonly code: ScanEngineErrorCode;
  /** The offending input, truncated — never interpolate this into a shell. */
  readonly input: string | null;

  constructor(
    message: string,
    options: {
      code?: ScanEngineErrorCode;
      input?: string | null;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ScanEngineError";
    this.code = options.code ?? "tool_failed";
    this.input =
      typeof options.input === "string"
        ? options.input.slice(0, 200)
        : (options.input ?? null);
  }
}
