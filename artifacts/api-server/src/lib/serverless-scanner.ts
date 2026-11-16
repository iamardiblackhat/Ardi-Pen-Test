import * as dns from "node:dns/promises";
import * as net from "node:net";
import * as tls from "node:tls";
import {
  parseTarget,
  mapToMitre,
  mapServiceToMitre,
  ScanEngineError,
  type RawFinding,
  type ProgressCallback,
  type Severity,
} from "@workspace/scan-engine";

interface ShodanInternetDbResponse {
  ip?: string;
  ports?: number[];
  cpes?: string[];
  hostnames?: string[];
  tags?: string[];
  vulns?: string[];
}

interface CisaKevCatalog {
  vulnerabilities?: Array<{
    cveID?: string;
    vulnerabilityName?: string;
    shortDescription?: string;
    requiredAction?: string;
    knownRansomwareCampaignUse?: string;
  }>;
}

const COMMON_PORTS: ReadonlyArray<{ port: number; service: string }> = [
  { port: 21, service: "ftp" },
  { port: 22, service: "ssh" },
  { port: 23, service: "telnet" },
  { port: 25, service: "smtp" },
  { port: 53, service: "dns" },
  { port: 80, service: "http" },
  { port: 443, service: "https" },
  { port: 445, service: "smb" },
  { port: 1433, service: "mssql" },
  { port: 3306, service: "mysql" },
  { port: 3389, service: "rdp" },
  { port: 5432, service: "postgresql" },
  { port: 6379, service: "redis" },
  { port: 8080, service: "http-proxy" },
  { port: 8443, service: "https-alt" },
  { port: 9200, service: "elasticsearch" },
  { port: 27017, service: "mongodb" },
];

const SENSITIVE_PATHS: ReadonlyArray<{
  path: string;
  title: string;
  severity: Severity;
  cvss: number;
  category: string;
  match: (status: number, body: string, contentType: string) => boolean;
  remediation: string;
}> = [
  {
    path: "/.env",
    title: "Exposed Environment Configuration File (.env)",
    severity: "critical",
    cvss: 9.1,
    category: "exposure",
    match: (status, body) =>
      status === 200 &&
      /^[A-Z0-9_]+=.+/m.test(body) &&
      !body.trimStart().startsWith("<"),
    remediation:
      "Block access to dotfiles (/.env) at the web server or CDN edge and rotate any exposed secrets immediately.",
  },
  {
    path: "/.git/HEAD",
    title: "Exposed Git Repository Metadata (.git/HEAD)",
    severity: "high",
    cvss: 7.5,
    category: "exposure",
    match: (status, body) =>
      status === 200 && /^ref:\s+refs\/heads\//m.test(body.trim()),
    remediation:
      "Deny public access to the /.git directory in web server configuration and remove VCS metadata from production deployments.",
  },
  {
    path: "/swagger.json",
    title: "Publicly Accessible OpenAPI / Swagger Specification",
    severity: "low",
    cvss: 3.7,
    category: "web",
    match: (status, body, ct) =>
      status === 200 &&
      ct.includes("json") &&
      (body.includes('"swagger"') || body.includes('"openapi"')),
    remediation:
      "Restrict API schema documentation endpoints (/swagger.json, /openapi.json) to authenticated or internal networks if not intended for public consumption.",
  },
  {
    path: "/openapi.json",
    title: "Publicly Accessible OpenAPI Specification",
    severity: "low",
    cvss: 3.7,
    category: "web",
    match: (status, body, ct) =>
      status === 200 &&
      ct.includes("json") &&
      (body.includes('"openapi"') || body.includes('"paths"')),
    remediation:
      "Restrict API schema documentation endpoints to authenticated users or internal networks if not intended for public access.",
  },
  {
    path: "/actuator/health",
    title: "Exposed Spring Boot Actuator Endpoint",
    severity: "medium",
    cvss: 5.3,
    category: "exposure",
    match: (status, body, ct) =>
      status === 200 && ct.includes("json") && body.includes('"status"'),
    remediation:
      "Restrict Spring Boot Actuator endpoints to an internal management port or require authentication.",
  },
  {
    path: "/server-status",
    title: "Exposed Apache Server-Status Page",
    severity: "medium",
    cvss: 5.3,
    category: "exposure",
    match: (status, body) =>
      status === 200 && body.includes("Apache Server Status"),
    remediation:
      "Restrict the Apache mod_status /server-status handler to localhost or trusted administrative IP ranges.",
  },
];

