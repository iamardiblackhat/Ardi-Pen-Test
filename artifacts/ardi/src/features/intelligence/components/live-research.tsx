import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileText, Printer } from "lucide-react";
import { Button } from "@workspace/ardi-ds/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ardi-ds/components/ui/dialog";
import { auth } from "@/lib/auth";
import "../intelligence-dashboard.css";

type ResearchResult = {
  subject: string;
  researchedAt: string;
  answer: string;
  sources: string[];
  html?: string;
};

const SUBJECT_HISTORY_KEY = "ardi_subject_research_history";

function loadResearchHistory(): ResearchResult[] {
  try {
    const raw = localStorage.getItem(SUBJECT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ResearchResult[]).slice(0, 15) : [];
  } catch {
    return [];
  }
}

export function LiveResearch() {
  const [history, setHistory] = useState<ResearchResult[]>(() => loadResearchHistory());
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [dossierHtml, setDossierHtml] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"research" | "dossier">("research");
  const request = useRef<AbortController | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => () => request.current?.abort(), []);

  function saveResearch(entry: ResearchResult) {
    setHistory((prev) => {
      const next = [entry, ...prev.filter((i) => i.subject !== entry.subject || i.researchedAt !== entry.researchedAt)].slice(0, 15);
      try {
        localStorage.setItem(SUBJECT_HISTORY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(SUBJECT_HISTORY_KEY);
    } catch {}
  }

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
      const payload = Object.fromEntries(fields);
      const endpoint = mode === "dossier" ? "/api/osint/dossier" : "/api/osint/research";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${auth.getToken()}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || "Live research could not complete.");
      if (!controller.signal.aborted) {
        const normalized: ResearchResult = {
          subject: body.subject,
          researchedAt: body.researchedAt ?? body.generatedAt ?? new Date().toISOString(),
          answer: body.answer,
          sources: body.sources ?? [],
          html: body.html,
        };
        setResult(normalized);
        saveResearch(normalized);
        if (body.html) setDossierHtml(body.html);
      }
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
    <section className="ardi-glass-card intel-map" aria-labelledby="live-research-title">
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
            className="ardi-liquid-input min-h-12 rounded-lg border border-slate-500 bg-[#0c1125] px-3 text-base"
          />
        </label>
        <label className="grid gap-2">
          Search region
          <select
            name="region"
            defaultValue="uk"
            className="ardi-liquid-input min-h-12 rounded-lg border border-slate-500 bg-[#0c1125] px-3 text-base"
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
            className="ardi-liquid-input min-h-12 rounded-lg border border-slate-500 bg-[#0c1125] px-3 text-base"
          >
            <option value="organisation">Company or organisation</option>
            <option value="domain">Website</option>
            <option value="person">Public information about a person</option>
            <option value="incident">Incident</option>
            <option value="threat">Cyber threat</option>
            <option value="exposure">Publicly exposed information</option>
          </select>
        </label>
        <label className="grid gap-2">
          Company website (optional, for full PDF dossier)
          <input
            name="domain"
            maxLength={253}
            placeholder="e.g. example.com"
            className="ardi-liquid-input min-h-12 rounded-lg border border-slate-500 bg-[#0c1125] px-3 text-base"
          />
        </label>
        <label className="grid gap-2 sm:col-span-2">
          What do you want to find out?
          <textarea
            name="question"
            required
            minLength={5}
            maxLength={2000}
            rows={3}
            className="ardi-liquid-input rounded-lg border border-slate-500 bg-[#0c1125] p-3 text-base"
          />
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            onClick={() => setMode("research")}
            className="min-h-12 rounded-lg bg-cyan-200 px-5 font-semibold text-indigo-950 disabled:opacity-60"
          >
            {loading && mode === "research"
              ? "Searching public sources…"
              : auth.isAuthenticated()
                ? "Run live research"
                : "Sign in to run research"}
          </button>
          <button
            type="submit"
            disabled={loading}
            onClick={() => setMode("dossier")}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-cyan-300/50 bg-cyan-300/10 px-5 font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {loading && mode === "dossier"
              ? "Building PDF dossier…"
              : "Build Full Client PDF Dossier"}
          </button>
        </div>
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
      {history.length > 0 ? (
        <div className="mt-6 rounded-xl border border-slate-700/80 bg-[#0c1125]/70 p-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <p className="font-mono text-xs uppercase tracking-wide text-slate-400">
              Saved research lookups ({history.length})
            </p>
            <button
              type="button"
              onClick={clearHistory}
              className="text-xs text-slate-400 hover:text-white"
            >
              Clear history
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((item) => (
              <button
                key={`${item.subject}-${item.researchedAt}`}
                type="button"
                onClick={() => {
                  setResult(item);
                  setError("");
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  result?.researchedAt === item.researchedAt
                    ? "border-cyan-300 bg-cyan-300/15 text-cyan-100"
                    : "border-slate-600 bg-slate-900/60 text-slate-200 hover:border-cyan-300/60"
                }`}
              >
                {item.subject}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {result ? (
        <article className="mt-6 border-t border-slate-600 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">Research: {result.subject}</h3>
            {result.html ? (
              <Button size="sm" onClick={() => setDossierHtml(result.html!)}>
                <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Open PDF Dossier
              </Button>
            ) : null}
          </div>
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
      <Dialog open={dossierHtml !== null} onOpenChange={(open) => !open && setDossierHtml(null)}>
        <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-3">
          <DialogHeader className="flex flex-row items-center justify-between gap-4 pr-8">
            <DialogTitle className="truncate">
              Due Diligence Dossier: {result?.subject ?? ""}
            </DialogTitle>
            <Button
              size="sm"
              onClick={() => {
                iframeRef.current?.contentWindow?.focus();
                iframeRef.current?.contentWindow?.print();
              }}
            >
              <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Print / Save as PDF
            </Button>
          </DialogHeader>
          {dossierHtml ? (
            <iframe
              ref={iframeRef}
              title={`Dossier for ${result?.subject ?? "company"}`}
              srcDoc={dossierHtml}
              className="w-full flex-1 rounded-lg border border-border bg-white"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
