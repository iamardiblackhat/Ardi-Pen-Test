import { ScanEngineError, type ScanTarget } from "./types";

/**
 * Scan-target validation. This is the security-critical file in the package.
 *
 * Threat model: `input` is attacker-controlled. It arrives from an HTTP request
 * body and ends up in the argv of a privileged network tool. Three distinct
 * attacks have to be closed here, and they need different defences:
 *
 *  1. **Command injection** — `example.com; rm -rf /`. Mitigated primarily by
 *     never using a shell (`execFile`, not `exec`) at the call site, but we
 *     also reject metacharacters outright. Defence in depth: the day someone
 *     adds a `sh -c` for convenience, this allowlist is what saves them.
 *  2. **Argument injection** — `--script=/tmp/evil.nse`, `-oN /etc/crontab`.
 *     A shell is *not* involved and `execFile` does not help at all: the string
 *     is a legitimate argv element, it just happens to be a flag. This is the
 *     one people miss. Anything starting with `-` is rejected.
 *  3. **SSRF into infrastructure** — `169.254.169.254`, `127.0.0.1`,
 *     `10.0.0.0/8`. A scanner is a request-forging engine by design; pointed at
 *     the cloud metadata endpoint it will happily exfiltrate its own instance
 *     credentials into a findings report the attacker can then read. Private,
 *     loopback and link-local space therefore require an explicit opt-in.
 *
 * The approach is allowlist-only. Every accepted target is re-serialised from
 * parsed components, so the value that reaches argv is one we constructed, not
 * one the user handed us.
 */

export interface ParseTargetOptions {
  /**
   * Permit RFC 1918, loopback, link-local, CGNAT and internal-only names.
   * Required for on-prem engagements; must stay off for multi-tenant SaaS.
   */
  readonly allowPrivateRanges?: boolean;
}

/** Hard ceiling before any parsing work happens. */
const MAX_INPUT_LENGTH = 2048;
/** RFC 1035 §2.3.4: 253 characters for a presentation-format domain name. */
const MAX_HOSTNAME_LENGTH = 253;
const MAX_LABEL_LENGTH = 63;

/**
 * The only characters that may appear anywhere in a target.
 *
 * Note what is absent: whitespace, `%` (percent-encoding could smuggle a
 * decoded metacharacter past a downstream consumer), `@` (userinfo in a URL is
 * a classic host-confusion trick — `http://trusted.com@attacker.com/`), `?` and
 * `#` (query and fragment are rejected wholesale; no scanner target needs them
 * and they are pure attack surface), and every shell metacharacter.
 */
const ALLOWED_CHARS = /^[A-Za-z0-9._:/-]+$/;

/**
 * Reserved IPv4 space, as `[networkInt, prefix, label]`.
 *
 * `optIn: true` entries are unlocked by `allowPrivateRanges` — they are real
 * networks a pentester may legitimately be hired to scan. `optIn: false`
 * entries are never scannable regardless of flags: you cannot meaningfully port
 * scan a multicast group or the broadcast address, so accepting them can only
 * ever be a bug or an attempt to confuse the tool.
 */
interface ReservedRange {
  readonly cidr: string;
  readonly label: string;
  readonly optIn: boolean;
}

const RESERVED_RANGES: readonly ReservedRange[] = [
  { cidr: "0.0.0.0/8", label: "this-network", optIn: false },
  { cidr: "224.0.0.0/4", label: "multicast", optIn: false },
  { cidr: "240.0.0.0/4", label: "reserved/broadcast", optIn: false },
  { cidr: "127.0.0.0/8", label: "loopback", optIn: true },
  { cidr: "10.0.0.0/8", label: "RFC 1918 private", optIn: true },
  { cidr: "172.16.0.0/12", label: "RFC 1918 private", optIn: true },
  { cidr: "192.168.0.0/16", label: "RFC 1918 private", optIn: true },
  {
    cidr: "169.254.0.0/16",
    label: "link-local / cloud metadata",
    optIn: true,
  },
  { cidr: "100.64.0.0/10", label: "CGNAT", optIn: true },
  { cidr: "192.0.0.0/24", label: "IETF protocol assignments", optIn: true },
];

/**
 * Names that resolve to the host itself or to internal-only infrastructure.
 *
 * Blocking IP literals is not enough: `localhost`, `metadata.google.internal`
 * and any single-label intranet name reach exactly the same places by way of
 * DNS. We cannot resolve at validation time (DNS rebinding would defeat that
 * anyway — the resolve-then-connect gap is the vulnerability), so this is a
 * name-shaped heuristic layered on top of the address checks, not a substitute
 * for them. A connect-time guard in the engine remains necessary.
 */