async function probeTcpPort(
  host: string,
  port: number,
  timeoutMs = 2000,
): Promise<{ open: boolean; banner: string | null }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    let bannerBuf = "";

    const finish = (open: boolean, banner: string | null) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ open, banner });
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      // Wait briefly to see if the server sends a greeting banner (SSH, FTP, SMTP)
      setTimeout(() => {
        finish(true, bannerBuf.trim() || null);
      }, 250);
    });
    socket.on("data", (chunk: Buffer) => {
      bannerBuf += chunk.toString("utf8").slice(0, 200);
      if (bannerBuf.length >= 32) {
        finish(true, bannerBuf.trim());
      }
    });
    socket.once("timeout", () => finish(false, null));
    socket.once("error", () => finish(false, null));
    socket.connect(port, host);
  });
}

async function inspectTls(
  host: string,
  port: number,
  timeoutMs = 3500,
): Promise<{
  protocol: string | null;
  cipher: string | null;
  authorized: boolean;
  authorizationError: string | null;
  subjectCN: string | null;
  issuerCN: string | null;
  validTo: string | null;
  daysRemaining: number | null;
} | null> {
  return new Promise((resolve) => {
    let settled = false;
    const socket = tls.connect(
      {
        host,
        port,
        servername: net.isIP(host) ? undefined : host,
        rejectUnauthorized: false,
        timeout: timeoutMs,
      },
      () => {
        if (settled) return;
        settled = true;
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher()?.name ?? null;
        const cert = socket.getPeerCertificate();
        const validTo = cert?.valid_to ?? null;
        let daysRemaining: number | null = null;
        if (validTo) {
          const expiryMs = Date.parse(validTo);
          if (!Number.isNaN(expiryMs)) {
            daysRemaining = Math.floor((expiryMs - Date.now()) / 86_400_000);
          }
        }
        const authErr = socket.authorizationError
          ? String(socket.authorizationError)
          : null;
        const subjectCN =
          typeof cert?.subject?.CN === "string"
            ? cert.subject.CN
            : Array.isArray(cert?.subject?.CN)
              ? cert.subject.CN[0] ?? null
              : null;
        const issuerCN =
          typeof cert?.issuer?.CN === "string"
            ? cert.issuer.CN
            : Array.isArray(cert?.issuer?.CN)
              ? cert.issuer.CN[0] ?? null
              : null;
        socket.destroy();
        resolve({
          protocol,
          cipher,
          authorized: socket.authorized,
          authorizationError: authErr,
          subjectCN,
          issuerCN,
          validTo,
          daysRemaining,
        });
      },
    );

    const fail = () => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(null);
    };
    socket.once("timeout", fail);
    socket.once("error", fail);
  });
}

/**
 * Real, zero-mock native Node.js network, DNS, TLS, Shodan InternetDB, CISA KEV,
 * and HTTP/HTTPS security assessment engine for serverless environments where
 * external CLI binaries (`nmap`, `nuclei`) are not installed.
 */
