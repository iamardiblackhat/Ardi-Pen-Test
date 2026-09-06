import { useEffect, useRef, useState, type FormEvent } from "react";
import { auth } from "@/lib/auth";

type ResearchResult = {
  subject: string;
  researchedAt: string;
  answer: string;
  sources: string[];
};

export function LiveResearch() {
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    if (!auth.isAuthenticated()) {
      const params = new URLSearchParams({
        next: "intelligence",
        search: String(fields.get("subject") ?? ""),
      });
      window.location.assign(`/login?${params.toString()}`);
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const response = await fetch("/api/osint/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${auth.getToken()}`,
        },
        body: JSON.stringify(Object.fromEntries(fields)),
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Live research could not complete.");
      if (!controller.signal.aborted) setResult(body);
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Live research could not complete.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <section className="intel-map" aria-labelledby="live-research-title">
      <h2 id="live-research-title" className="text-2xl font-semibold">
        Search public information now
      </h2>
      <p className="mt-3 text-base leading-7 text-slate-400">
        Research beyond your saved results. Search public sources about a
        company, website, person, or cyber threat.
      </p>
      <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          Subject
          <input
            name="subject"
            required
            minLength={2}
            maxLength={200}
            placeholder="Company, website, name, or threat"
            className="min-h-12 rounded-lg border border-slate-500 bg-[#0c1125] px-3 text-base"
          />
        </label>
        <label className="grid gap-2">
          Search region
          <select
            name="region"
            defaultValue="uk"
            className="min-h-12 rounded-lg border border-slate-500 bg-[#0c1125] px-3 text-base"
          >
            <option value="uk">United Kingdom</option>
            <option value="europe">UK and Europe</option>
            <option value="global">Worldwide</option>
          </select>
        </label>
        <label className="grid gap-2">
          Research type
          <select
            name="objective"
            defaultValue="organisation"
            className="min-h-12 rounded-lg border border-slate-500 bg-[#0c1125] px-3 text-base"
          >
            <option value="organisation">Company or organisation</option>
            <option value="domain">Website</option>
            <option value="person">Public information about a person</option>
            <option value="incident">Incident</option>
            <option value="threat">Cyber threat</option>
            <option value="exposure">Publicly exposed information</option>
          </select>
        </label>
        <label className="grid gap-2 sm:col-span-2">
          What do you want to find out?
          <textarea
            name="question"
            required
            minLength={5}
            maxLength={2000}
            rows={3}
            className="rounded-lg border border-slate-500 bg-[#0c1125] p-3 text-base"
          />
        </label>
        <button
          disabled={loading}
          className="min-h-12 rounded-lg bg-cyan-200 px-5 font-semibold text-indigo-950 disabled:opacity-60"
        >
          {loading
            ? "Searching public sources…"
            : auth.isAuthenticated()
              ? "Run live research"
              : "Sign in to run research"}
        </button>
      </form>
      {loading ? (
        <p role="status" className="mt-4">
          Waiting for the connected research service. This can take up to 90
          seconds.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-4 text-rose-200">
          {error}
        </p>
      ) : null}
      {result ? (
        <article className="mt-6 border-t border-slate-600 pt-5">
          <h3 className="text-xl font-semibold">Research: {result.subject}</h3>
          <p className="mt-2 text-sm text-slate-400">
            Retrieved{" "}
            <time dateTime={result.researchedAt}>
              {new Date(result.researchedAt).toLocaleString("en-GB")}
            </time>
            . This is the retrieval time, not the publication date of every
            source.
          </p>
          <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7">
            {result.answer}
          </p>
          <h4 className="mt-5 font-semibold">Sources returned by the search</h4>
          <ul className="mt-3 space-y-3">
            {result.sources.map((source) => (
              <li key={source}>
                <a
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-cyan-200 underline underline-offset-4"
                >
                  {source}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  );
}
