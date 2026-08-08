import { ScanEngineError, type RawFinding, type Severity } from "../types";

/**
 * Hand-rolled nmap XML parser.
 *
 * Why not an XML library: nmap's output is a narrow, fully-specified subset of
 * XML (no namespaces, no mixed content, no entity declarations we honour), and
 * this package takes no runtime dependencies. A general parser would also give
 * us features we actively do not want — external entity resolution above all.
 *
 * Security posture. The XML is *not* trusted. Nmap copies attacker-controlled
 * bytes straight into it: `service/@product` and `@version` are banner text
 * from the remote host, and `<script>` output is worse. So:
 *
 *  - Entities are decoded only *after* tokenisation. Order matters: if `&lt;`
 *    were expanded first, a banner containing `&lt;port portid="22"&gt;` would
 *    become real markup and inject phantom findings. Decoding per-attribute
 *    means a decoded `<` is just a character.
 *  - Only the five predefined entities plus numeric character references are
 *    recognised. Unknown entities are left literal rather than looked up —
 *    there is no entity table to poison, so no billion-laughs and no XXE.
 *  - `<!DOCTYPE ...>`, processing instructions, comments and CDATA are skipped
 *    as opaque spans. A `<host>` hidden inside a comment must not become a host.
 *  - Hard caps on input size and element counts; a hostile host cannot make the
 *    parser allocate without bound.
 *
 * The parser never evaluates anything and builds no dynamic code.
 */

/** 64 MiB. A /16 with `-A` produces a few hundred MiB; that needs streaming, not this. */
const MAX_XML_BYTES = 64 * 1024 * 1024;
const MAX_HOSTS = 100_000;
const MAX_PORTS_PER_HOST = 65_536;
/** Banner text is untrusted and unbounded; truncate before it reaches the DB. */
const MAX_FIELD_LENGTH = 1024;

export interface NmapAddress {
  readonly addr: string;
  readonly addrtype: string;
  readonly vendor: string | null;
}

export interface NmapHostname {
  readonly name: string;
  readonly type: string;
}

export interface NmapService {
  readonly name: string | null;
  readonly product: string | null;
  readonly version: string | null;
  readonly extrainfo: string | null;
  /** `ssl` when nmap detected TLS wrapping — drives the https:// vs http:// guess. */
  readonly tunnel: string | null;
  readonly cpe: readonly string[];
}

export interface NmapPort {
  readonly protocol: string;
  readonly portid: number;
  readonly state: string;
  readonly reason: string | null;
  readonly service: NmapService | null;
}

export interface NmapHost {
  readonly addresses: readonly NmapAddress[];
  readonly hostnames: readonly NmapHostname[];
  /** `up` / `down` from `<status>`. Null when nmap omitted it. */
  readonly status: string | null;
  readonly ports: readonly NmapPort[];
  /** Best display address: first IPv4, else first address, else first hostname. */
  readonly primaryAddress: string;
}

export interface NmapScanResult {
  readonly hosts: readonly NmapHost[];
  /** Non-fatal anomalies. Surface these; silence here means a blind spot. */
  readonly warnings: readonly string[];
}

type TagKind = "open" | "close" | "self";

interface XmlTag {
  readonly name: string;
  readonly kind: TagKind;
  readonly attrs: Readonly<Record<string, string>>;
  /**
   * Text content, captured only for elements listed in `TEXT_ELEMENTS`.
   *
   * nmap keeps almost everything in attributes, so text nodes are skipped
   * wholesale — except <cpe>, which is the one datum nmap puts in element
   * content, and which the threat-intel enrichment step needs to look a
   * product up. Capturing text only where it is expected keeps the general
   * skip-all-text rule (and its safety properties) intact.
   */
  readonly text?: string;
}

const TEXT_ELEMENTS = new Set(["cpe"]);

const NAMED_ENTITIES: Readonly<Record<string, string>> = Object.freeze({
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
});