export async function runServerlessScan(
  rawTarget: string,
  options: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  } = {},
): Promise<{ findings: RawFinding[] }> {
  const { signal, onProgress } = options;
  const checkAbort = () => {
    if (signal?.aborted) {
      throw new ScanEngineError("Scan cancelled.", { code: "cancelled" });
    }
  };

  onProgress?.(5, "Validating target scope");
  const parsed = parseTarget(rawTarget);
  checkAbort();

  const host =
    parsed.kind === "url"
      ? parsed.host
      : parsed.kind === "cidr"
        ? parsed.network
        : parsed.value;

  const findings: RawFinding[] = [];

  // 1. DNS Resolution & Email Authentication Posture (SPF / DMARC)
  onProgress?.(12, `Resolving DNS records for ${host}`);
  let resolvedIps: string[] = [];
  if (net.isIPv4(host)) {
    resolvedIps = [host];
  } else {
    try {
      resolvedIps = await dns.resolve4(host);
    } catch {
      try {
        const lookedUp = await dns.lookup(host, { family: 4 });
        resolvedIps = [lookedUp.address];
      } catch {
        // Host could not be resolved to IPv4
      }
    }
  }

  if (resolvedIps.length === 0) {
    throw new ScanEngineError(
      `Unable to resolve hostname ${host} to a reachable IPv4 address.`,
      { code: "tool_failed", input: rawTarget },
    );
  }

  checkAbort();

  // Check MX / SPF / DMARC if target is a domain name
  if (!net.isIP(host)) {
    onProgress?.(20, `Checking DNS TXT, MX, SPF, and DMARC policies for ${host}`);
    const [mxRecords, txtRecords, dmarcRecords] = await Promise.all([
      dns.resolveMx(host).catch(() => []),
      dns.resolveTxt(host).catch(() => []),
      dns.resolveTxt(`_dmarc.${host}`).catch(() => []),
    ]);

    const flatTxt = txtRecords.map((chunks) => chunks.join(""));
    const spf = flatTxt.find((t) => /^v=spf1\b/i.test(t));
    const flatDmarc = dmarcRecords.map((chunks) => chunks.join(""));
    const dmarc = flatDmarc.find((t) => /^v=DMARC1\b/i.test(t));

    if (mxRecords.length > 0 && !spf) {
      findings.push({
        title: `Missing SPF Record on Mail-Enabled Domain (${host})`,
        severity: "low",
        category: "dns",
        source: "nuclei",
        target: host,
        cve: null,
        cvss: 3.7,
        mitre: mapToMitre(["dns", "misconfiguration"]),
        description: `Domain ${host} publishes ${mxRecords.length} MX record(s) (${mxRecords
          .slice(0, 3)
          .map((m) => m.exchange)
          .join(", ")}) but has no v=spf1 TXT record, increasing the risk of domain email spoofing.`,
        remediation:
          "Publish a strict Sender Policy Framework (TXT v=spf1) record authorizing only legitimate outbound mail servers.",
        evidence: `MX records present (${mxRecords.length}); no v=spf1 TXT record found on ${host}`,
        references: ["https://www.rfc-editor.org/rfc/rfc7208"],
        fingerprint: `dns:missing-spf:${host}`,
      });
    }

    if (mxRecords.length > 0 && !dmarc) {
      findings.push({
        title: `Missing DMARC Policy on Mail-Enabled Domain (_dmarc.${host})`,
        severity: "low",
        category: "dns",
        source: "nuclei",
        target: `_dmarc.${host}`,
        cve: null,
        cvss: 3.7,
        mitre: mapToMitre(["dns", "misconfiguration"]),
        description: `Domain ${host} accepts mail via MX records but does not publish a DMARC policy at _dmarc.${host}. Without DMARC, receivers cannot enforce SPF/DKIM alignment or report spoofing attempts.`,
        remediation:
          "Publish a DMARC TXT record at _dmarc." +
          host +
          " with p=quarantine or p=reject and an aggregate reporting address (rua=).",
        evidence: `No v=DMARC1 TXT record returned for _dmarc.${host}`,
        references: ["https://www.rfc-editor.org/rfc/rfc7489"],
        fingerprint: `dns:missing-dmarc:${host}`,
      });
    }
  }

  checkAbort();

  // 2. Active TCP Port & Banner Discovery + Shodan InternetDB Enrichment
  const primaryIp = resolvedIps[0]!;
  onProgress?.(35, `Probing TCP ports and querying Shodan InternetDB for ${primaryIp}`);

  const [shodanData, portProbes] = await Promise.all([
    fetch(`https://internetdb.shodan.io/${encodeURIComponent(primaryIp)}`, {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json" },
    })
      .then(async (r) =>
        r.ok ? ((await r.json()) as ShodanInternetDbResponse) : null,
      )
      .catch(() => null),
    Promise.all(
      COMMON_PORTS.map(async ({ port, service }) => {
        const res = await probeTcpPort(primaryIp, port, 1800);
        return { port, service, ...res };
      }),
    ),
  ]);

  checkAbort();

  const discoveredPorts = new Map<
    number,
    { service: string; banner: string | null; source: string }
  >();

  for (const probe of portProbes) {
    if (probe.open) {
      discoveredPorts.set(probe.port, {
        service: probe.service,
        banner: probe.banner,
        source: "live-tcp-connect",
      });
    }
  }

  if (shodanData?.ports) {
    for (const p of shodanData.ports) {
      if (!discoveredPorts.has(p)) {
        const known = COMMON_PORTS.find((c) => c.port === p)?.service ?? "tcp";
        discoveredPorts.set(p, {
          service: known,
          banner: null,
          source: "shodan-internetdb",
        });
      }
    }
  }

  const RISKY_PORTS = new Set([21, 23, 445, 1433, 3306, 3389, 5432, 6379, 9200, 27017]);

  for (const [port, info] of discoveredPorts.entries()) {
    const isRisky = RISKY_PORTS.has(port);
    const isRemoteAdmin = port === 22 || port === 3389 || port === 23;
    const severity: Severity = isRisky
      ? port === 23 || port === 6379 || port === 445 || port === 27017
        ? "high"
        : "medium"
      : isRemoteAdmin
        ? "low"
        : "info";

    findings.push({
      title: isRisky
        ? `Exposed Network Service: ${info.service.toUpperCase()} (${port}/tcp)`
        : `Open Port Discovered: ${info.service.toUpperCase()} (${port}/tcp)`,
      severity,
      category: "network",
      source: "nmap",
      target: `${host}:${port}/tcp`,
      cve: null,
      cvss:
        severity === "high"
          ? 7.5
          : severity === "medium"
            ? 5.3
            : severity === "low"
              ? 3.1
              : null,
      mitre:
        mapServiceToMitre(info.service, port) ??
        mapToMitre(["service-detection", "network"]),
      description: `Port ${port}/tcp (${info.service}) is reachable on ${host} (${primaryIp})${
        info.banner ? ` with service banner "${info.banner}"` : ""
      }. ${
        isRisky
          ? "Direct internet exposure of database, cache, or cleartext management protocols significantly increases attack surface."
          : "Verify that this service is intended to be publicly reachable."
      }`,
      remediation: isRisky
        ? `Restrict access to port ${port}/tcp (${info.service}) using firewall rules, VPC security groups, or a VPN/Zero-Trust tunnel.`
        : `Confirm that port ${port}/tcp is required for public traffic and ensure the underlying service is patched.`,
      evidence: `IP: ${primaryIp} | Port: ${port}/tcp | Service: ${info.service} | Verification: ${info.source}${
        info.banner ? ` | Banner: ${info.banner}` : ""
      }`,
      references: [],
      fingerprint: `nmap:open-port:${primaryIp}:${port}`,
    });
  }

  // 3. Correlate Shodan InternetDB CVEs with CISA KEV Catalog
  if (shodanData?.vulns && shodanData.vulns.length > 0) {
    onProgress?.(
      52,
      `Correlating ${shodanData.vulns.length} observed CVE(s) against CISA KEV catalog`,
    );
    const kevCatalog = await fetch(
      "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
      { signal: AbortSignal.timeout(7000) },
    )
      .then(async (r) => (r.ok ? ((await r.json()) as CisaKevCatalog) : null))
      .catch(() => null);

    const kevMap = new Map(
      (kevCatalog?.vulnerabilities ?? [])
        .filter((v) => v.cveID)
        .map((v) => [v.cveID!.toUpperCase(), v]),
    );

    for (const rawCve of shodanData.vulns.slice(0, 15)) {
      const cveId = rawCve.toUpperCase();
      const kev = kevMap.get(cveId);
      const isKev = Boolean(kev);
      findings.push({
        title: isKev
          ? `${cveId}: ${kev?.vulnerabilityName ?? "Known Exploited Vulnerability"} (CISA KEV)`
          : `${cveId} Detected on ${host} (${primaryIp})`,
        severity: isKev ? "critical" : "high",
        category: "cve",
        source: "nuclei",
        target: `${host} (${primaryIp})`,
        cve: cveId,
        cvss: isKev ? 9.8 : 7.5,
        mitre: mapToMitre(["cve", "rce"]),
        description:
          kev?.shortDescription ??
          `Host ${host} (${primaryIp}) is associated with vulnerability ${cveId} based on exposed service fingerprinting (${(shodanData.cpes ?? []).join(", ") || "active service banner"}).`,
        remediation:
          kev?.requiredAction ??
          `Upgrade the affected service on ${host} to a patched release that remediates ${cveId}.`,
        evidence: `Host IP: ${primaryIp} | CVE: ${cveId}${
          isKev ? " | Listed in CISA Known Exploited Vulnerabilities Catalog" : ""
        }${shodanData.cpes?.length ? ` | CPEs: ${shodanData.cpes.join(", ")}` : ""}`,
        references: [`https://nvd.nist.gov/vuln/detail/${cveId}`],
        fingerprint: `cve:${primaryIp}:${cveId}`,
      });
    }
  }

  checkAbort();

  // 4. TLS / SSL Certificate & Protocol Inspection
  const tlsPort =
    parsed.kind === "url" && parsed.scheme === "https" && parsed.port
      ? parsed.port
      : discoveredPorts.has(443)
        ? 443
        : discoveredPorts.has(8443)
          ? 8443
          : 443;

  onProgress?.(65, `Inspecting TLS configuration and certificate chain on ${host}:${tlsPort}`);
  const tlsInfo = await inspectTls(host, tlsPort, 3500);

  if (tlsInfo) {
    if (
      tlsInfo.protocol &&
      (tlsInfo.protocol === "TLSv1" || tlsInfo.protocol === "TLSv1.1" || tlsInfo.protocol === "SSLv3")
    ) {
      findings.push({
        title: `Deprecated TLS Protocol Negotiated (${tlsInfo.protocol})`,
        severity: "high",
        category: "tls",
        source: "nuclei",
        target: `${host}:${tlsPort}`,
        cve: null,
        cvss: 7.4,
        mitre: mapToMitre(["tls", "weak-cipher"]),
        description: `Server ${host}:${tlsPort} negotiated deprecated protocol ${tlsInfo.protocol}, which is vulnerable to downgrade and cryptographic attacks.`,
        remediation:
          "Disable SSLv3, TLS 1.0, and TLS 1.1; enforce TLS 1.2 and TLS 1.3 only.",
        evidence: `Protocol: ${tlsInfo.protocol} | Cipher: ${tlsInfo.cipher ?? "unknown"}`,
        references: ["https://datatracker.ietf.org/doc/html/rfc8996"],
        fingerprint: `tls:weak-protocol:${host}:${tlsPort}`,
      });
    }

    if (!tlsInfo.authorized && tlsInfo.authorizationError) {
      findings.push({
        title: `Untrusted or Invalid TLS Certificate (${tlsInfo.authorizationError})`,
        severity: "medium",
        category: "tls",
        source: "nuclei",
        target: `${host}:${tlsPort}`,
        cve: null,
        cvss: 5.9,
        mitre: mapToMitre(["tls", "ssl"]),
        description: `The TLS certificate presented by ${host}:${tlsPort} failed chain validation (${tlsInfo.authorizationError}). Clients may be susceptible to adversary-in-the-middle interception.`,
        remediation:
          "Install a valid TLS certificate issued by a trusted Certificate Authority matching the target hostname.",
        evidence: `Validation error: ${tlsInfo.authorizationError} | Subject CN: ${tlsInfo.subjectCN ?? "N/A"} | Issuer CN: ${tlsInfo.issuerCN ?? "N/A"} | Valid To: ${tlsInfo.validTo ?? "N/A"}`,
        references: [],
        fingerprint: `tls:invalid-cert:${host}:${tlsPort}:${tlsInfo.authorizationError}`,
      });
    } else if (tlsInfo.daysRemaining !== null && tlsInfo.daysRemaining < 14) {
      findings.push({
        title:
          tlsInfo.daysRemaining < 0
            ? `Expired TLS Certificate on ${host}:${tlsPort}`
            : `TLS Certificate Expiring Soon (${tlsInfo.daysRemaining} days remaining)`,
        severity: tlsInfo.daysRemaining < 0 ? "high" : "low",
        category: "tls",
        source: "nuclei",
        target: `${host}:${tlsPort}`,
        cve: null,
        cvss: tlsInfo.daysRemaining < 0 ? 7.5 : 3.1,
        mitre: mapToMitre(["tls"]),
        description: `The TLS certificate for ${host}:${tlsPort} (Subject: ${tlsInfo.subjectCN ?? host}) expires on ${tlsInfo.validTo}.`,
        remediation:
          "Renew the TLS certificate and configure automated ACME renewal before expiration.",
        evidence: `Valid To: ${tlsInfo.validTo} (${tlsInfo.daysRemaining} days) | Issuer: ${tlsInfo.issuerCN ?? "unknown"}`,
        references: [],
        fingerprint: `tls:expiry:${host}:${tlsPort}`,
      });
    }
  }

  checkAbort();

  // 5. HTTP / HTTPS Web Security Headers, Cookies, CORS & Sensitive Endpoint Assessment
  const candidateUrls: string[] = [];
  if (parsed.kind === "url") {
    candidateUrls.push(parsed.value);
  } else {
    if (tlsInfo || discoveredPorts.has(443)) {
      candidateUrls.push(`https://${host}/`);
    }
    if (discoveredPorts.has(80) || candidateUrls.length === 0) {
      candidateUrls.push(`http://${host}/`);
    }
  }

  const baseUrl = candidateUrls[0]!;
  onProgress?.(78, `Assessing HTTP security headers, cookies, and CORS on ${baseUrl}`);

  try {
    const resp = await fetch(baseUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "ARDI-Security-Scanner/1.0",
        Origin: "https://evil.example.com",
      },
    });

    const finalUrl = resp.url || baseUrl;
    const isHttps = finalUrl.startsWith("https://");
    const headers = resp.headers;

    // Missing HSTS on HTTPS
    if (isHttps && !headers.get("strict-transport-security")) {
      findings.push({
        title: "Missing HTTP Strict-Transport-Security (HSTS) Header",
        severity: "low",
        category: "web",
        source: "nuclei",
        target: finalUrl,
        cve: null,
        cvss: 3.7,
        mitre: mapToMitre(["security-headers", "tls"]),
        description: `The HTTPS response from ${finalUrl} does not include a Strict-Transport-Security header, leaving first-time visitors vulnerable to SSL-stripping downgrade attacks.`,
        remediation:
          "Add the response header `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` on all HTTPS responses.",
        evidence: `GET ${finalUrl} -> HTTP ${resp.status} (no Strict-Transport-Security header present)`,
        references: ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security"],
        fingerprint: `web:missing-hsts:${host}`,
      });
    }

    // Missing Content-Security-Policy
    if (!headers.get("content-security-policy")) {
      findings.push({
        title: "Missing Content-Security-Policy (CSP) Header",
        severity: "low",
        category: "web",
        source: "nuclei",
        target: finalUrl,
        cve: null,
        cvss: 3.7,
        mitre: mapToMitre(["security-headers", "misconfig"]),
        description: `The application at ${finalUrl} does not enforce a Content-Security-Policy header, reducing defense-in-depth against Cross-Site Scripting (XSS) and data injection attacks.`,
        remediation:
          "Define and enforce a restrictive Content-Security-Policy header specifying trusted script, style, frame, and connect origins.",
        evidence: `GET ${finalUrl} -> HTTP ${resp.status} (no Content-Security-Policy header present)`,
        references: ["https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP"],
        fingerprint: `web:missing-csp:${host}`,
      });
    }

    // Missing Clickjacking protection (neither X-Frame-Options nor CSP frame-ancestors)
    const csp = headers.get("content-security-policy") ?? "";
    if (!headers.get("x-frame-options") && !csp.toLowerCase().includes("frame-ancestors")) {
      findings.push({
        title: "Missing Clickjacking Protection (X-Frame-Options / frame-ancestors)",
        severity: "low",
        category: "web",
        source: "nuclei",
        target: finalUrl,
        cve: null,
        cvss: 3.7,
        mitre: mapToMitre(["security-headers", "misconfig"]),
        description: `${finalUrl} does not send an X-Frame-Options header or a CSP frame-ancestors directive, allowing the page to be framed by arbitrary third-party origins.`,
        remediation:
          "Set `X-Frame-Options: DENY` (or `SAMEORIGIN`) and include `frame-ancestors 'none'` (or `'self'`) in your Content-Security-Policy.",
        evidence: `GET ${finalUrl} -> HTTP ${resp.status} (missing X-Frame-Options and CSP frame-ancestors)`,
        references: ["https://owasp.org/www-community/attacks/Clickjacking"],
        fingerprint: `web:missing-clickjacking-protection:${host}`,
      });
    }

    // Missing X-Content-Type-Options
    if (
      (headers.get("x-content-type-options") ?? "").toLowerCase() !== "nosniff"
    ) {
      findings.push({
        title: "Missing X-Content-Type-Options: nosniff Header",
        severity: "info",
        category: "web",
        source: "nuclei",
        target: finalUrl,
        cve: null,
        cvss: null,
        mitre: mapToMitre(["security-headers", "misconfig"]),
        description: `${finalUrl} omits the X-Content-Type-Options: nosniff header, allowing browsers to MIME-sniff responses away from the declared Content-Type.`,
        remediation:
          "Add the `X-Content-Type-Options: nosniff` header to all HTTP responses.",
        evidence: `GET ${finalUrl} -> HTTP ${resp.status} (X-Content-Type-Options: ${headers.get("x-content-type-options") ?? "<absent>"})`,
        references: ["https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options"],
        fingerprint: `web:missing-nosniff:${host}`,
      });
    }

    // Permissive CORS configuration
    const acao = headers.get("access-control-allow-origin");
    const acac = headers.get("access-control-allow-credentials");
    if (
      (acao === "https://evil.example.com" || acao === "*") &&
      acac?.toLowerCase() === "true"
    ) {
      findings.push({
        title: "Misconfigured CORS Policy Allowing Arbitrary Origin with Credentials",
        severity: "high",
        category: "web",
        source: "nuclei",
        target: finalUrl,
        cve: null,
        cvss: 7.5,
        mitre: mapToMitre(["misconfiguration", "exposure"]),
        description: `${finalUrl} reflected or wildcarded Access-Control-Allow-Origin (${acao}) while also setting Access-Control-Allow-Credentials: true, allowing untrusted websites to read authenticated cross-origin responses.`,
        remediation:
          "Validate the Origin header against a strict allowlist of trusted domains before setting Access-Control-Allow-Origin and Access-Control-Allow-Credentials.",
        evidence: `Origin: https://evil.example.com -> Access-Control-Allow-Origin: ${acao}, Access-Control-Allow-Credentials: ${acac}`,
        references: ["https://portswigger.net/web-security/cors"],
        fingerprint: `web:cors-credentials:${host}`,
      });
    }

    // Server / X-Powered-By Version Fingerprinting
    const serverHeader = headers.get("server");
    const poweredBy = headers.get("x-powered-by");
    if (
      (serverHeader && /\d+\.\d+/.test(serverHeader)) ||
      (poweredBy && poweredBy.length > 0)
    ) {
      findings.push({
        title: "Technology Stack / Version Disclosure in HTTP Headers",
        severity: "info",
        category: "web",
        source: "nuclei",
        target: finalUrl,
        cve: null,
        cvss: null,
        mitre: mapToMitre(["version", "fingerprint"]),
        description: `${finalUrl} discloses software version or runtime details in HTTP response headers, aiding attacker reconnaissance.`,
        remediation:
          "Suppress version numbers in the Server header (e.g. `server_tokens off` in Nginx) and remove the X-Powered-By header.",
        evidence: [
          serverHeader && `Server: ${serverHeader}`,
          poweredBy && `X-Powered-By: ${poweredBy}`,
        ]
          .filter(Boolean)
          .join(" | "),
        references: [],
        fingerprint: `web:tech-disclosure:${host}`,
      });
    }
  } catch {
    // Target did not respond over HTTP/HTTPS
  }

  checkAbort();

  // 6. Probe Sensitive Paths (.env, .git/HEAD, swagger.json, actuator/health, etc.)
  onProgress?.(90, `Checking ${baseUrl} for exposed configuration and debug endpoints`);
  const originUrl = new URL(baseUrl).origin;

  await Promise.all(
    SENSITIVE_PATHS.map(async (check) => {
      try {
        const targetUrl = `${originUrl}${check.path}`;
        const res = await fetch(targetUrl, {
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(4500),
          headers: { "User-Agent": "ARDI-Security-Scanner/1.0" },
        });
        if (res.status !== 200) return;
        const ct = (res.headers.get("content-type") ?? "").toLowerCase();
        const text = (await res.text()).slice(0, 2048);
        if (check.match(res.status, text, ct)) {
          findings.push({
            title: check.title,
            severity: check.severity,
            category: check.category,
            source: "nuclei",
            target: targetUrl,
            cve: null,
            cvss: check.cvss,
            mitre: mapToMitre(["exposure", "files"]),
            description: `Endpoint ${targetUrl} returned HTTP 200 with content matching ${check.title}.`,
            remediation: check.remediation,
            evidence: `GET ${targetUrl} -> HTTP ${res.status} (${ct || "no content-type"}) | Snippet: ${text
              .slice(0, 140)
              .replace(/\s+/g, " ")}`,
            references: [],
            fingerprint: `web:sensitive-path:${host}:${check.path}`,
          });
        }
      } catch {
        // Endpoint unreachable or timed out
      }
    }),
  );

  onProgress?.(98, "Finalizing scan findings");
  return { findings };
}
