export interface DefenseFindingInput {
  id?: number;
  title: string;
  severity: string;
  category: string;
  mitreId: string;
  mitreTactic: string;
  mitreTechnique: string;
  cve: string | null;
  target?: string | null;
}

export interface ComplianceMapping {
  owaspTop10: string;
  soc2: string;
  iso27001: string;
  nistCsf: string;
}

export interface DefenseRules {
  nginx: string;
  cloudflareWaf: string;
  sigma: string;
}

export interface BlueTeamDefense {
  compliance: ComplianceMapping;
  rules: DefenseRules;
}

function classifyCompliance(f: DefenseFindingInput): ComplianceMapping {
  const title = f.title.toLowerCase();
  const cat = f.category.toLowerCase();

  if (f.cve || cat === "cve") {
    return {
      owaspTop10: "A06:2021 - Vulnerable and Outdated Components",
      soc2: "CC7.1 - Configuration & Vulnerability Management",
      iso27001: "A.8.8 - Management of Technical Vulnerabilities",
      nistCsf: "ID.RA-1 / PR.IP-12",
    };
  }

  if (
    cat === "tls" ||
    title.includes("tls") ||
    title.includes("ssl") ||
    title.includes("certificate") ||
    title.includes("hsts") ||
    title.includes("strict-transport-security")
  ) {
    return {
      owaspTop10: "A02:2021 - Cryptographic Failures",
      soc2: "CC6.1 - Logical Access & Encryption",
      iso27001: "A.8.24 - Use of Cryptography",
      nistCsf: "PR.DS-2",
    };
  }

  if (
    title.includes("cors") ||
    title.includes("open redirect") ||
    title.includes("takeover") ||
    cat === "exposure" ||
    title.includes("exposed")
  ) {
    return {
      owaspTop10: "A01:2021 - Broken Access Control",
      soc2: "CC6.6 - Boundary Protection",
      iso27001: "A.8.20 - Network Security",
      nistCsf: "PR.AC-5 / PR.PT-4",
    };
  }

  if (title.includes("cookie")) {
    return {
      owaspTop10: "A07:2021 - Identification and Authentication Failures",
      soc2: "CC6.1 - Logical Access & Encryption",
      iso27001: "A.8.9 - Configuration Management",
      nistCsf: "PR.AC-1",
    };
  }

  return {
    owaspTop10: "A05:2021 - Security Misconfiguration",
    soc2: "CC7.1 - Configuration & Vulnerability Management",
    iso27001: "A.8.9 - Configuration Management",
    nistCsf: "PR.IP-1 / DE.CM-7",
  };
}

function buildNginxSnippet(f: DefenseFindingInput): string {
  const title = f.title.toLowerCase();

  if (
    title.includes(".env") ||
    title.includes(".git") ||
    title.includes("phpinfo") ||
    title.includes("config.json") ||
    title.includes("server-status") ||
    title.includes("actuator") ||
    title.includes("swagger") ||
    title.includes("openapi") ||
    f.category === "exposure"
  ) {
    return `# Block dotfiles, repository metadata, and internal endpoints
location ~ /\\.(?!well-known).* {
  deny all;
  return 404;
}

location ~* ^/(swagger\\.json|openapi\\.json|actuator|server-status|phpinfo\\.php|config\\.json) {
  # Restrict to internal management CIDR or deny publicly
  allow 10.0.0.0/8;
  deny all;
  return 404;
}`;
  }

  if (
    title.includes("strict-transport-security") ||
    title.includes("hsts") ||
    title.includes("content-security-policy") ||
    title.includes("clickjacking") ||
    title.includes("x-frame-options") ||
    title.includes("nosniff")
  ) {
    return `# Enforce browser security headers in Nginx server block
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;`;
  }

  if (title.includes("tls") || title.includes("certificate") || f.category === "tls") {
    return `# Enforce modern TLS 1.2 / 1.3 and strong cipher suites
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_session_tickets off;`;
  }

  if (title.includes("version disclosure") || title.includes("server")) {
    return `# Suppress server and framework version disclosure
server_tokens off;
proxy_hide_header X-Powered-By;`;
  }

  if (title.includes("cors")) {
    return `# Restrict CORS to explicit trusted origin allowlist
set $cors_origin "";
if ($http_origin ~* "^https://(app\\.example\\.com)$") {
  set $cors_origin $http_origin;
}
add_header Access-Control-Allow-Origin $cors_origin always;
add_header Access-Control-Allow-Credentials "true" always;`;
  }

  if (title.includes("cookie")) {
    return `# Force Secure, HttpOnly, and SameSite flags on upstream cookies
proxy_cookie_flags ~ secure httponly samesite=lax;`;
  }

  if (title.includes("graphql")) {
    return `# Restrict GraphQL endpoint rate & block introspection queries externally
location = /graphql {
  limit_req zone=api_limit burst=20 nodelay;
  # Reject introspection at reverse proxy or disable in app server
  proxy_pass http://app_upstream;
}`;
  }

  if (f.category === "network") {
    return `# Close unnecessary public ports at host firewall (ufw / nftables)
# Allow only required public ingress (e.g. 443/tcp) and deny internal services
# ufw default deny incoming
# ufw allow 443/tcp
# ufw allow from <ADMIN_VPN_CIDR> to any port 22 proto tcp`;
  }

  return `# General Nginx hardening baseline
server_tokens off;
proxy_hide_header X-Powered-By;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;`;
}

