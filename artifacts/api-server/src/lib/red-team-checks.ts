import * as dns from "node:dns/promises";
import { mapToMitre, type RawFinding } from "@workspace/scan-engine";

/**
 * Non-destructive red-team checks used by the serverless scanner.
 * Each check only reports a finding when the live response proves the condition.
 */

const UA = "ARDI-Security-Scanner/1.0";

/** Providers whose unclaimed-resource error pages prove a dangling CNAME. */
const TAKEOVER_FINGERPRINTS: Array<{ provider: string; cname: RegExp; body: RegExp }> = [
  { provider: "GitHub Pages", cname: /\.github\.io$/i, body: /There isn't a GitHub Pages site here/i },
  { provider: "Heroku", cname: /\.(herokuapp|herokudns)\.com$/i, body: /No such app/i },
  { provider: "AWS S3", cname: /\.s3[.-][a-z0-9.-]*amazonaws\.com$|\.s3\.amazonaws\.com$/i, body: /NoSuchBucket/i },
  { provider: "Azure", cname: /\.(azurewebsites\.net|cloudapp\.net|trafficmanager\.net|blob\.core\.windows\.net)$/i, body: /404 Web Site not found|BlobNotFound|ResourceNotFound/i },
  { provider: "Fastly", cname: /\.fastly\.net$/i, body: /Fastly error: unknown domain/i },
  { provider: "Shopify", cname: /\.myshopify\.com$/i, body: /Sorry, this shop is currently unavailable/i },
  { provider: "Surge.sh", cname: /\.surge\.sh$/i, body: /project not found/i },
  { provider: "Bitbucket", cname: /\.bitbucket\.io$/i, body: /Repository not found/i },
  { provider: "Pantheon", cname: /\.pantheonsite\.io$/i, body: /The gods are wise, but do not know of the site/i },
];

async function crtShSubdomains(domain: string): Promise<string[]> {
  try {
    const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, {
      signal: AbortSignal.timeout(12_000),
      headers: { accept: "application/json", "user-agent": "ARDI-SEC/1.0" },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ name_value?: string }>;
    const names = new Set<string>();
    for (const row of rows) {
      for (const n of (row.name_value ?? "").split(/\s+/)) {
        const name = n.trim().toLowerCase().replace(/^\*\./, "");
        if (name && name !== domain && name.endsWith(`.${domain}`) && /^[a-z0-9.-]+$/.test(name)) names.add(name);
      }
    }
    return [...names].slice(0, 60);
  } catch {
    return [];
  }
}

/** Certificate Transparency subdomain discovery plus dangling-CNAME verification. */
export async function discoverSubdomains(domain: string): Promise<RawFinding[]> {
  const subdomains = await crtShSubdomains(domain);
  if (subdomains.length === 0) return [];
  const findings: RawFinding[] = [];
  const live: string[] = [];

  await Promise.all(
    subdomains.map(async (sub) => {
      let cname: string | null = null;
      try { cname = (await dns.resolveCname(sub))[0] ?? null; } catch {}
      let resolves = false;
      try { resolves = (await dns.resolve4(sub)).length > 0; } catch {}
      if (resolves) live.push(sub);
      if (!cname) return;
      const provider = TAKEOVER_FINGERPRINTS.find((f) => f.cname.test(cname!));
      if (!provider) return;
      try {
        const res = await fetch(`https://${sub}/`, {
          signal: AbortSignal.timeout(6000),
          headers: { "User-Agent": UA },
          redirect: "follow",
        });
        const body = (await res.text()).slice(0, 20_000);
        if (!provider.body.test(body)) return;
        findings.push({
          title: `Subdomain Takeover Possible: ${sub} (${provider.provider})`,
          severity: "high",
          category: "dns",
          source: "nuclei",
          target: sub,
          cve: null,
          cvss: 8.1,
          mitre: mapToMitre(["subdomain-takeover"]),
          description: `${sub} has a CNAME to ${cname} on ${provider.provider}, and that provider returns its "unclaimed resource" page. Another party could register the resource and serve content on your domain.`,
          remediation: `Delete the dangling CNAME for ${sub}, or reclaim the ${provider.provider} resource it points to.`,
          evidence: `CNAME ${sub} -> ${cname} | HTTP ${res.status} body matched ${provider.provider} unclaimed-resource fingerprint`,
          references: ["https://developer.mozilla.org/en-US/docs/Web/Security/Subdomain_takeovers"],
          fingerprint: `dns:takeover:${sub}`,
        });
      } catch {}
    }),
  );

  if (live.length > 0) {
    findings.push({
      title: `${live.length} Live Subdomain(s) Discovered via Certificate Transparency`,
      severity: "info",
      category: "dns",
      source: "nuclei",
      target: domain,
      cve: null,
      cvss: null,
      mitre: mapToMitre(["dns", "fingerprint"]),
      description: `Public certificate logs list ${subdomains.length} names under ${domain}; ${live.length} currently resolve. Each is part of your external attack surface and should be in scope or decommissioned.`,
      remediation: "Review every live subdomain, add the ones you own to your approved scope, and remove DNS records for anything unused.",
      evidence: live.sort().slice(0, 40).join(", "),
      references: ["https://crt.sh/"],
      fingerprint: `dns:subdomains:${domain}`,
    });
  }
  return findings;
}

/** GraphQL schema introspection left enabled in production. */
export async function probeGraphqlIntrospection(origin: string): Promise<RawFinding[]> {
  const findings: RawFinding[] = [];
  for (const path of ["/graphql", "/api/graphql"]) {
    try {
      const res = await fetch(`${origin}${path}`, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
        redirect: "manual",
        headers: { "content-type": "application/json", "User-Agent": UA },
        body: JSON.stringify({ query: "{__schema{queryType{name}types{name}}}" }),
      });
      if (!res.ok) continue;
      const body = (await res.json().catch(() => null)) as { data?: { __schema?: { types?: unknown[] } } } | null;
      const types = body?.data?.__schema?.types;
      if (!Array.isArray(types)) continue;
      findings.push({
        title: "GraphQL Introspection Enabled",
        severity: "medium",
        category: "web",
        source: "nuclei",
        target: `${origin}${path}`,
        cve: null,
        cvss: 5.3,
        mitre: mapToMitre(["disclosure"]),
        description: `${origin}${path} answers unauthenticated introspection queries, exposing the full API schema (${types.length} types) to anyone mapping the attack surface.`,
        remediation: "Disable introspection in production (or restrict it to authenticated internal users) and enforce authorisation on every resolver.",
        evidence: `POST ${path} {__schema{...}} -> HTTP ${res.status}, ${types.length} types returned`,
        references: ["https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/12-API_Testing/01-Testing_GraphQL"],
        fingerprint: `web:graphql-introspection:${origin}${path}`,
      });
      break;
    } catch {}
  }
  return findings;
}