/**
 * Decode the XML entities nmap actually emits.
 *
 * Runs once, left to right, with no re-scan of its own output — `&amp;lt;`
 * decodes to the literal text `&lt;`, not to `<`. Double-decoding is how
 * sanitisers get bypassed, so the single pass is deliberate.
 *
 * Unrecognised entities (`&foo;`, `&#xZZ;`) are returned verbatim: the goal is
 * faithful text, and inventing a substitution would corrupt evidence.
 */
export function decodeXmlEntities(text: string): string {
  if (!text.includes("&")) return text;

  return text.replace(
    /&(#[0-9]{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z]{2,8});/g,
    (match, body: string) => {
      if (body.startsWith("#")) {
        const isHex = body[1] === "x" || body[1] === "X";
        const digits = isHex ? body.slice(2) : body.slice(1);
        const code = Number.parseInt(digits, isHex ? 16 : 10);
        if (!Number.isFinite(code)) return match;
        // Out of Unicode range, or a lone surrogate: String.fromCodePoint
        // throws on the former and the latter produces an unpaired surrogate
        // that breaks JSON.stringify and Postgres text encoding downstream.
        if (code < 0 || code > 0x10ffff) return match;
        if (code >= 0xd800 && code <= 0xdfff) return match;
        return String.fromCodePoint(code);
      }
      return NAMED_ENTITIES[body] ?? match;
    },
  );
}

/**
 * Strip characters that are legal in XML text but hostile downstream.
 *
 * A banner containing a NUL byte breaks Postgres `text` (which rejects it outright), and ANSI escape sequences in a terminal-rendered report are a
 * real spoofing vector. Tabs and newlines are kept — multi-line banners are
 * meaningful evidence.
 */
function sanitiseText(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0)!;
    const isControl =
      (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) ||
      code === 0x7f;
    out += isControl ? " " : ch;
  }
  return out.length > MAX_FIELD_LENGTH
    ? `${out.slice(0, MAX_FIELD_LENGTH)}…`
    : out;
}

function cleanAttr(value: string | undefined): string | null {
  if (value === undefined) return null;
  const decoded = sanitiseText(decodeXmlEntities(value)).trim();
  return decoded.length === 0 ? null : decoded;
}

/** Skip `<!DOCTYPE ...>` and friends, honouring a nested internal subset `[...]`. */
function skipDeclaration(xml: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < xml.length) {
    const ch = xml[i];
    if (ch === "[") depth++;
    else if (ch === "]") depth--;
    else if (ch === ">" && depth <= 0) return i + 1;
    i++;
  }
  return xml.length;
}

function parseAttrs(chunk: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(chunk)) !== null) {
    const key = match[1]!.toLowerCase();
    // First occurrence wins. A duplicated attribute is malformed XML; taking
    // the first means a hostile `portid="22" portid="80"` cannot override the
    // value an auditor reading the raw file would see.
    if (!(key in attrs)) attrs[key] = match[2] ?? match[3] ?? "";
  }
  return attrs;
}

/**
 * Yield tags in document order, ignoring text content entirely.
 *
 * nmap puts every datum we need in an attribute, so text nodes are noise —
 * skipping them removes a whole class of parsing bugs.
 */
