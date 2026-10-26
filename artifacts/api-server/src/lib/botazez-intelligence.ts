import type { IntelligenceFeed } from "@workspace/threat-intel";

const FEED_URL = "https://botazez.com/api/cyber-threats";
const MAX_BYTES = 1_000_000;
const CACHE_MS = 5 * 60_000;
const CATALOGUE = "https://www.cisa.gov/known-exploited-vulnerabilities-catalog";
type Snapshot = { payload: unknown; fetchedAt: string; expiresAt: number };

function dateAdded(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date.toISOString() : null;
}
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

/** Ignore upstream severity and aggregate risk labels: KEV inclusion is not CVSS severity. */
export function normalizeBotazezFeed(payload: unknown, fetchedAt: string, search = "", limit = 10) {
  const body = payload as { threats?: unknown; stats?: { cisa_total?: unknown }; error?: unknown } | null;
  if (!body || body.error || !Array.isArray(body.threats) || body.threats.length > 500 || typeof body.stats?.cisa_total !== "number" || !Number.isInteger(body.stats.cisa_total) || body.stats.cisa_total <= 0) {
    throw new Error("Botazez did not return a valid CISA feed.");
  }
  const seen = new Set<string>();
  const records = body.threats.flatMap(raw => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    const id = text(row.id, 50).toUpperCase();
    const name = text(row.name, 300);
    if (!/^CVE-\d{4}-\d{4,19}$/.test(id) || !name || row.source !== "CISA KEV" || seen.has(id)) return [];
    seen.add(id);
    const vendor = text(row.vendor, 150), product = text(row.product, 200);
    return [{
      id: `botazez:${id}`, standardId: id, kind: "vulnerability" as const, name,
      description: text(row.description, 6000) || null,
      aliases: [vendor, product].filter(Boolean), confidence: null,
      createdAt: dateAdded(row.date), updatedAt: null, reference: id, pattern: null,
      sourceUrl: `https://www.cve.org/CVERecord?id=${id}`,
    }];
  });
  if (!records.length) throw new Error("Botazez returned no usable CISA records.");
  const terms = search.trim().toLowerCase().slice(0, 200).split(/\s+/).filter(Boolean);
  const matches = records.filter(record => {
    const haystack = [record.standardId, record.name, record.description, ...record.aliases].join(" ").toLowerCase();
    return terms.every(term => haystack.includes(term));
  });
  const feed: IntelligenceFeed = {
    generatedAt: fetchedAt,
    totals: { campaign: 0, "threat-actor": 0, malware: 0, "attack-pattern": 0, indicator: 0, report: 0, vulnerability: matches.length },
    records: matches.slice(0, Math.max(1, Math.min(50, Number.isFinite(limit) ? limit : 10))),
  };
  return {
    ...feed, configured: true as const, connected: true as const, version: "botazez-cisa-v1", platformUrl: "https://botazez.com/",
    provider: "botazez" as const, sourceName: "CISA Known Exploited Vulnerabilities via Botazez", sourceUrl: CATALOGUE,
    coverage: `Search covers ${records.length} recent vulnerability records supplied by Botazez. It does not cover attacker groups or campaigns.`,
    availableKinds: ["vulnerability"],
    records: feed.records.map(record => ({ ...record, sourceUrl: `https://www.cve.org/CVERecord?id=${record.standardId}` })),
  };
}

/** Fixed public upstream, bounded response, timeout and shared cache; no visitor credentials leave ARDI. */
export function createBotazezFeedLoader(fetcher: typeof fetch = fetch, now: () => number = Date.now) {
  let cache: Snapshot | undefined;
  let pending: Promise<Snapshot> | undefined;
  return async (search = "", limit = 10) => {
    if (!cache || cache.expiresAt <= now()) {
      if (!pending) pending = (async () => {
        const response = await fetcher(FEED_URL, { signal: AbortSignal.timeout(10_000), redirect: "error", headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Botazez cyber intelligence is unavailable.");
        if (!response.headers.get("content-type")?.includes("application/json") || !response.body) throw new Error("Botazez returned an invalid feed response.");
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let length = 0;
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            length += part.value.byteLength;
            if (length > MAX_BYTES) { await reader.cancel(); throw new Error("Botazez feed response is too large."); }
            chunks.push(part.value);
          }
        } finally { reader.releaseLock(); }
        const bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
        const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
        const fetchedAt = new Date(now()).toISOString();
        normalizeBotazezFeed(payload, fetchedAt);
        return { payload, fetchedAt, expiresAt: now() + CACHE_MS };
      })();
      try { cache = await pending; } finally { pending = undefined; }
    }
    return normalizeBotazezFeed(cache.payload, cache.fetchedAt, search, limit);
  };
}
export const loadBotazezFeed = createBotazezFeedLoader();
