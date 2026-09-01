/**
 * ARDI SEC LIVE LAB — OPENCTI OPERATIONS DASHBOARD
 * A compact, Filigran-inspired intelligence workbench. Every row comes from
 * the configured OpenCTI backend; no sample entities, static totals, or
 * placeholder table content is permitted in this component.
 */
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownUp, DatabaseZap, Filter, LoaderCircle, Radar, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { auth } from '@/lib/auth';

type IntelligenceRecord = {
  id: string;
  standardId: string;
  entityType: string;
  title: string;
  createdAt: string;
  labels: string[];
};

type IntelligenceResponse = {
  configured: boolean;
  records: IntelligenceRecord[];
  supportedTypes: string[];
  error?: string;
};

type SortKey = 'createdAt' | 'title' | 'entityType';

function prettyType(type: string) {
  return type.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Source did not supply a date' : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function Intelligence() {
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [data, setData] = useState<IntelligenceResponse>({ configured: false, records: [], supportedTypes: [] });
  const [entityType, setEntityType] = useState('ALL');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [descending, setDescending] = useState(true);

  const load = async (requestedType = entityType) => {
    setState('loading');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (requestedType !== 'ALL') params.set('types', requestedType);
      const response = await fetch(`/api/intelligence/feed?${params.toString()}`, {
        headers: auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {},
      });
      const body = await response.json() as IntelligenceResponse;
      setData(body);
      setState(response.ok ? 'ready' : 'unavailable');
    } catch {
      setData({ configured: true, records: [], supportedTypes: [], error: 'The configured OpenCTI source is unavailable.' });
      setState('unavailable');
    }
  };

  useEffect(() => { void load('ALL'); }, []);

  const visibleRecords = useMemo(() => {
    const search = query.trim().toLowerCase();
    const rows = data.records.filter((record) => !search || [record.title, record.standardId, record.entityType, ...record.labels].join(' ').toLowerCase().includes(search));
    return [...rows].sort((a, b) => {
      const first = sortKey === 'createdAt' ? new Date(a.createdAt).getTime() : a[sortKey].toLowerCase();
      const second = sortKey === 'createdAt' ? new Date(b.createdAt).getTime() : b[sortKey].toLowerCase();
      const comparison = typeof first === 'number' && typeof second === 'number' ? first - second : String(first).localeCompare(String(second));
      return descending ? -comparison : comparison;
    });
  }, [data.records, query, sortKey, descending]);

  const changeType = (type: string) => {
    setEntityType(type);
    setQuery('');
    void load(type);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setDescending((value) => !value);
    else { setSortKey(key); setDescending(key === 'createdAt'); }
  };

  const sourceStatus = state === 'loading' ? 'Checking source' : !data.configured ? 'Not configured' : state === 'unavailable' ? 'Unavailable' : 'Connected';

  return <div className="min-h-full bg-[#100d29] text-[#f8f7ff]">
    <div className="border-b border-white/10 bg-[#151035]/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center border border-cyan-200/30 bg-cyan-300/10 text-cyan-200"><Radar className="h-4 w-4" /></span><div><p className="font-mono text-[9px] font-semibold tracking-[.16em] text-cyan-200">ARDI SEC / INTELLIGENCE OPS</p><h1 className="mt-0.5 text-sm font-semibold tracking-tight text-white sm:text-base">OpenCTI threat intelligence workspace</h1></div></div>
        <button type="button" onClick={() => void load()} disabled={state === 'loading'} className="inline-flex items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 text-[10px] font-bold tracking-[.1em] text-white uppercase transition hover:border-cyan-200/50 hover:bg-white/10 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 text-cyan-200 ${state === 'loading' ? 'animate-spin' : ''}`} /> Refresh source</button>
      </div>
    </div>

    <main className="mx-auto grid max-w-[1600px] gap-0 lg:grid-cols-[262px_minmax(0,1fr)]">
      <aside className="border-b border-white/10 bg-[#151035] px-4 py-5 lg:min-h-[calc(100vh-69px)] lg:border-r lg:border-b-0 lg:px-5">
        <p className="font-mono text-[9px] font-semibold tracking-[.16em] text-[#a9a2d5]">SOURCE CONTROL</p>
        <div className="mt-3 border border-white/10 bg-[#1d1746] p-3"><div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-white">OpenCTI</span><span className={`h-2 w-2 rounded-full ${sourceStatus === 'Connected' ? 'bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,.1)]' : sourceStatus === 'Checking source' ? 'bg-cyan-200 animate-pulse' : 'bg-slate-500'}`} /></div><p className="mt-2 font-mono text-[9px] tracking-[.1em] text-[#bdb7e6] uppercase">{sourceStatus}</p></div>
        <div className="mt-7"><div className="flex items-center gap-2"><Filter className="h-3.5 w-3.5 text-cyan-200" /><p className="font-mono text-[9px] font-semibold tracking-[.16em] text-[#a9a2d5]">ENTITY TYPE</p></div><div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 lg:block lg:space-y-1">{['ALL', ...data.supportedTypes].map((type) => <button key={type} type="button" onClick={() => changeType(type)} className={`shrink-0 border px-3 py-2 text-left text-[11px] font-medium transition lg:flex lg:w-full lg:items-center lg:justify-between ${entityType === type ? 'border-violet-300/50 bg-violet-400/15 text-white' : 'border-transparent text-[#bdb7e6] hover:border-white/10 hover:bg-white/5 hover:text-white'}`}><span>{type === 'ALL' ? 'All records' : prettyType(type)}</span>{entityType === type && <span className="hidden h-1.5 w-1.5 rounded-full bg-cyan-200 lg:block" />}</button>)}</div></div>
        <div className="mt-7 border-t border-white/10 pt-5"><p className="font-mono text-[9px] font-semibold tracking-[.16em] text-[#a9a2d5]">DATA RULE</p><p className="mt-2 text-[11px] leading-5 text-[#c5c0e6]">Rows appear only after the configured source returns them. There are no preloaded indicators or sample entities.</p></div>
      </aside>

      <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-end">
          <div><p className="font-mono text-[9px] font-semibold tracking-[.16em] text-violet-300">INTELLIGENCE / OPERATIONAL TABLE</p><h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl">Know what the source is telling you.</h2></div>
          <div className="flex flex-col gap-2 sm:flex-row"><label className="flex min-w-0 items-center gap-2 border border-white/15 bg-white/5 px-3 py-2.5 text-[#bdb7e6] focus-within:border-cyan-200/60 sm:w-[280px]"><Search className="h-4 w-4 shrink-0 text-cyan-200" /><span className="sr-only">Search live OpenCTI records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search returned records" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#a9a2d5]" /></label><div className="flex items-center border border-white/15 bg-white/5 px-3 py-2.5 font-mono text-[9px] tracking-[.1em] text-[#c5c0e6]"><SlidersHorizontal className="mr-2 h-3.5 w-3.5 text-violet-300" /> {state === 'ready' && data.configured ? `${visibleRecords.length} visible` : 'SOURCE-BOUND'}</div></div>
        </div>

        {state === 'loading' && <div className="flex min-h-[360px] items-center justify-center"><div className="flex items-center gap-3 text-sm text-[#c5c0e6]"><LoaderCircle className="h-5 w-5 animate-spin text-cyan-200" /> Requesting the configured source</div></div>}
        {state === 'ready' && !data.configured && <EmptyState icon={DatabaseZap} title="Connect OpenCTI to populate the operations table." body="Set both OPENCTI_URL and OPENCTI_TOKEN on the API server. This dashboard intentionally holds no static intelligence until the real source is available." />}
        {state === 'unavailable' && <EmptyState icon={AlertTriangle} title="The configured OpenCTI source is unavailable." body={data.error ?? 'The source did not return a usable response. Check its endpoint and token before using this workspace.'} tone="amber" />}
        {state === 'ready' && data.configured && visibleRecords.length === 0 && <EmptyState icon={Radar} title={data.records.length ? 'No returned records match this search.' : 'The source returned no matching intelligence records.'} body={data.records.length ? 'Clear the search or choose a different entity type.' : 'This is a real empty state from the current OpenCTI query.'} />}
        {state === 'ready' && data.configured && visibleRecords.length > 0 && <div className="mt-5 overflow-hidden border border-white/10 bg-[#171139] shadow-[0_24px_55px_-45px_rgba(4,2,20,.95)]"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-white/10 bg-[#20194a] font-mono text-[9px] font-semibold tracking-[.12em] text-[#bcb5e4]"><tr><SortHead label="ENTITY" onClick={() => toggleSort('title')} active={sortKey === 'title'} descending={descending} /><SortHead label="TYPE" onClick={() => toggleSort('entityType')} active={sortKey === 'entityType'} descending={descending} /><th className="px-4 py-3">LABELS</th><th className="px-4 py-3">SOURCE ID</th><SortHead label="CREATED" onClick={() => toggleSort('createdAt')} active={sortKey === 'createdAt'} descending={descending} /></tr></thead><tbody>{visibleRecords.map((record) => <tr key={record.id} className="border-b border-white/[.07] transition hover:bg-white/[.045]"><td className="max-w-[300px] px-4 py-4"><p className="truncate text-sm font-semibold text-white">{record.title}</p></td><td className="px-4 py-4"><span className="whitespace-nowrap border border-violet-300/20 bg-violet-400/10 px-2 py-1 font-mono text-[9px] tracking-wide text-violet-200">{prettyType(record.entityType)}</span></td><td className="max-w-[190px] px-4 py-4"><div className="flex flex-wrap gap-1">{record.labels.length ? record.labels.slice(0, 3).map((label) => <span key={label} className="max-w-[120px] truncate border border-cyan-200/15 bg-cyan-200/[.06] px-1.5 py-0.5 text-[9px] text-cyan-100">{label}</span>) : <span className="text-[11px] text-[#9791bd]">—</span>}</div></td><td className="px-4 py-4 font-mono text-[10px] text-[#c2bde2]">{record.standardId}</td><td className="whitespace-nowrap px-4 py-4 text-[11px] text-[#bdb7dc]">{displayDate(record.createdAt)}</td></tr>)}</tbody></table></div></div>}
      </section>
    </main>
  </div>;
}

function SortHead({ label, onClick, active, descending }: { label: string; onClick: () => void; active: boolean; descending: boolean }) {
  return <th className="px-4 py-3"><button type="button" onClick={onClick} className={`inline-flex items-center gap-1 transition hover:text-white ${active ? 'text-cyan-200' : ''}`}>{label}{active && <ArrowDownUp className={`h-3 w-3 ${descending ? '' : 'rotate-180'}`} />}</button></th>;
}

function EmptyState({ icon: Icon, title, body, tone = 'violet' }: { icon: typeof DatabaseZap; title: string; body: string; tone?: 'violet' | 'amber' }) {
  const palette = tone === 'amber' ? 'border-amber-300/25 bg-amber-300/10 text-amber-100' : 'border-violet-300/25 bg-violet-400/10 text-violet-100';
  return <div className="mt-5 border border-white/10 bg-[#171139] p-7 sm:p-9"><div className={`grid h-10 w-10 place-items-center border ${palette}`}><Icon className="h-5 w-5" /></div><h3 className="mt-5 text-lg font-semibold tracking-tight text-white">{title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#c5c0e6]">{body}</p></div>;
}
