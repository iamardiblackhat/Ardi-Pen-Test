import { ArrowUpRight, RefreshCw, Search } from "lucide-react";

type IntelligenceSearchHeaderProps = {
  query: string;
  search: string;
  platformUrl?: string | null;
  onQueryChange: (value: string) => void;
  onSearch: (value: string) => void;
};

export function IntelligenceSearchHeader({
  query,
  search,
  platformUrl,
  onQueryChange,
  onSearch,
}: IntelligenceSearchHeaderProps) {
  return (
    <header className="rounded-3xl border border-violet-300/30 bg-[linear-gradient(125deg,#17123b,#312669)] text-white">
      <p className="font-mono text-sm font-semibold tracking-wider text-cyan-200">
        ARDI THREAT INTELLIGENCE
      </p>
      <h1 className="mt-3 font-semibold tracking-tight">
        Understand the threats. Find the evidence.
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-indigo-100">
        Search known cyberattacks, the groups behind them, and the software they
        use. Read the source records and ask ARDI to explain what they mean.
      </p>
      {platformUrl ? (
        <a
          href={platformUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-12 items-center gap-2 text-cyan-200 underline underline-offset-4"
        >
          Advanced intelligence workspace{" "}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">
            (opens in a new tab; separate sign-in required)
          </span>
        </a>
      ) : null}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(query.trim());
        }}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="intelligence-search" className="sr-only">
          Search threat records
        </label>
        <input
          id="intelligence-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Try SolarWinds, ransomware, or a country name"
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/30 bg-white/10 px-4 text-base text-white placeholder:text-indigo-200"
        />
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-indigo-950 hover:bg-cyan-100"
        >
          <Search className="h-5 w-5" aria-hidden="true" />
          Search records
        </button>
        {search ? (
          <button
            type="button"
            onClick={() => onSearch("")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 px-4 hover:bg-white/10"
          >
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            Clear search
          </button>
        ) : null}
      </form>
    </header>
  );
}
