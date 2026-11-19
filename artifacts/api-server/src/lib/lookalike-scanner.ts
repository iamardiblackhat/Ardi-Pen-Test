import * as dns from "node:dns/promises";
import { normalizePublicDomain } from "@workspace/ardi-agent/cyber";

export interface LookalikeCandidate {
  domain: string;
  kind: "alternate-tld" | "brand-keyword" | "typo";
  registered: boolean;
  ipv4: string[];
  hasMail: boolean;
  httpStatus: number | null;
  redirectTarget: string | null;
  risk: "high" | "medium" | "low" | "none";
}

export interface LookalikeScanResult {
  domain: string;
  checkedAt: string;
  checkedCount: number;
  registeredCount: number;
  highRiskCount: number;
  candidates: LookalikeCandidate[];
}

const MULTI_PART_TLDS = new Set([
  "co.uk",
  "org.uk",
  "gov.uk",
  "ac.uk",
  "com.au",
  "co.nz",
  "co.za",
  "com.br",
  "co.jp",
]);

function splitDomain(domain: string): { stem: string; tld: string } {
  const parts = domain.split(".");
  if (parts.length >= 3) {
    const lastTwo = parts.slice(-2).join(".");
    if (MULTI_PART_TLDS.has(lastTwo)) {
      return { stem: parts[parts.length - 3]!, tld: lastTwo };
    }
  }
  return {
    stem: parts[parts.length - 2] ?? parts[0]!,
    tld: parts[parts.length - 1] ?? "com",
  };
}

function buildLookalikeCandidates(
  domain: string,
): Array<{ domain: string; kind: LookalikeCandidate["kind"] }> {
  const { stem, tld } = splitDomain(domain);
  const seen = new Set<string>([domain]);
  const out: Array<{ domain: string; kind: LookalikeCandidate["kind"] }> = [];

  const add = (candidate: string, kind: LookalikeCandidate["kind"]) => {
    const clean = candidate.toLowerCase();
    if (seen.has(clean) || clean.length > 253) return;
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]+)+$/.test(clean)) return;
    seen.add(clean);
    out.push({ domain: clean, kind });
  };

  // 1. Alternate popular TLDs
  for (const altTld of ["com", "net", "org", "co.uk", "io", "co", "app", "ai"]) {
    if (altTld !== tld) add(`${stem}.${altTld}`, "alternate-tld");
  }

  // 2. Common brand-impersonation / phishing keywords
  for (const suffix of ["login", "support", "secure", "verify", "portal"]) {
    add(`${stem}-${suffix}.${tld}`, "brand-keyword");
  }
  add(`login-${stem}.${tld}`, "brand-keyword");
  add(`my-${stem}.${tld}`, "brand-keyword");

  // 3. Common typos & homoglyphs
  if (stem.length >= 4) {
    // Omitted character
    add(`${stem.slice(0, -1)}.${tld}`, "typo");
    add(`${stem.slice(1)}.${tld}`, "typo");
    // Adjacent character swap near middle
    const mid = Math.floor(stem.length / 2);
    if (stem[mid - 1] !== stem[mid]) {
      const swapped =
        stem.slice(0, mid - 1) + stem[mid] + stem[mid - 1] + stem.slice(mid + 1);
      add(`${swapped}.${tld}`, "typo");
    }
    // Doubled character
    add(`${stem.slice(0, mid)}${stem[mid]}${stem.slice(mid)}.${tld}`, "typo");
  }

  // Visual substitutions (o->0, l->1, rn->m)
  if (stem.includes("o")) add(`${stem.replace("o", "0")}.${tld}`, "typo");
  if (stem.includes("l")) add(`${stem.replace("l", "1")}.${tld}`, "typo");
  if (stem.includes("m")) add(`${stem.replace("m", "rn")}.${tld}`, "typo");

  return out.slice(0, 22);
}

async function probeCandidate(item: {
  domain: string;
  kind: LookalikeCandidate["kind"];
}): Promise<LookalikeCandidate> {
  const [ipv4, mx] = await Promise.all([
    dns.resolve4(item.domain).catch(() => [] as string[]),
    dns.resolveMx(item.domain).catch(() => [] as Array<{ exchange: string; priority: number }>),
  ]);

  const registered = ipv4.length > 0 || mx.length > 0;
  let httpStatus: number | null = null;
  let redirectTarget: string | null = null;

  if (ipv4.length > 0) {
    try {
      const res = await fetch(`https://${item.domain}/`, {
        method: "HEAD",
        redirect: "manual",
        signal: AbortSignal.timeout(3000),
        headers: { "User-Agent": "ARDI-Security-Scanner/1.0" },
      });
      httpStatus = res.status;
      redirectTarget = res.headers.get("location")?.slice(0, 180) ?? null;
    } catch {
      try {
        const res = await fetch(`http://${item.domain}/`, {
          method: "HEAD",
          redirect: "manual",
          signal: AbortSignal.timeout(2500),
          headers: { "User-Agent": "ARDI-Security-Scanner/1.0" },
        });
        httpStatus = res.status;
        redirectTarget = res.headers.get("location")?.slice(0, 180) ?? null;
      } catch {
        // Registered IP without open web port
      }
    }
  }

  let risk: LookalikeCandidate["risk"] = "none";
  if (registered) {
    if (
      item.kind === "brand-keyword" ||
      (mx.length > 0 && httpStatus !== null)
    ) {
      risk = "high";
    } else if (httpStatus !== null || mx.length > 0) {
      risk = "medium";
    } else {
      risk = "low";
    }
  }

  return {
    domain: item.domain,
    kind: item.kind,
    registered,
    ipv4: ipv4.slice(0, 4),
    hasMail: mx.length > 0,
    httpStatus,
    redirectTarget,
    risk,
  };
}

const RISK_RANK: Record<LookalikeCandidate["risk"], number> = {
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
};

export async function scanLookalikeDomains(
  rawDomain: string,
): Promise<LookalikeScanResult> {
  const domain = normalizePublicDomain(rawDomain);
  const candidates = buildLookalikeCandidates(domain);

  const results = await Promise.all(candidates.map(probeCandidate));
  results.sort(
    (a, b) =>
      RISK_RANK[b.risk] - RISK_RANK[a.risk] ||
      Number(b.registered) - Number(a.registered) ||
      a.domain.localeCompare(b.domain),
  );

  const registeredCount = results.filter((r) => r.registered).length;
  const highRiskCount = results.filter((r) => r.risk === "high").length;

  return {
    domain,
    checkedAt: new Date().toISOString(),
    checkedCount: results.length,
    registeredCount,
    highRiskCount,
    candidates: results,
  };
}