const RESERVED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".home.arpa",
  ".localdomain",
];
const RESERVED_NAMES = new Set(["localhost", "localdomain"]);

function fail(message: string, input: string): never {
  throw new ScanEngineError(message, { code: "invalid_target", input });
}

/** Pack a dotted-quad into a 32-bit unsigned integer for range comparisons. */
function toInt(octets: readonly number[]): number {
  return (
    (octets[0]! * 0x1000000 +
      octets[1]! * 0x10000 +
      octets[2]! * 0x100 +
      octets[3]!) >>>
    0
  );
}

/**
 * Strict dotted-quad parse. Returns null for anything that is not exactly four
 * plain decimal octets.
 *
 * Deliberately stricter than `inet_aton`, which accepts `0177.0.0.1` (octal),
 * `0x7f.1` (hex) and `2130706433` (a bare integer) — all of which are 127.0.0.1
 * wearing a hat, and all of which are standard SSRF-filter bypasses. Leading
 * zeros are rejected rather than normalised, because a scanner that disagrees
 * with libc about what `010.0.0.1` means is a scanner with a blocklist bypass.
 */
function parseIpv4(text: string): [number, number, number, number] | null {
  const parts = text.split(".");
  if (parts.length !== 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    if (part.length > 1 && part.startsWith("0")) return null;
    const n = Number(part);
    if (n > 255) return null;
    octets.push(n);
  }
  return octets as [number, number, number, number];
}

/**
 * Reject a target if it touches reserved space.
 *
 * For CIDR blocks this checks *overlap*, not just the network address: a naive
 * "is the network address private?" check waves through `0.0.0.0/0`, which
 * contains every address we are trying to exclude.
 */
function assertAddressAllowed(
  startInt: number,
  endInt: number,
  input: string,
  allowPrivate: boolean,
): void {
  for (const range of RESERVED_RANGES) {
    const [net, prefixText] = range.cidr.split("/");
    const prefix = Number(prefixText);
    const netInt = toInt(parseIpv4(net!)!);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const rangeStart = (netInt & mask) >>> 0;
    const rangeEnd = (rangeStart + (~mask >>> 0)) >>> 0;

    const overlaps = startInt <= rangeEnd && endInt >= rangeStart;
    if (!overlaps) continue;
    if (range.optIn && allowPrivate) continue;

    fail(
      range.optIn
        ? `Target overlaps ${range.cidr} (${range.label}). Scanning private, ` +
            `loopback or link-local space requires the allowPrivateRanges opt-in.`
        : `Target overlaps ${range.cidr} (${range.label}), which is never a ` +
            `valid scan target.`,
      input,
    );
  }
}

/** RFC 1123 hostname validation. Returns the lower-cased name. */
function parseHostname(text: string, input: string, allowPrivate: boolean): string {
  if (text.length > MAX_HOSTNAME_LENGTH) {
    fail(`Hostname exceeds ${MAX_HOSTNAME_LENGTH} characters.`, input);
  }
  if (text.endsWith(".")) {
    // A trailing dot is technically a valid FQDN root anchor, but tools
    // disagree on whether to strip it, and disagreement is how allowlists get
    // bypassed. Normalise by rejecting rather than by guessing.
    fail("Hostname must not end with a trailing dot.", input);
  }

  const labels = text.split(".");
  for (const label of labels) {
    if (label.length === 0 || label.length > MAX_LABEL_LENGTH) {
      fail(
        `Invalid hostname label: labels must be 1-${MAX_LABEL_LENGTH} characters.`,
        input,
      );
    }
    if (!/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?$/.test(label)) {
      fail(
        "Invalid hostname label: RFC 1123 allows letters, digits and interior hyphens only.",
        input,
      );
    }
  }

  // An all-numeric final label means this is a malformed IP, not a hostname —
  // e.g. `1.2.3.4.5` or `999.1.1.1`. Accepting it as a name would hand the
  // resolver something we never validated as an address.
  if (/^\d+$/.test(labels[labels.length - 1]!)) {
    fail("Target looks like a malformed IPv4 address.", input);
  }

  const lower = text.toLowerCase();

  if (!allowPrivate) {
    if (RESERVED_NAMES.has(lower) || labels.length === 1) {
      fail(
        `"${lower}" is an internal-only name. Single-label and localhost ` +
          `targets require the allowPrivateRanges opt-in.`,
        input,
      );
    }
    for (const suffix of RESERVED_SUFFIXES) {
      if (lower.endsWith(suffix)) {
        fail(
          `"${lower}" is in the internal-only ${suffix} namespace and requires ` +
            `the allowPrivateRanges opt-in.`,
          input,
        );
      }
    }
  }

  return lower;
}

