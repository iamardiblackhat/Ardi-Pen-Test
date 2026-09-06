import type {
  IntelligenceFeed,
  IntelligenceRecordKind,
} from "../intelligence-types";

const categories: Array<[IntelligenceRecordKind, string]> = [
  ["campaign", "Campaigns"],
  ["threat-actor", "Threat actors"],
  ["malware", "Malware"],
  ["attack-pattern", "Attack techniques"],
  ["indicator", "Indicators"],
  ["report", "Reports"],
  ["vulnerability", "Vulnerabilities"],
];

export function IntelligenceBreakdown({ feed }: { feed: IntelligenceFeed }) {
  const maximum = Math.max(1, ...Object.values(feed.totals));
  return (
    <section
      className="intel-breakdown"
      aria-labelledby="intel-breakdown-title"
    >
      <div className="intel-panel-heading">
        <div>
          <p>COLLECTION OVERVIEW</p>
          <h2 id="intel-breakdown-title">Intelligence by type</h2>
        </div>
      </div>
      <dl>
        {categories.map(([kind, label]) => (
          <div key={kind}>
            <dt>{label}</dt>
            <dd>{feed.totals[kind].toLocaleString("en-GB")}</dd>
            <div className="intel-bar" aria-hidden="true">
              <span
                style={{ width: `${(100 * feed.totals[kind]) / maximum}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
      <p>
        Counts reflect the current search. Zero means no matching records are
        available.
      </p>
    </section>
  );
}