function* tokenize(xml: string): Generator<XmlTag> {
  let i = 0;
  const n = xml.length;

  while (i < n) {
    const lt = xml.indexOf("<", i);
    if (lt === -1) return;
    i = lt + 1;

    if (xml.startsWith("!--", i)) {
      const end = xml.indexOf("-->", i + 3);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (xml.startsWith("![CDATA[", i)) {
      const end = xml.indexOf("]]>", i + 8);
      i = end === -1 ? n : end + 3;
      continue;
    }
    if (xml[i] === "?") {
      const end = xml.indexOf("?>", i + 1);
      i = end === -1 ? n : end + 2;
      continue;
    }
    if (xml[i] === "!") {
      i = skipDeclaration(xml, i + 1);
      continue;
    }

    const isClose = xml[i] === "/";
    if (isClose) i++;

    const nameStart = i;
    while (i < n && !/[\s/>]/.test(xml[i]!)) i++;
    const name = xml.slice(nameStart, i).toLowerCase();
    if (name.length === 0) continue;

    // Walk to the closing `>`, respecting quoted attribute values so that a
    // banner like product="foo > bar" does not end the tag early.
    const attrStart = i;
    let quote: string | null = null;
    while (i < n) {
      const ch = xml[i]!;
      if (quote !== null) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === ">") {
        break;
      }
      i++;
    }

    let chunk = xml.slice(attrStart, i);
    i++;

    let kind: TagKind = isClose ? "close" : "open";
    if (!isClose && chunk.trimEnd().endsWith("/")) {
      kind = "self";
      chunk = chunk.trimEnd().slice(0, -1);
    }

    let content: string | undefined;
    if (kind === "open" && TEXT_ELEMENTS.has(name)) {
      const textEnd = xml.indexOf("<", i);
      content = xml.slice(i, textEnd === -1 ? n : textEnd);
    }

    yield { name, kind, attrs: isClose ? {} : parseAttrs(chunk), text: content };
  }
}

interface MutableHost {
  addresses: NmapAddress[];
  hostnames: NmapHostname[];
  status: string | null;
  ports: NmapPort[];
}

interface MutableService {
  name: string | null;
  product: string | null;
  version: string | null;
  extrainfo: string | null;
  tunnel: string | null;
  cpe: string[];
}

interface MutablePort {
  protocol: string;
  portid: number;
  state: string;
  reason: string | null;
  service: MutableService | null;
}

/**
 * Parse nmap XML (`-oX`) into hosts, ports and services.
 *
 * @throws {ScanEngineError} with `code: "parse_error"` only for input that is
 * not plausibly nmap XML at all. Structural oddities *inside* well-formed-ish
 * output produce warnings instead: a truncated file from a scan that was killed
 * mid-run still contains real findings, and discarding them would be worse than
 * reporting them with a caveat.
 */
