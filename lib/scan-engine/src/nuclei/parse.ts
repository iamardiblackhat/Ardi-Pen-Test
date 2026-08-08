import { mapToMitre } from "../mitre";
import { ScanEngineError, type RawFinding, type Severity } from "../types";

/**
 * Nuclei JSONL parser.
 *
 * Nuclei's `-jsonl` output is one JSON object per line. That format is chosen
 * precisely so a consumer can survive partial output, and this parser honours
 * that: **a malformed line is counted and skipped, never thrown.** A scan that
 * ran for forty minutes and hit one truncated line — because the process was
 * killed, the disk filled, or a template emitted a NaN — must still yield its
 * other 300 findings. Throwing away the whole run is the expensive failure.
 *
 * Every field here originates in a template plus a response from the scanned
 * host, so all of it is untrusted: types are checked rather than assumed, and
 * text is length-capped before it reaches the database.
 */

/** Nuclei's own severity vocabulary, mapped onto the app's five values. */
const SEVERITY_MAP: Readonly<Record<string, Severity>> = Object.freeze({
  critical: "critical",
  high: "high",
  medium: "medium",
  moderate: "medium",
  low: "low",
  info: "info",
  informational: "info",
  // Nuclei emits `unknown` for templates with no declared severity. Mapping it
  // to `info` rather than dropping the finding keeps it visible for triage
  // without letting an unscored template masquerade as urgent.
  unknown: "info",
});

const MAX_LINE_LENGTH = 512 * 1024;
const MAX_TEXT_LENGTH = 4096;
const MAX_EVIDENCE_LENGTH = 8192;
const MAX_REFERENCES = 20;

export interface NucleiParseError {
  /** 1-based line number, so it matches what an operator sees in an editor. */
  readonly line: number;
  readonly reason: string;
  /** First 200 characters of the offending line, for debugging. */
  readonly excerpt: string;
}

export interface NucleiParseResult {
  readonly findings: readonly RawFinding[];
  /** Lines seen, excluding blank ones. */
  readonly total: number;
  readonly parsed: number;
  readonly skipped: number;
  readonly errors: readonly NucleiParseError[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Sanitise and cap a string field. Returns null for anything non-string or empty. */
function text(value: unknown, max = MAX_TEXT_LENGTH): string | null {
  if (typeof value !== "string") return null;
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    const isControl =
      (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
      code === 0x7f;
    out += isControl ? " " : ch;
  }
  out = out.trim();
  if (out.length === 0) return null;
  return out.length > max ? `${out.slice(0, max)}…` : out;
}

/**
 * Nuclei is inconsistent about singular-vs-array: `info.reference` and
 * `classification.cve-id` are arrays in most templates and bare strings in
 * older ones. Normalise both shapes rather than picking one and losing data.
 */
function stringList(value: unknown, limit: number): string[] {
  if (typeof value === "string") {
    const one = text(value);
    return one === null ? [] : [one];
  }
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (out.length >= limit) break;
    const clean = text(item);
    if (clean !== null) out.push(clean);
  }
  return out;
}

/** Accept a CVE only in canonical form; nuclei occasionally carries junk here. */
function normaliseCve(value: string | undefined): string | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  return /^CVE-\d{4}-\d{4,7}$/.test(upper) ? upper : null;
}

/**
 * Clamp CVSS to the defined 0.0–10.0 range.
 *
 * Nuclei passes `cvss-score` through from the template with no validation, and
 * `real` in Postgres will happily store a 9000 that then renders as a nonsense
 * risk number. Out-of-range values become null — an absent score is honest,
 * an impossible one is not.
 */
function normaliseCvss(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n < 0 || n > 10) return null;
  return Math.round(n * 10) / 10;
}

/** Derive a coarse category from the nuclei result type and tags. */
function categorise(type: string | null, tags: readonly string[]): string {
  if (tags.some((t) => t === "ssl" || t === "tls")) return "tls";
  if (tags.some((t) => t.includes("misconfig"))) return "misconfiguration";
  if (tags.some((t) => t.includes("exposure") || t.includes("disclosure"))) {
    return "exposure";
  }
  switch (type) {
    case "http":
      return "web";
    case "dns":
      return "dns";
    case "network":
    case "tcp":
      return "network";
    case "ssl":
      return "tls";
    case "file":
      return "file";
    default:
      return "other";
  }
}

/**
 * Parse nuclei JSONL into findings.
 *
 * @param jsonl raw stdout from `nuclei -jsonl`.
 * @throws {ScanEngineError} only when `jsonl` is not a string. Bad *lines* are
 * reported through `errors`/`skipped`, never thrown — see the module comment.
 */
