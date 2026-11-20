import { useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, AlertTriangle, XCircle, Loader2, ShieldCheck } from "lucide-react";

interface QuickCheckItem {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  fix?: string;
}

interface QuickCheckResult {
  domain: string;
  checkedAt: string;
  score: number;
  grade: string;
  gradeLabel: string;
  checks: QuickCheckItem[];
}

function gradeBadgeClass(grade: string): string {
  if (grade === "A+" || grade === "A") return "border-emerald-500/40 bg-emerald-500/15 text-emerald-300";
  if (grade === "B") return "border-sky-500/40 bg-sky-500/15 text-sky-300";
  if (grade === "C") return "border-amber-500/40 bg-amber-500/15 text-amber-300";
  return "border-rose-500/40 bg-rose-500/15 text-rose-300";
}

export function QuickGradeChecker() {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuickCheckResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = target.trim();
    if (!cleaned) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/public/quick-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not check that domain right now.");
        return;
      }
      setResult(data as QuickCheckResult);
    } catch {
      setError("Network error while checking the website. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="quick-grade-title"
      className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl backdrop-blur-sm sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-primary">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Free Instant Website Check
            </p>
            <h2 id="quick-grade-title" className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Check your website's security grade in 3 seconds
            </h2>
            <p className="mt-1 text-sm text-white/70">
              Live check for HTTPS, browser security headers, exposed secret files, and fake-email spoofing protection (SPF &amp; DMARC).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Enter a website domain (e.g. yourcompany.com)"
            aria-label="Website domain to check"
            className="h-12 flex-1 rounded-xl border border-white/15 bg-black/40 px-4 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !target.trim()}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Checking live...
              </>
            ) : (
              <>
                Check grade
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="mt-6 space-y-5 border-t border-white/10 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border text-3xl font-extrabold font-mono ${gradeBadgeClass(result.grade)}`}
                >
                  {result.grade}
                </div>
                <div>
                  <p className="text-lg font-bold text-white">
                    {result.domain}{" "}
                    <span className="font-mono text-sm font-normal text-white/60">
                      ({result.score}/100)
                    </span>
                  </p>
                  <p className="text-sm text-white/75">{result.gradeLabel}</p>
                </div>
              </div>
              <Link
                href={`/register?target=${encodeURIComponent(result.domain)}`}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
              >
                Get full scan &amp; PDF report free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <ul className="grid gap-3 md:grid-cols-2">
              {result.checks.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm"
                >
                  <div className="flex items-center gap-2 font-semibold text-white">
                    {item.status === "pass" ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                    ) : item.status === "warn" ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                    )}
                    <span>{item.label}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/70">{item.detail}</p>
                  {item.fix ? (
                    <p className="mt-2 rounded bg-white/5 px-2.5 py-1.5 font-mono text-[11px] text-white/85">
                      Fix: {item.fix}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