export function parseNmapXml(xml: string): NmapScanResult {
  if (typeof xml !== "string") {
    throw new ScanEngineError("nmap output must be a string.", {
      code: "parse_error",
    });
  }
  if (xml.length > MAX_XML_BYTES) {
    throw new ScanEngineError(
      `nmap output exceeds the ${MAX_XML_BYTES} byte parse limit.`,
      { code: "parse_error" },
    );
  }
  if (!xml.includes("<nmaprun") && !xml.includes("<host")) {
    throw new ScanEngineError(
      "Input does not look like nmap XML: no <nmaprun> or <host> element found.",
      { code: "parse_error", input: xml.slice(0, 120) },
    );
  }

  const hosts: NmapHost[] = [];
  const warnings: string[] = [];
  let host: MutableHost | null = null;
  let port: MutablePort | null = null;
  /** Depth of `<hostscript>`/`<script>` nesting we are ignoring. */
  let truncated = false;

  const finishPort = (): void => {
    if (host !== null && port !== null) {
      if (host.ports.length < MAX_PORTS_PER_HOST) host.ports.push(port);
    }
    port = null;
  };

  const finishHost = (): void => {
    if (host !== null) {
      finishPort();
      if (hosts.length < MAX_HOSTS) {
        hosts.push({
          addresses: host.addresses,
          hostnames: host.hostnames,
          status: host.status,
          ports: host.ports,
          primaryAddress: pickPrimaryAddress(host),
        });
      } else if (!truncated) {
        truncated = true;
        warnings.push(
          `Host limit of ${MAX_HOSTS} reached; remaining hosts were discarded.`,
        );
      }
    }
    host = null;
  };

  for (const tag of tokenize(xml)) {
    switch (tag.name) {
      case "host": {
        if (tag.kind === "open") {
          if (host !== null) {
            // Unclosed <host>: emit what we have rather than nesting.
            warnings.push("Encountered a nested <host> element; closing the previous one.");
            finishHost();
          }
          host = { addresses: [], hostnames: [], status: null, ports: [] };
        } else if (tag.kind === "close") {
          finishHost();
        }
        break;
      }

      case "status": {
        if (host !== null && tag.kind !== "close") {
          host.status = cleanAttr(tag.attrs["state"]);
        }
        break;
      }

      case "address": {
        if (host === null || tag.kind === "close") break;
        const addr = cleanAttr(tag.attrs["addr"]);
        if (addr === null) {
          warnings.push("Skipped an <address> element with no addr attribute.");
          break;
        }
        host.addresses.push({
          addr,
          addrtype: cleanAttr(tag.attrs["addrtype"]) ?? "unknown",
          vendor: cleanAttr(tag.attrs["vendor"]),
        });
        break;
      }

      case "hostname": {
        if (host === null || tag.kind === "close") break;
        const name = cleanAttr(tag.attrs["name"]);
        if (name !== null) {
          host.hostnames.push({
            name: name.toLowerCase(),
            type: cleanAttr(tag.attrs["type"]) ?? "unknown",
          });
        }
        break;
      }

      case "port": {
        if (host === null) break;
        if (tag.kind === "close") {
          finishPort();
          break;
        }
        finishPort();
        const portidText = cleanAttr(tag.attrs["portid"]);
        const portid = portidText === null ? Number.NaN : Number(portidText);
        if (!Number.isInteger(portid) || portid < 0 || portid > 65535) {
          warnings.push(`Skipped a <port> with an invalid portid: "${portidText ?? ""}".`);
          break;
        }
        port = {
          protocol: cleanAttr(tag.attrs["protocol"]) ?? "unknown",
          portid,
          // Default to "unknown" rather than "open": a missing <state> must
          // never be reported to a client as a confirmed open port.
          state: "unknown",
          reason: null,
          service: null,
        };
        if (tag.kind === "self") finishPort();
        break;
      }

      case "state": {
        if (port === null || tag.kind === "close") break;
        port.state = cleanAttr(tag.attrs["state"]) ?? "unknown";
        port.reason = cleanAttr(tag.attrs["reason"]);
        break;
      }

      case "service": {
        if (port === null || tag.kind === "close") break;
        const cpeRaw = cleanAttr(tag.attrs["cpe"]);
        port.service = {
          name: cleanAttr(tag.attrs["name"]),
          product: cleanAttr(tag.attrs["product"]),
          version: cleanAttr(tag.attrs["version"]),
          extrainfo: cleanAttr(tag.attrs["extrainfo"]),
          tunnel: cleanAttr(tag.attrs["tunnel"]),
          cpe: cpeRaw === null ? [] : [cpeRaw],
        };
        break;
      }

      case "cpe": {
        // nmap emits CPEs as a <service cpe="..."> attribute in some versions
        // and as <cpe> child elements in others, sometimes several per
        // service. Accept both and de-duplicate.
        if (port?.service == null || tag.kind === "close") break;
        const cpe = cleanAttr(tag.text);
        if (cpe !== null && !port.service.cpe.includes(cpe)) {
          port.service.cpe.push(cpe);
        }
        break;
      }

      default:
        break;
    }
  }

  if (host !== null) {
    warnings.push("nmap XML ended with an unclosed <host>; output may be truncated.");
    finishHost();
  }

  return { hosts, warnings };
}

function pickPrimaryAddress(host: MutableHost): string {
  const ipv4 = host.addresses.find((a) => a.addrtype === "ipv4");
  if (ipv4) return ipv4.addr;
  if (host.addresses.length > 0) return host.addresses[0]!.addr;
  if (host.hostnames.length > 0) return host.hostnames[0]!.name;
  return "unknown";
}