/**
 * Validate a user-supplied scan target.
 *
 * Accepts exactly four shapes: an RFC 1123 hostname, an IPv4 literal, an IPv4
 * CIDR block (/8 through /32), or an http(s) URL with no query or fragment.
 * Everything else — including IPv6, which the engines do not yet support and
 * which brings its own bracket-parsing and zone-id ambiguities — is rejected.
 *
 * @throws {ScanEngineError} with `code: "invalid_target"` for every rejection.
 */
export function parseTarget(
  input: string,
  options: ParseTargetOptions = {},
): ScanTarget {
  const allowPrivate = options.allowPrivateRanges === true;

  if (typeof input !== "string") {
    fail("Scan target must be a string.", String(input));
  }
  if (input.length === 0) {
    fail("Scan target must not be empty.", input);
  }
  if (input.length > MAX_INPUT_LENGTH) {
    fail(`Scan target exceeds ${MAX_INPUT_LENGTH} characters.`, input);
  }

  // Checked before anything else and before trimming: a NUL truncates the
  // string in the C library behind execve, so `example.com\0; evil` would pass
  // a JS-side check on the full string and reach the tool as `example.com`.
  if (input.includes("\0")) {
    fail("Scan target contains a null byte.", input);
  }
  if (/\s/.test(input)) {
    fail("Scan target contains whitespace.", input);
  }
  // Non-ASCII is rejected rather than punycode-encoded: IDN homograph handling
  // is a decision for the UI layer, and silently transforming a target means
  // the string we scanned is not the string the operator authorised.
  if (/[^\x20-\x7e]/.test(input)) {
    fail(
      "Scan target contains control or non-ASCII characters; supply punycode instead.",
      input,
    );
  }
  // Argument injection. Checked on the raw input, ahead of the charset test,
  // so the error message names the real problem.
  if (input.startsWith("-")) {
    fail(
      "Scan target must not start with '-': it would be parsed as a " +
        "command-line flag by the scanner.",
      input,
    );
  }
  if (!ALLOWED_CHARS.test(input)) {
    fail(
      "Scan target contains disallowed characters. Only letters, digits and " +
        ". _ - : / are permitted.",
      input,
    );
  }
  if (input.includes("..")) {
    fail("Scan target contains a path traversal sequence.", input);
  }

  if (/^https?:\/\//i.test(input)) {
    return parseUrlTarget(input, allowPrivate);
  }
  if (input.includes("/")) {
    return parseCidrTarget(input, allowPrivate);
  }
  if (input.includes(":")) {
    // `:` is only meaningful in a URL authority. A bare `host:port` is not a
    // target any of these tools accept, and letting it through would mean the
    // port never gets validated.
    fail(
      "Scan target must not contain ':'. Use a full http(s) URL to specify a port.",
      input,
    );
  }

  const octets = parseIpv4(input);
  if (octets) {
    const value = octets.join(".");
    const asInt = toInt(octets);
    assertAddressAllowed(asInt, asInt, input, allowPrivate);
    return { kind: "ipv4", value, octets, input };
  }

  // `1.2.3.4.5` and `10.0.0.256` land here; parseHostname rejects them via the
  // all-numeric-TLD rule rather than letting them through as names.
  const hostname = parseHostname(input, input, allowPrivate);
  return { kind: "hostname", value: hostname, input };
}