export function parseNucleiJsonl(jsonl: string): NucleiParseResult {
  if (typeof jsonl !== "string") {
    throw new ScanEngineError("nuclei output must be a string.", {
      code: "parse_error",
    });
  }

  const findings: RawFinding[] = [];
  const errors: NucleiParseError[] = [];
  let total = 0;
  let skipped = 0;

  // Split on \n and strip a trailing \r so Windows-produced files parse. Do not
  // split on \r alone: response bodies embedded in the JSON contain bare \r.
  const lines = jsonl.split("\n");

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index]!.replace(/\r$/, "");
    if (raw.trim().length === 0) continue;
    total++;

    const lineNumber = index + 1;
    const excerpt = raw.slice(0, 200);

    if (raw.length > MAX_LINE_LENGTH) {
      skipped++;
      errors.push({
        line: lineNumber,
        reason: `Line exceeds ${MAX_LINE_LENGTH} bytes.`,
        excerpt,
      });
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (cause) {
      skipped++;
      errors.push({
        line: lineNumber,
        reason: `Invalid JSON: ${cause instanceof Error ? cause.message : String(cause)}`,
        excerpt,
      });
      continue;
    }

    const finding = toFinding(parsed);
    if (finding === null) {
      skipped++;
      errors.push({
        line: lineNumber,
        reason: "JSON parsed but is not a nuclei result (no info.name or template-id).",
        excerpt,
      });
      continue;
    }
    findings.push(finding);
  }

  return {
    findings,
    total,
    parsed: findings.length,
    skipped,
    errors,
  };
}

/** Convert one already-parsed JSON value into a RawFinding, or null if unusable. */
function toFinding(value: unknown): RawFinding | null {
  if (!isRecord(value)) return null;

  const info = isRecord(value["info"]) ? value["info"] : {};
  const templateId = text(value["template-id"], 256);
  const name = text(info["name"], 512);

  // A result with neither a template ID nor a name cannot be attributed to
  // anything, and an unattributable finding is not actionable.
  if (templateId === null && name === null) return null;

  const classification = isRecord(info["classification"])
    ? info["classification"]
    : {};

  const severityKey = (text(info["severity"]) ?? "unknown").toLowerCase();
  const severity: Severity = SEVERITY_MAP[severityKey] ?? "info";

  const tags = stringList(info["tags"], 32).map((t) => t.toLowerCase());
  const cve = normaliseCve(stringList(classification["cve-id"], 5)[0]);
  const cvss = normaliseCvss(classification["cvss-score"]);

  const matchedAt = text(value["matched-at"], 1024);
  const host = text(value["host"], 512);
  const ip = text(value["ip"], 64);
  const type = text(value["type"], 64);

  const references = stringList(info["reference"], MAX_REFERENCES).filter((r) =>
    /^https?:\/\//i.test(r),
  );

  const description =
    text(info["description"]) ??
    `Nuclei template ${templateId ?? name} matched on ${matchedAt ?? host ?? "the target"}.`;

  const remediation =
    text(info["remediation"]) ??
    (cve
      ? `Apply the vendor patch for ${cve}, or remove the affected component from ` +
        `internet-facing exposure until it can be patched.`
      : `Review the finding against the referenced template and remove or ` +
        `reconfigure the affected component.`);

  const extracted = stringList(value["extracted-results"], 10);
  const evidence = text(
    [
      matchedAt ? `matched-at=${matchedAt}` : null,
      ip ? `ip=${ip}` : null,
      text(value["matcher-name"], 128)
        ? `matcher=${text(value["matcher-name"], 128)}`
        : null,
      extracted.length > 0 ? `extracted=${extracted.join(", ")}` : null,
      tags.length > 0 ? `tags=${tags.join(",")}` : null,
    ]
      .filter((v): v is string => v !== null)
      .join(" "),
    MAX_EVIDENCE_LENGTH,
  );

  // Signals are ordered most-specific-first: explicit tags beat the template
  // ID, which beats the broad result type.
  const mitre = mapToMitre([...tags, templateId ?? "", type ?? ""]);

  const target = matchedAt ?? host ?? ip ?? "unknown";

  return {
    title: name ?? templateId!,
    severity,
    category: categorise(type, tags),
    source: "nuclei",
    target,
    cve,
    cvss,
    mitre,
    description,
    remediation,
    evidence,
    references,
    // Template + location, not the whole result: nuclei re-reports the same
    // issue with a different timestamp and curl-command on every run, and a
    // fingerprint that included those would defeat deduplication entirely.
    fingerprint: `nuclei:${templateId ?? name}:${target}`,
  };
}