/** Unvalidated redirect parameters on the landing page. */
export async function probeOpenRedirect(baseUrl: string): Promise<RawFinding[]> {
  const canaryHost = "ardi-redirect-check.invalid";
  const params = ["next", "url", "redirect", "redirect_uri", "return", "returnTo", "return_to", "continue", "dest"];
  const findings: RawFinding[] = [];
  await Promise.all(
    params.map(async (param) => {
      const test = new URL(baseUrl);
      test.searchParams.set(param, `https://${canaryHost}/`);
      try {
        const res = await fetch(test.href, {
          signal: AbortSignal.timeout(5000),
          redirect: "manual",
          headers: { "User-Agent": UA },
        });
        const location = res.headers.get("location");
        if (res.status < 300 || res.status >= 400 || !location) return;
        let host = "";
        try { host = new URL(location, test.href).hostname; } catch { return; }
        if (host !== canaryHost) return;
        findings.push({
          title: `Open Redirect via "${param}" Parameter`,
          severity: "medium",
          category: "web",
          source: "nuclei",
          target: test.origin + test.pathname,
          cve: null,
          cvss: 6.1,
          mitre: mapToMitre(["open-redirect"]),
          description: `The "${param}" parameter redirects visitors to any external domain. Attackers use this to make phishing links look like they belong to your site.`,
          remediation: `Only allow relative paths or an allowlist of your own domains in the "${param}" parameter.`,
          evidence: `GET ${test.pathname}?${param}=https://${canaryHost}/ -> HTTP ${res.status} Location: ${location.slice(0, 200)}`,
          references: ["https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html"],
          fingerprint: `web:open-redirect:${test.host}:${param}`,
        });
      } catch {}
    }),
  );
  return findings;
}
