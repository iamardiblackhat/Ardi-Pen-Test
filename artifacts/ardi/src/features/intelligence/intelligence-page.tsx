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
import { ArdiLauncher, ArdiPanel } from "@/components/ardi-panel";
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
  const [ardiOpen, setArdiOpen] = useState(false);
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
            <h1 className="mt-2 text-3xl font-bold">Known attackers</h1>
            <p className="mt-2 max-w-2xl text-base text-slate-300">
              Search the connected threat feed. If it is not set up, this page says so. No attacker records are invented.
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
        <IntelligenceSearchHeader
          query={query}
          search={search}
          platformUrl={feed?.platformUrl}
          onQueryChange={setQuery}
          onSearch={runSearch}
        />

        {loading ? (
          <PageLoading label="Loading live threat intelligence" />
        ) : null}
        {error ? (
          <PageError
            title={notConfigured ? "Threat feed is not set up" : "Live intelligence is unavailable"}
            description={
              notConfigured
                ? "This server has no threat-intelligence connection. Website lookup and security checks still work."
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
          <IntelligenceRecordList records={feed.records} />
        ) : null}
        {!loading && !error && feed && !feed.records.length ? (
          <PageEmpty
            title="No matching intelligence records"
            description="The connected intelligence sources returned no records for this search."
          />
        ) : null}
      </div>
      {embedded ? null : (
        <>
          <ArdiLauncher onClick={() => setArdiOpen(true)} />
          <ArdiPanel
            open={ardiOpen}
            onClose={() => setArdiOpen(false)}
            authenticated={signedIn}
            context="The user is on the threat intelligence dashboard. Use the connected intelligence search tool before describing threat records."
          />
        </>
      )}
    </main>
  );
}
