import { execFile } from "node:child_process";
import { ScanEngineError, type RawFinding, type ProgressCallback } from "../types";
import { parseTarget } from "../targets";
import { parseNucleiJsonl } from "../nuclei/parse";

/**
 * Runs nuclei for real and returns real vulnerability findings.
 *
 * Same security posture as the nmap runner: `execFile` (no shell), target
 * validated before it becomes argv, no privileges required.
 */

export interface NucleiRunOptions {
  binary?: string;
  templatesDir?: string;
  /** Severities to report. Defaults to everything except info-level noise. */
  severities?: readonly string[];
  timeoutMs?: number;
  /** Requests per second, to avoid knocking over the target. */
  rateLimit?: number;
  allowPrivateRanges?: boolean;
  onProgress?: ProgressCallback;
}

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

export async function runNuclei(
  rawTarget: string,
  options: NucleiRunOptions = {},
): Promise<{
  findings: readonly RawFinding[];
  skipped: number;
  rawJsonl: string;
  command: string;
}> {
  const binary = options.binary ?? process.env["NUCLEI_PATH"] ?? "nuclei";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const templatesDir = options.templatesDir ?? process.env["NUCLEI_TEMPLATES_DIR"];

  const target = parseTarget(rawTarget, {
    allowPrivateRanges: options.allowPrivateRanges ?? false,
  });

  // nuclei wants a URL or host; CIDR ranges are an nmap concern.
  if (target.kind === "cidr") {
    throw new ScanEngineError(
      "nuclei cannot scan a CIDR range directly. Run a port scan first and " +
        "pass each discovered host individually.",
      { code: "invalid_target" },
    );
  }

  const severities = options.severities ?? ["critical", "high", "medium", "low"];

  const args = [
    "-target", target.value,
    "-jsonl",
    "-silent",
    "-severity", severities.join(","),
    // Be a considerate scanner. Hammering a client's production box is how a
    // security tool causes the incident it was hired to prevent.
    "-rate-limit", String(options.rateLimit ?? 50),
    "-timeout", "10",
    "-retries", "1",
    "-disable-update-check",
  ];
  if (templatesDir) args.push("-templates", templatesDir);

  options.onProgress?.(75, `Running vulnerability templates against ${target.value}`);

  const rawJsonl = await new Promise<string>((resolve, reject) => {
    execFile(
      binary,
      args,
      { timeout: timeoutMs, maxBuffer: MAX_OUTPUT_BYTES, killSignal: "SIGTERM" },
      (error, stdout, stderr) => {
        if (error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === "ENOENT") {
            return reject(
              new ScanEngineError(
                `nuclei not found at "${binary}". Install it (brew install nuclei) or set NUCLEI_PATH.`,
                { code: "tool_missing" },
              ),
            );
          }
          // nuclei exits non-zero when it finds nothing — that is a valid,
          // successful scan with zero findings, not a failure.
          if (typeof stdout === "string") return resolve(stdout);
          return reject(
            new ScanEngineError(`nuclei failed: ${stderr || error.message}`, {
              code: "tool_failed",
              cause: error,
            }),
          );
        }
        resolve(stdout);
      },
    );
  });

  const parsed = parseNucleiJsonl(rawJsonl);
  options.onProgress?.(95, `Found ${parsed.findings.length} vulnerabilities`);

  return {
    findings: parsed.findings,
    skipped: parsed.skipped,
    rawJsonl,
    command: `${binary} ${args.join(" ")}`,
  };
}
