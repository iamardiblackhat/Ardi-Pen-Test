import type {
  IntelligenceFeed,
  IntelligenceRecord,
  IntelligenceRecordKind,
} from "./types";
import { INTELLIGENCE_FEED } from "./queries";
import type { OpenCtiClient } from "./client";

type RawNode = {
  id: string;
  standard_id: string;
  name: string;
  description: string | null;
  aliases?: string[] | null;
  created?: string | null;
  modified?: string | null;
  confidence?: number | null;
  x_mitre_id?: string | null;
  pattern?: string | null;
  report_types?: string[] | null;
  x_opencti_cvss_base_severity?: string | null;
};

type Connection = {
  pageInfo: { globalCount: number };
  edges: Array<{ node: RawNode }>;
};

type FeedResponse = {
  campaigns: Connection;
  intrusionSets: Connection;
  malwares: Connection;
  attackPatterns: Connection;
  indicators: Connection;
  reports: Connection;
  vulnerabilities: Connection;
};

const groups: Array<[keyof FeedResponse, IntelligenceRecordKind]> = [
  ["campaigns", "campaign"],
  ["intrusionSets", "threat-actor"],
  ["malwares", "malware"],
  ["attackPatterns", "attack-pattern"],
  ["indicators", "indicator"],
  ["reports", "report"],
  ["vulnerabilities", "vulnerability"],
];

export async function loadIntelligenceFeed(
  client: OpenCtiClient,
  options: { search?: string; firstPerType?: number } = {},
): Promise<IntelligenceFeed> {
  const first = Math.min(Math.max(options.firstPerType ?? 8, 1), 25);
  const search = options.search?.trim().slice(0, 200) || null;
  const data = await client.request<FeedResponse>(INTELLIGENCE_FEED, { first, search });
  const totals = {} as Record<IntelligenceRecordKind, number>;
  const records: IntelligenceRecord[] = [];

  for (const [key, kind] of groups) {
    const connection = data[key];
    totals[kind] = connection.pageInfo.globalCount;
    records.push(...connection.edges.map(({ node }) => normalizeRecord(node, kind)));
  }

  records.sort((left, right) =>
    (right.updatedAt ?? right.createdAt ?? "").localeCompare(
      left.updatedAt ?? left.createdAt ?? "",
    ),
  );

  return { generatedAt: new Date().toISOString(), totals, records };
}

function normalizeRecord(node: RawNode, kind: IntelligenceRecordKind): IntelligenceRecord {
  const reference =
    node.x_mitre_id ??
    node.report_types?.join(", ") ??
    node.x_opencti_cvss_base_severity ??
    null;

  return {
    id: node.id,
    standardId: node.standard_id,
    kind,
    name: node.name,
    description: node.description,
    aliases: node.aliases ?? [],
    confidence: node.confidence ?? null,
    createdAt: node.created ?? null,
    updatedAt: node.modified ?? null,
    reference,
    pattern: node.pattern ?? null,
  };
}
