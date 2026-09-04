export type IntelligenceRecordKind =
  | 'campaign'
  | 'threat-actor'
  | 'malware'
  | 'attack-pattern'
  | 'indicator'
  | 'report'
  | 'vulnerability';

export type IntelligenceRecord = {
  id: string;
  standardId: string;
  kind: IntelligenceRecordKind;
  name: string;
  description: string | null;
  aliases: string[];
  confidence: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  reference: string | null;
  pattern: string | null;
};

export type IntelligenceFeed = {
  configured: boolean;
  connected: boolean;
  version: string;
  platformUrl: string | null;
  generatedAt: string;
  totals: Record<IntelligenceRecordKind, number>;
  records: IntelligenceRecord[];
};
