import { BotazezConnection } from "./components/botazez-connection";
import { useEffect, useState } from "react";
import { IntelligenceSearchHeader } from "./components/intelligence-search-header";
import { PageEmpty, PageError, PageLoading } from "@/shared/ui/page-state";
import { fetchIntelligenceFeed } from "./intelligence-api";
import type { IntelligenceFeed } from "./intelligence-types";
import { IntelligenceSummary } from "./components/intelligence-summary";
import { IntelligenceRecordList } from "./components/intelligence-record-list";
import { LiveResearch } from "./components/live-research";
import { IntelligenceBreakdown } from "./components/intelligence-breakdown";
import "./intelligence-dashboard.css";
import { Link } from "wouter";

import { auth } from "@/lib/auth";
import { routes } from "@/shared/config/routes";

export function WorkspaceThreatFeed() {
  return <IntelligenceBody embedded />;
}

export default function IntelligencePage() {
  return <IntelligenceBody embedded={false} />;
}

function IntelligenceBody({ embedded }: { embedded: boolean }) {
  const initialSearch =
    new URLSearchParams(window.location.search).get("search") ?? "";
  const [query, setQuery] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [feed, setFeed] = useState<IntelligenceFeed | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const signedIn = auth.isAuthenticated();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setFeed(null);
    fetchIntelligenceFeed(search, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setFeed(result);
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted)
          setError(
            requestError instanceof Error
              ? requestError.message
              : "The live intelligence feed could not be loaded.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, reloadKey]);

  function runSearch(value: string) {
    setQuery(value);
    setSearch(value);
    setReloadKey((revision) => revision + 1);
  }

  const notConfigured = /not configured/i.test(error);

  return (
    <main className={embedded ? "intel-dashboard px-4 py-6 sm:px-8" : "intel-dashboard min-h-screen px-4 py-6 sm:px-6 sm:py-8 lg:px-10"}>
      <div className="mx-auto max-w-7xl space-y-7">
        {embedded ? (
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-200">
              Step 1 · Research
            </p>
            <h1 className="mt-2 text-3xl font-bold">Cyber-threat intelligence</h1>
            <p className="mt-2 max-w-2xl text-base text-slate-300">
              Search available source records and review the evidence behind them.
            </p>
          </div>
        ) : (
          <nav
            aria-label="Dashboard navigation"
            className="flex flex-wrap gap-6 text-base"
          >
            <Link href={routes.home}>ARDI SEC</Link>
            <Link href={routes.capabilities}>All tools</Link>
            <Link href={signedIn ? routes.dashboard : routes.login}>
              {signedIn ? "Your workspace" : "Sign in"}
            </Link>
          </nav>
        )}
        <BotazezConnection />
        <IntelligenceSearchHeader
          query={query}
          search={search}
          platformUrl={feed?.platformUrl}
          vulnerabilityFeed={feed?.provider === "botazez"}
          onQueryChange={setQuery}
          onSearch={runSearch}
        />

        {feed?.provider === "botazez" && !loading && !error ? (
          <aside className="ardi-glass-card p-5 text-base leading-7 text-slate-200" aria-label="Connected intelligence source">
            <p className="font-semibold text-emerald-100">{feed.sourceName}</p>
            <p className="mt-2">{feed.coverage}</p>
            <p className="mt-2">Catalogue inclusion confirms known exploitation; it does not assign a severity score.</p>
            <a href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog" target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-cyan-200 underline underline-offset-4">View the full CISA catalogue<span className="sr-only"> (opens in a new tab)</span></a>
          </aside>
        ) : null}
        {loading ? (
          <PageLoading label="Loading live threat intelligence" />
        ) : null}
        {error ? (
          <PageError
            title={notConfigured ? "Threat feed is not set up" : "Live intelligence is unavailable"}
            description={
              notConfigured
                ? "The intelligence connection is unavailable. Please try again shortly."
                : error
            }
            onRetry={() => setReloadKey((value) => value + 1)}
          />
        ) : null}
        {!loading && !error && feed ? (
          <IntelligenceSummary feed={feed} />
        ) : null}
        {embedded ? null : <LiveResearch />}
        {feed && !loading && !error ? (
          <IntelligenceBreakdown feed={feed} />
        ) : null}
        {!loading && !error && feed?.records.length ? (
          <IntelligenceRecordList records={feed.records} vulnerabilityFeed={feed.provider === "botazez"} />
        ) : null}
        {!loading && !error && feed && !feed.records.length ? (
          <PageEmpty
            title="No matching intelligence records"
            description="The connected intelligence sources returned no records for this search."
          />
        ) : null}
      </div>

    </main>
  );
}