function parseCidrTarget(input: string, allowPrivate: boolean): ScanTarget {
  const slash = input.indexOf("/");
  if (slash !== input.lastIndexOf("/")) {
    fail("Malformed CIDR block: multiple '/' separators.", input);
  }
  const netText = input.slice(0, slash);
  const prefixText = input.slice(slash + 1);

  const octets = parseIpv4(netText);
  if (!octets) {
    fail("Malformed CIDR block: network part is not a valid IPv4 address.", input);
  }
  if (!/^\d{1,2}$/.test(prefixText)) {
    fail("Malformed CIDR block: prefix must be a decimal number.", input);
  }

  const prefix = Number(prefixText);
  // /8 is already 16.7 million hosts. Anything wider is not a scan, it is an
  // accident or an attempt to make the engine spin forever.
  if (prefix < 8 || prefix > 32) {
    fail(`CIDR prefix must be between /8 and /32, received /${prefix}.`, input);
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const given = toInt(octets);
  const network = (given & mask) >>> 0;
  if (network !== given) {
    // Rejecting rather than silently masking: `192.0.2.55/24` most likely means
    // the operator misread their notes, and quietly scanning 254 other hosts on
    // their behalf is not a favour.
    fail(
      `CIDR host bits are set. Did you mean ${intToDotted(network)}/${prefix}?`,
      input,
    );
  }

  const broadcast = (network + (~mask >>> 0)) >>> 0;
  assertAddressAllowed(network, broadcast, input, allowPrivate);

  const networkText = intToDotted(network);
  return {
    kind: "cidr",
    value: `${networkText}/${prefix}`,
    network: networkText,
    prefix,
    size: 2 ** (32 - prefix),
    input,
  };
}

function parseUrlTarget(input: string, allowPrivate: boolean): ScanTarget {
  const schemeEnd = input.indexOf("://");
  const scheme = input.slice(0, schemeEnd).toLowerCase() as "http" | "https";
  const rest = input.slice(schemeEnd + 3);
  if (rest.length === 0) {
    fail("URL target has no host.", input);
  }

  const pathStart = rest.indexOf("/");
  const authority = pathStart === -1 ? rest : rest.slice(0, pathStart);
  const path = pathStart === -1 ? "/" : rest.slice(pathStart);

  if (authority.length === 0) {
    fail("URL target has no host.", input);
  }

  let hostText = authority;
  let port: number | null = null;
  const colon = authority.indexOf(":");
  if (colon !== -1) {
    if (colon !== authority.lastIndexOf(":")) {
      fail("Malformed URL authority: multiple ':' separators.", input);
    }
    hostText = authority.slice(0, colon);
    const portText = authority.slice(colon + 1);
    if (!/^\d{1,5}$/.test(portText)) {
      fail("Malformed URL port.", input);
    }
    port = Number(portText);
    if (port < 1 || port > 65535) {
      fail(`URL port ${port} is out of range (1-65535).`, input);
    }
  }

  let host: string;
  const octets = parseIpv4(hostText);
  if (octets) {
    host = octets.join(".");
    const asInt = toInt(octets);
    assertAddressAllowed(asInt, asInt, input, allowPrivate);
  } else {
    host = parseHostname(hostText, input, allowPrivate);
  }

  const authorityOut = port === null ? host : `${host}:${port}`;
  return {
    kind: "url",
    value: `${scheme}://${authorityOut}${path}`,
    scheme,
    host,
    port,
    path,
    input,
  };
}

function intToDotted(value: number): string {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ].join(".");
}

/**
 * Validate an nmap-style port specification.
 *
 * Ports reach argv exactly like targets do, so `-p` values get the same
 * allowlist treatment: digits, commas, hyphens, nothing else. Returns the
 * normalised spec, rebuilt from the parsed ranges.
 *
 * @throws {ScanEngineError} with `code: "invalid_config"`.
 */
export function parsePortSpec(spec: string): string {
  if (typeof spec !== "string" || spec.length === 0 || spec.length > 512) {
    throw new ScanEngineError("Port specification is empty or too long.", {
      code: "invalid_config",
      input: String(spec),
    });
  }
  if (!/^[0-9,-]+$/.test(spec)) {
    throw new ScanEngineError(
      "Port specification may contain only digits, commas and hyphens.",
      { code: "invalid_config", input: spec },
    );
  }

  const parts: string[] = [];
  for (const chunk of spec.split(",")) {
    const range = chunk.split("-");
    if (range.length > 2 || range.some((p) => !/^\d{1,5}$/.test(p))) {
      throw new ScanEngineError(`Malformed port range: "${chunk}".`, {
        code: "invalid_config",
        input: spec,
      });
    }
    const numbers = range.map(Number);
    for (const n of numbers) {
      if (n < 1 || n > 65535) {
        throw new ScanEngineError(`Port ${n} is out of range (1-65535).`, {
          code: "invalid_config",
          input: spec,
        });
      }
    }
    if (numbers.length === 2 && numbers[0]! > numbers[1]!) {
      throw new ScanEngineError(`Inverted port range: "${chunk}".`, {
        code: "invalid_config",
        input: spec,
      });
    }
    parts.push(numbers.join("-"));
  }

  return parts.join(",");
}

/**
 * Convenience wrapper for callers that want a boolean rather than a throw —
 * e.g. filtering a pasted list of targets down to the scannable ones.
 */
export function isValidTarget(
  input: string,
  options: ParseTargetOptions = {},
): boolean {
  try {
    parseTarget(input, options);
    return true;
  } catch {
    return false;
  }
}