function buildCloudflareWafRule(f: DefenseFindingInput): string {
  const title = f.title.toLowerCase();

  if (
    title.includes(".env") ||
    title.includes(".git") ||
    title.includes("phpinfo") ||
    title.includes("config.json") ||
    title.includes("actuator") ||
    title.includes("server-status") ||
    f.category === "exposure"
  ) {
    return `# Cloudflare WAF Custom Rule (Block)
(http.request.uri.path contains "/.env" or
 http.request.uri.path contains "/.git" or
 http.request.uri.path in {"/phpinfo.php" "/config.json" "/server-status" "/actuator/health" "/swagger.json" "/openapi.json"})`;
  }

  if (title.includes("graphql")) {
    return `# Cloudflare WAF Custom Rule (Block GraphQL Introspection)
(http.request.uri.path contains "/graphql" and
 (http.request.body.raw contains "__schema" or http.request.body.raw contains "__type"))`;
  }

  if (title.includes("open redirect")) {
    return `# Cloudflare WAF Custom Rule (Block External Redirect Schemes)
(http.request.uri.query matches "(?i)(next|url|redirect|redirect_uri|return|returnTo|return_to|continue|dest)=https?://")`;
  }

  if (
    title.includes("strict-transport-security") ||
    title.includes("content-security-policy") ||
    title.includes("x-frame-options") ||
    title.includes("nosniff")
  ) {
    return `# Cloudflare Response Header Modification / SSL Edge Rule
# Enable: SSL/TLS -> Edge Certificates -> Always Use HTTPS & HSTS
# Transform Rule (Modify Response Header):
Set static "X-Content-Type-Options" = "nosniff"
Set static "X-Frame-Options" = "DENY"
Set static "Strict-Transport-Security" = "max-age=31536000; includeSubDomains"`;
  }

  if (title.includes("cors")) {
    return `# Cloudflare WAF Custom Rule (Block Untrusted Cross-Origin Credentialed Requests)
(any(http.request.headers["origin"][*] ne "") and not any(http.request.headers["origin"][*] in {"https://your-trusted-domain.com"}))`;
  }

  return `# Cloudflare WAF Baseline Protection
(cf.threat_score gt 15 and not cf.client.bot) or
(http.request.uri.path contains "/..")`;
}

function buildSigmaRule(f: DefenseFindingInput): string {
  const tacticTag = f.mitreTactic.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const techTag =
    f.mitreId && f.mitreId !== "unmapped" ? f.mitreId.toLowerCase() : "t1190";
  const level =
    f.severity === "critical" || f.severity === "high"
      ? f.severity
      : f.severity === "medium"
        ? "medium"
        : "low";
  const safeTitle = f.title.replace(/"/g, "'");
  const titleLower = f.title.toLowerCase();

  let selectionBlock = `  selection:
    cs-uri-stem|contains:
      - '/.env'
      - '/.git'`;
  let logCategory = "webserver";

  if (titleLower.includes("graphql")) {
    selectionBlock = `  selection:
    cs-uri-stem|contains: '/graphql'
    cs-method: 'POST'
    request_body|contains: '__schema'`;
  } else if (titleLower.includes("open redirect")) {
    selectionBlock = `  selection:
    cs-uri-query|contains:
      - 'redirect=http'
      - 'next=http'
      - 'return=http'
      - 'url=http'
    sc-status:
      - 301
      - 302
      - 307
      - 308`;
  } else if (titleLower.includes("swagger") || titleLower.includes("openapi") || titleLower.includes("actuator")) {
    selectionBlock = `  selection:
    cs-uri-stem|endswith:
      - '/swagger.json'
      - '/openapi.json'
      - '/actuator/health'
    sc-status: 200`;
  } else if (f.cve) {
    selectionBlock = `  selection:
    c-useragent|contains:
      - 'Nuclei'
      - 'sqlmap'
    cs-uri-query|contains: '${f.cve}'`;
  } else if (f.category === "network") {
    logCategory = "firewall";
    const portMatch = f.target?.match(/:(\d+)\/tcp/);
    const port = portMatch ? portMatch[1] : "22";
    selectionBlock = `  selection:
    dst_port: ${port}
    action: 'allowed'`;
  } else if (f.category === "tls") {
    logCategory = "proxy";
    selectionBlock = `  selection:
    tls_version:
      - 'TLSv1'
      - 'TLSv1.1'
      - 'SSLv3'`;
  }

  return `title: Detect Exploitation or Probing - ${safeTitle}
status: experimental
description: Auto-generated Blue Team Sigma rule for ARDI finding "${safeTitle}"${f.cve ? ` (${f.cve})` : ""}.
tags:
  - attack.${tacticTag}
  - attack.${techTag}
logsource:
  category: ${logCategory}
detection:
${selectionBlock}
  condition: selection
falsepositives:
  - Authorized vulnerability scans from ARDI Security Scanner
level: ${level}`;
}

export function buildBlueTeamDefense(finding: DefenseFindingInput): BlueTeamDefense {
  return {
    compliance: classifyCompliance(finding),
    rules: {
      nginx: buildNginxSnippet(finding),
      cloudflareWaf: buildCloudflareWafRule(finding),
      sigma: buildSigmaRule(finding),
    },
  };
}
