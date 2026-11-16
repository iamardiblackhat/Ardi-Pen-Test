import {
  OpenCtiClient,
  loadIntelligenceFeed,
  loadThreatIntelConfig,
} from "@workspace/threat-intel";

const config = loadThreatIntelConfig();
const client = config.enabled
  ? new OpenCtiClient({
      url: config.url!,
      token: config.token!,
      timeoutMs: config.timeoutMs,
    })
  : null;

const BOTAZEZ_FEED_URL = "https://botazez.com/api/cyber-threats";

async function searchBotazezCisaFeed(query: string, limit: number) {
  const res = await fetch(BOTAZEZ_FEED_URL, {
    signal: AbortSignal.timeout(10_000),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Botazez cyber-threat feed returned HTTP ${res.status}.`);
  }
  const body = (await res.json()) as {
    threats?: Array<Record<string, unknown>>;
    timestamp?: string;
  };
  const threats = Array.isArray(body?.threats) ? body.threats : [];
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const matched = threats
    .filter((row) => {
      if (!row || typeof row !== "object") return false;
      const haystack = [
        row.id,
        row.name,
        row.vendor,
        row.product,
        row.description,
      ]
        .filter((v): v is string => typeof v === "string")
        .join(" ")
        .toLowerCase();
      return terms.every((t) => haystack.includes(t));
    })
    .slice(0, Math.max(1, Math.min(20, limit)))
    .map((row) => {
      const cveId = String(row.id ?? "");
      return {
        id: `botazez:${cveId}`,
        standardId: cveId,
        kind: "vulnerability" as const,
        name: String(row.name ?? cveId),
        description:
          typeof row.description === "string" ? row.description : null,
        aliases: [row.vendor, row.product].filter(
          (v): v is string => typeof v === "string" && v.length > 0,
        ),
        createdAt: typeof row.date === "string" ? row.date : null,
        sourceUrl: `https://www.cve.org/CVERecord?id=${encodeURIComponent(cveId)}`,
      };
    });

  return {
    connected: true,
    provider: "botazez",
    searchedAt: body?.timestamp ?? new Date().toISOString(),
    totalMatches: matched.length,
    records: matched,
  };
}

export async function searchThreatIntelligence(input: {
  query: string;
  limit: number;
}) {
  if (client) {
    try {
      const health = await client.healthCheck();
      if (health.supported) {
        const feed = await loadIntelligenceFeed(client, {
          search: input.query,
          firstPerType: Math.min(input.limit, 20),
        });
        return {
          connected: true,
          searchedAt: feed.generatedAt,
          totalMatches: Object.values(feed.totals).reduce(
            (sum, count) => sum + count,
            0,
          ),
          records: feed.records.slice(0, input.limit),
        };
      }
    } catch {
      // Fall through to live Botazez CISA KEV records
    }
  }

  try {
    return await searchBotazezCisaFeed(input.query, input.limit);
  } catch (error) {
    return {
      connected: false,
      error:
        error instanceof Error
          ? error.message
          : "The live threat intelligence service is unavailable.",
      records: [],
    };
  }
}
