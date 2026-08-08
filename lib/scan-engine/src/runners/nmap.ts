import { execFile } from "node:child_process";
import { ScanEngineError, type RawFinding, type ProgressCallback } from "../types";
import { parseTarget } from "../targets";
import { nmapToFindings, parseNmapXml } from "../nmap/parse";

/**
 * Runs nmap for real and returns real findings.
 *
 * Security posture:
 *  - `execFile`, never `exec`. No shell is involved, so shell metacharacters in
 *    a target are inert rather than dangerous.
 *  - The target is validated by `parseTarget` BEFORE it becomes an argv entry.
 *    That rejects argument injection (`--script=…`), octal/decimal-encoded IPs,
 *    private and link-local ranges, and anything with whitespace or nulls.
 *  - `-sT` (TCP connect) rather than `-sS` (SYN). SYN scanning needs root; a
 *    scanner running as root is indefensible in a client's security review.
 *    Connect scanning needs no privileges at all.
 */

export interface NmapRunOptions {
  /** Path to the nmap binary. */
  binary?: string;
  /** Port specification, already validated by `parsePortSpec`. */
  ports?: string;
  /** Hard ceiling on runtime. nmap can run for hours on a wide range. */
  timeoutMs?: number;
  /** Set true only when scanning your own private infrastructure. */
  allowPrivateRanges?: boolean;
  onProgress?: ProgressCallback;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
/** nmap XML on a wide range gets large; cap it rather than exhaust memory. */
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

export async function runNmap(
  rawTarget: string,
  options: NmapRunOptions = {},
): Promise<{ findings: RawFinding[]; rawXml: string; command: string }> {
  const binary = options.binary ?? process.env["NMAP_PATH"] ?? "nmap";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // Validate before anything reaches argv. This is the security boundary.
  const target = parseTarget(rawTarget, {
    allowPrivateRanges: options.allowPrivateRanges ?? false,
  });

  // nmap scans hosts, not URLs — reduce a URL to its hostname.
  const scanTarget =
    target.kind === "url" ? new URL(target.value).hostname : target.value;

  const args = [
    "-sT", // TCP connect: no root required
    "-sV", // service/version detection — this is what makes findings useful
    "--version-intensity", "5",
    "-Pn", // skip host discovery; many hosts drop ping but serve traffic
    "-oX", "-", // XML to stdout
    "--host-timeout", "5m",
  ];
  if (options.ports) args.push("-p", options.ports);
  args.push(scanTarget);

  options.onProgress?.(5, `Starting port scan of ${scanTarget}`);

  const rawXml = await new Promise<string>((resolve, reject) => {
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
                `nmap not found at "${binary}". Install it (brew install nmap) or set NMAP_PATH.`,
                { code: "tool_missing" },
              ),
            );
          }
          // nmap exits non-zero on partial results; if we got XML, use it.
          if (stdout && stdout.includes("<nmaprun")) return resolve(stdout);
          return reject(
            new ScanEngineError(`nmap failed: ${stderr || error.message}`, {
              code: "tool_failed",
              cause: error,
            }),
          );
        }
        resolve(stdout);
      },
    );
  });

  options.onProgress?.(60, "Port scan complete, parsing results");

  const parsed = parseNmapXml(rawXml);
  const findings = nmapToFindings(parsed);

  options.onProgress?.(70, `Found ${findings.length} open ports`);

  return { findings, rawXml, command: `${binary} ${args.join(" ")}` };
}
