import { FormEvent, useEffect, useState } from 'react';
import { ArrowUpRight, LoaderCircle, RefreshCw, Search } from 'lucide-react';
import { PageEmpty, PageError, PageLoading } from '@/shared/ui/page-state';
import { fetchIntelligenceFeed } from './intelligence-api';
import type { IntelligenceFeed } from './intelligence-types';
import { IntelligenceSummary } from './components/intelligence-summary';
import { IntelligenceRecordList } from './components/intelligence-record-list';

export default function IntelligencePage() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [feed, setFeed] = useState<IntelligenceFeed | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchIntelligenceFeed(search, controller.signal)
      .then(setFeed)
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : 'The live intelligence feed could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, reloadKey]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(query.trim());
  }

  return (
    <div className="min-h-full bg-[#f3f6ff] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="overflow-hidden rounded-[1.75rem] border border-violet-200 bg-[radial-gradient(circle_at_85%_8%,rgba(90,220,255,.25),transparent_28%),linear-gradient(125deg,#17123b,#312669)] p-6 text-white shadow-[0_25px_55px_-38px_rgba(49,46,129,.65)] sm:p-9">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div><p className="flex items-center gap-2 font-mono text-sm font-semibold tracking-[.1em] text-cyan-200"><span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_#6ee7b7]" /> LIVE THREAT INTELLIGENCE</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Search real campaigns, actors, malware, indicators, and vulnerabilities.</h1><p className="mt-4 max-w-2xl text-base leading-7 text-indigo-100">One connected intelligence workspace for investigating threats and adding context to ARDI’s security work.</p></div>
            {feed?.platformUrl ? <a href={feed.platformUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200/45 bg-cyan-200 px-5 text-sm font-semibold text-indigo-950 transition hover:bg-white">Open full intelligence dashboard <ArrowUpRight className="h-4 w-4" /></a> : null}
          </div>
          <form onSubmit={submit} className="mt-7 flex max-w-3xl flex-col gap-3 sm:flex-row"><label htmlFor="intelligence-search" className="sr-only">Search live threat intelligence</label><input id="intelligence-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a threat actor, campaign, CVE, malware, or technique" className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 text-base text-white outline-none placeholder:text-indigo-200/65 focus:border-cyan-200 focus:ring-2 focus:ring-cyan-200/30" /><button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-indigo-950 transition hover:bg-cyan-100"><Search className="h-4 w-4" />Search intelligence</button>{search ? <button type="button" onClick={() => { setQuery(''); setSearch(''); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10"><RefreshCw className="h-4 w-4" />Reset</button> : null}</form>
        </header>

        {loading ? <PageLoading label="Loading live threat intelligence" /> : null}
        {error ? <PageError title="Live intelligence is unavailable" description={error} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
        {!loading && !error && feed ? <IntelligenceSummary feed={feed} /> : null}
        {!loading && !error && feed?.records.length ? <IntelligenceRecordList records={feed.records} /> : null}
        {!loading && !error && feed && !feed.records.length ? <PageEmpty title="No matching intelligence records" description="The connected intelligence sources returned no records for this search." /> : null}
        {loading ? <span className="sr-only"><LoaderCircle className="animate-spin" />Loading</span> : null}
      </div>
    </div>
  );
}
