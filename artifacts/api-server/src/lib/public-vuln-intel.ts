/**
 * Public vulnerability intelligence: CISA Known Exploited Vulnerabilities and
 * FIRST.org EPSS. Both are free, authoritative, unauthenticated feeds, so they
 * work on every deployment even without a private OpenCTI server.
 *
 * Every function returns real upstream data or null/empty on failure. Nothing
 * here ever fabricates a score.
 */

const KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";
const EPSS_URL = "https://api.first.org/data/v1/epss";
const KEV_CACHE_MS = 6 * 60 * 60_000;
const EPSS_CACHE_MS = 6 * 60 * 60_000;

export interface KevEntry {
  cveID: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  shortDescription?: string;
  requiredAction?: string;
  dateAdded?: string;
  dueDate?: string;
  knownRansomwareCampaignUse?: string;
}

export interface EpssEntry {
  cve: string;
  epss: number;
  percentile: number;
  date: string;
}

let kevCache: { map: Map<string, KevEntry>; expiresAt: number } | null = null;
let kevPending: Promise<Map<string, KevEntry> | null> | null = null;
const epssCache = new Map<string, { entry: EpssEntry | null; expiresAt: number }>();

const CVE_RE = /^CVE-\d{4}-\d{4,19}$/;

/** CISA KEV catalogue keyed by upper-case CVE ID. Null if CISA is unreachable. */
export async function getKevMap(): Promise<Map<string, KevEntry> | null> {
  if (kevCache && kevCache.expiresAt > Date.now()) return kevCache.map;
  if (!kevPending) {
    kevPending = (async () => {
      try {
        const res = await fetch(KEV_URL, {
          signal: AbortSignal.timeout(10_000),
          headers: { accept: "application/json", "user-agent": "ARDI-SEC/1.0" },
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { vulnerabilities?: KevEntry[] };
        const map = new Map<string, KevEntry>();
        for (const v of body.vulnerabilities ?? []) {
          if (v?.cveID && CVE_RE.test(v.cveID.toUpperCase())) {
            map.set(v.cveID.toUpperCase(), v);
          }
        }
        if (map.size === 0) return null;
        kevCache = { map, expiresAt: Date.now() + KEV_CACHE_MS };
        return map;
      } catch {
        return null;
      } finally {
        kevPending = null;
      }
    })();
  }
  return kevPending;
}

/**
 * EPSS scores for up to 100 CVEs in one request. CVEs FIRST has no score for
 * are simply absent from the returned map.
 */
export async function getEpss(cves: readonly string[]): Promise<Map<string, EpssEntry>> {
  const out = new Map<string, EpssEntry>();
  const now = Date.now();
  const wanted: string[] = [];
  for (const raw of cves) {
    const cve = raw.toUpperCase();
    if (!CVE_RE.test(cve)) continue;
    const cached = epssCache.get(cve);
    if (cached && cached.expiresAt > now) {
      if (cached.entry) out.set(cve, cached.entry);
    } else if (!wanted.includes(cve)) {
      wanted.push(cve);
    }
  }
  for (let i = 0; i < wanted.length; i += 100) {
    const batch = wanted.slice(i, i + 100);
    try {
      const res = await fetch(`${EPSS_URL}?cve=${batch.join(",")}`, {
        signal: AbortSignal.timeout(8_000),
        headers: { accept: "application/json", "user-agent": "ARDI-SEC/1.0" },
      });
      if (!res.ok) continue;
      const body = (await res.json()) as {
        data?: Array<{ cve?: string; epss?: string; percentile?: string; date?: string }>;
      };
      const seen = new Set<string>();
      for (const row of body.data ?? []) {
        const cve = row.cve?.toUpperCase();
        const epss = Number(row.epss);
        const percentile = Number(row.percentile);
        if (!cve || !Number.isFinite(epss) || !Number.isFinite(percentile)) continue;
        const entry = { cve, epss, percentile, date: row.date ?? "" };
        out.set(cve, entry);
        epssCache.set(cve, { entry, expiresAt: now + EPSS_CACHE_MS });
        seen.add(cve);
      }
      // Remember genuine "no score" answers so we do not re-ask every request.
      for (const cve of batch) {
        if (!seen.has(cve)) epssCache.set(cve, { entry: null, expiresAt: now + EPSS_CACHE_MS });
      }
    } catch {
      // Upstream unavailable: leave these CVEs unscored rather than guessing.
    }
  }
  return out;
}