/**
 * Ports whose mere exposure to an untrusted network is itself the finding —
 * cleartext protocols, admin interfaces and databases that should never face
 * the internet. Everything else is reported informationally.
 */
const RISKY_PORTS: Readonly<Record<number, { severity: Severity; why: string }>> =
  Object.freeze({
    21: { severity: "medium", why: "FTP transmits credentials and data in cleartext." },
    23: { severity: "high", why: "Telnet transmits credentials in cleartext." },
    69: { severity: "medium", why: "TFTP is unauthenticated by design." },
    135: { severity: "medium", why: "MSRPC endpoint mapper exposes internal services." },
    139: { severity: "medium", why: "NetBIOS session service should not face untrusted networks." },
    445: { severity: "high", why: "SMB is a primary lateral-movement and ransomware vector." },
    1433: { severity: "high", why: "Microsoft SQL Server should not be directly exposed." },
    3306: { severity: "high", why: "MySQL should not be directly exposed." },
    3389: { severity: "high", why: "RDP is a leading initial-access vector for ransomware." },
    5432: { severity: "high", why: "PostgreSQL should not be directly exposed." },
    5900: { severity: "high", why: "VNC frequently ships with weak or absent authentication." },
    6379: { severity: "critical", why: "Redis is unauthenticated by default and trivially leads to RCE." },
    9200: { severity: "high", why: "Elasticsearch has no authentication in its default configuration." },
    11211: { severity: "high", why: "Memcached is unauthenticated and usable for DDoS amplification." },
    27017: { severity: "critical", why: "MongoDB has historically shipped without authentication." },
  });

/**
 * Turn parsed nmap hosts into findings.
 *
 * Only `open` ports become findings. `filtered` and `closed` are scan metadata,
 * not issues, and reporting them would bury the real results.
 */
export function nmapToFindings(result: NmapScanResult): RawFinding[] {
  const findings: RawFinding[] = [];

  for (const host of result.hosts) {
    const address = host.primaryAddress;
    for (const port of host.ports) {
      if (port.state !== "open") continue;

      const service = port.service;
      const serviceLabel = service?.name ?? "unknown";
      const banner = [service?.product, service?.version, service?.extrainfo]
        .filter((v): v is string => typeof v === "string" && v.length > 0)
        .join(" ");

      const risk = RISKY_PORTS[port.portid];
      const severity: Severity = risk?.severity ?? "info";
      const target = `${address}:${port.portid}/${port.protocol}`;

      const evidenceParts = [
        `state=${port.state}`,
        port.reason ? `reason=${port.reason}` : null,
        `service=${serviceLabel}`,
        banner ? `banner=${banner}` : null,
        service?.tunnel ? `tunnel=${service.tunnel}` : null,
        service?.cpe.length ? `cpe=${service.cpe.join(",")}` : null,
      ].filter((v): v is string => v !== null);

      findings.push({
        title: `Open port ${port.portid}/${port.protocol} (${serviceLabel})`,
        severity,
        category: "network",
        source: "nmap",
        target,
        cve: null,
        // nmap does not produce CVSS. Leaving this null rather than deriving a
        // score from severity keeps "we measured this" distinct from "we
        // guessed"; the threat-intel enrichment step fills it in for real.
        cvss: null,
        mitre: null,
        description:
          `Port ${port.portid}/${port.protocol} is open on ${address}` +
          (banner ? `, running ${banner}` : "") +
          `.${risk ? ` ${risk.why}` : ""}`,
        remediation: risk
          ? `Restrict access to ${port.portid}/${port.protocol} with a firewall ` +
            `or move the service behind a VPN. If exposure is required, enforce ` +
            `authentication and transport encryption.`
          : `Confirm that ${serviceLabel} on port ${port.portid} is intentionally ` +
            `exposed and is covered by patching and monitoring.`,
        evidence: evidenceParts.join(" "),
        references: [],
        fingerprint: `nmap:${address}:${port.protocol}:${port.portid}`,
      });
    }
  }

  return findings;
}
