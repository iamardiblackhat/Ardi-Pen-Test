import type { IntelligenceRecord, IntelligenceRecordKind } from '../intelligence-types';

const labels: Record<IntelligenceRecordKind, string> = {
  campaign: 'Campaign',
  'threat-actor': 'Threat actor',
  malware: 'Malware',
  'attack-pattern': 'Attack pattern',
  indicator: 'Indicator',
  report: 'Report',
  vulnerability: 'Vulnerability',
};

export function IntelligenceRecordList({ records }: { records: IntelligenceRecord[] }) {
  return (
    <section aria-labelledby="intelligence-results-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div><p className="font-mono text-sm font-semibold tracking-[.08em] text-violet-600">VERIFIED SOURCE RECORDS</p><h2 id="intelligence-results-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">Latest intelligence</h2></div>
        <p className="text-sm text-slate-500">{records.length} shown</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {records.map((record) => (
          <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_34px_-28px_rgba(30,41,59,.32)]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-sm font-semibold text-violet-700">{labels[record.kind]}</span>
              {record.reference ? <span className="font-mono text-sm text-slate-500">{record.reference}</span> : null}
              {record.confidence !== null ? <span className="ml-auto text-sm text-slate-500">Confidence {record.confidence}%</span> : null}
            </div>
            <h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950">{record.name}</h3>
            <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-600">{record.description || record.pattern || 'The source record does not include a description.'}</p>
            {record.aliases.length ? <p className="mt-4 text-sm text-slate-500"><span className="font-semibold text-slate-700">Also known as:</span> {record.aliases.join(', ')}</p> : null}
            <p className="mt-4 font-mono text-sm text-slate-400">Updated {formatDate(record.updatedAt ?? record.createdAt)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : 'date unavailable';
}
