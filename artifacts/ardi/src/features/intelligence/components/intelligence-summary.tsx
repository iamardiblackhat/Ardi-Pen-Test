import { Activity, Database, Radar, ShieldCheck } from "lucide-react";
import type { IntelligenceFeed } from "../intelligence-types";

export function IntelligenceSummary({ feed }: { feed: IntelligenceFeed }) {
  const total = Object.values(feed.totals).reduce(
    (sum, count) => sum + count,
    0,
  );
  const summaries = [
    {
      label: "Matching records",
      value: total.toLocaleString("en-GB"),
      icon: Database,
    },
    {
      label: "Threat actors",
      value: feed.totals["threat-actor"].toLocaleString("en-GB"),
      icon: Radar,
    },
    {
      label: "Campaigns",
      value: feed.totals.campaign.toLocaleString("en-GB"),
      icon: Activity,
    },
    {
      label: "Connection",
      value: feed.connected ? "Connected" : "Offline",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaries.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_30px_-26px_rgba(30,41,59,.38)]"
          >
            <dt className="flex items-center gap-2 text-base font-semibold text-slate-500">
              <Icon aria-hidden="true" className="h-4 w-4 text-violet-600" />
              {label}
            </dt>
            <dd className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-base leading-7 text-slate-400">
        Retrieved{" "}
        <time dateTime={feed.generatedAt}>
          {new Date(feed.generatedAt).toLocaleString("en-GB")}
        </time>
        . These are threat intelligence records, not a count of attacks
        happening now.
      </p>
    </div>
  );
}
