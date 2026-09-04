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

export async function searchThreatIntelligence(input: {
  query: string;
  limit: number;
}) {
  if (!client) {
    return {
      connected: false,
      error: "The live threat intelligence service is not configured.",
      records: [],
    };
  }

  const health = await client.healthCheck();
  if (!health.supported) {
    return {
      connected: false,
      error: "The live threat intelligence service is running an unsupported version.",
      records: [],
    };
  }

  const feed = await loadIntelligenceFeed(client, {
    search: input.query,
    firstPerType: Math.min(input.limit, 20),
  });

  return {
    connected: true,
    searchedAt: feed.generatedAt,
    totalMatches: Object.values(feed.totals).reduce((sum, count) => sum + count, 0),
    records: feed.records.slice(0, input.limit),
  };
}
