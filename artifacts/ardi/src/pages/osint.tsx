/**
 * ARDI SEC OSINT DESIGN REMINDER
 * Domain research uses real public sources only. There are no example profiles,
 * synthetic certificates, invented provider counts or fake enrichment results.
 */
import { FormEvent, useState } from "react";
import {
  BadgeInfo,
  Database,
  Globe2,
  LoaderCircle,
  Network,
  Search,
  ShieldCheck,
} from "lucide-react";
import { auth } from "@/lib/auth";

type DomainIntel = {
  domain: string;
  retrievedAt: string;
  sources: { rdap: boolean; dns: boolean; certificateTransparency: boolean };
  sourceErrors: string[];
  rdap: {
    handle: string | null;
    name: string | null;
    status: string[];
    events: Array<{ eventAction?: string; eventDate?: string }>;
  } | null;
  dns: {
    ipv4: string[];
    ipv6: string[];
    mx: Array<{ exchange: string; priority: number }>;
    ns: string[];
  };
  certificates: Array<{
    id: string | null;
    name: string | null;
    issuer: string | null;
    notBefore: string | null;
    notAfter: string | null;
  }>;
};

type LookalikeCandidate = {
  domain: string;
  kind: "alternate-tld" | "brand-keyword" | "typo";
  registered: boolean;
  ipv4: string[];
  hasMail: boolean;
  httpStatus: number | null;
  redirectTarget: string | null;
  risk: "high" | "medium" | "low" | "none";
};

type LookalikeScanResult = {
  domain: string;
  checkedAt: string;
  checkedCount: number;
  registeredCount: number;
  highRiskCount: number;
  candidates: LookalikeCandidate[];
};

function SourcePill({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold tracking-wide ${enabled ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-border bg-muted text-muted-foreground"}`}
    >
      {label} / {enabled ? "RETRIEVED" : "UNAVAILABLE"}
    </span>
  );
}

const DOMAIN_HISTORY_KEY = "ardi_website_research_history";

function loadDomainHistory(): DomainIntel[] {
  try {
    const raw = localStorage.getItem(DOMAIN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DomainIntel[]).slice(0, 15) : [];
  } catch {
    return [];
  }
}

interface EmailDnsAudit {
  domain: string;
  overallStatus: "protected" | "partial" | "vulnerable";
  summary: string;
  spf: {
    present: boolean;
    record: string | null;
    status: "pass" | "warn" | "fail";
    explanation: string;
    recommendedRecord: string;
  };
  dmarc: {
    present: boolean;
    record: string | null;
    policy: string;
    status: "pass" | "warn" | "fail";
    explanation: string;
    recommendedRecord: string;
  };
  caa: {
    present: boolean;
    records: string[];
    status: "pass" | "warn";
    explanation: string;
    recommendedRecord: string;
  };
}

export default function Osint() {
  const [domain, setDomain] = useState("");
  const [history, setHistory] = useState<DomainIntel[]>(() => loadDomainHistory());
  const [result, setResult] = useState<DomainIntel | null>(null);
  const [lookalikes, setLookalikes] = useState<LookalikeScanResult | null>(null);
  const [lookalikeLoading, setLookalikeLoading] = useState(false);
  const [lookalikeError, setLookalikeError] = useState("");
  const [emailAudit, setEmailAudit] = useState<EmailDnsAudit | null>(null);

  async function fetchEmailAudit(targetDomain: string) {
    setEmailAudit(null);
    try {
      const response = await fetch(
        `/api/osint/email-audit/${encodeURIComponent(targetDomain)}`,
        {
          headers: auth.getToken()
            ? { authorization: `Bearer ${auth.getToken()}` }
            : {},
        },
      );
      if (response.ok) {
        setEmailAudit((await response.json()) as EmailDnsAudit);
      }
    } catch {}
  }
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function runLookalikeScan(targetDomain: string) {
    setLookalikeLoading(true);
    setLookalikeError("");
    setLookalikes(null);
    try {
      const response = await fetch(
        `/api/osint/lookalikes/${encodeURIComponent(targetDomain)}`,
        {
          headers: auth.getToken()
            ? { authorization: `Bearer ${auth.getToken()}` }
            : {},
        },
      );
      const body = (await response.json()) as LookalikeScanResult & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Lookalike domain check failed.");
      }
      setLookalikes(body);
    } catch (err) {
      setLookalikeError(
        err instanceof Error ? err.message : "Lookalike domain check failed.",
      );
    } finally {
      setLookalikeLoading(false);
    }
  }

  function saveToHistory(entry: DomainIntel) {
    setHistory((prev) => {
      const next = [entry, ...prev.filter((item) => item.domain !== entry.domain)].slice(0, 15);
      try {
        localStorage.setItem(DOMAIN_HISTORY_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(DOMAIN_HISTORY_KEY);
    } catch {}
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = domain.trim().toLowerCase();
    if (!value) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(
        `/api/osint/domain/${encodeURIComponent(value)}`,
        {
          headers: auth.getToken()
            ? { authorization: `Bearer ${auth.getToken()}` }
            : {},
        },
      );
      const body = (await response.json()) as DomainIntel & { error?: string };
      if (!response.ok)
        throw new Error(body.error ?? "The domain research request failed.");
      setResult(body);
      saveToHistory(body);
      void fetchEmailAudit(body.domain);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The domain research request failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-6 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[1.75rem] border border-violet-200 bg-[radial-gradient(circle_at_85%_8%,rgba(130,115,255,.3),transparent_28%),linear-gradient(125deg,#17123b,#312669)] p-7 text-white shadow-[0_25px_55px_-38px_rgba(49,46,129,.65)] sm:p-10">
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[.16em] text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-200" /> Step 1 ·
            Website lookup
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-[-.045em] sm:text-5xl">
            Look up a website.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-indigo-100">
            This uses public registration, address, and certificate records.
            The result stays empty until you ask for a real website.
          </p>
          <form
            onSubmit={submit}
            className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <label className="sr-only" htmlFor="domain">
              Public domain
            </label>
            <input
              id="domain"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="Enter a domain to investigate"
              inputMode="url"
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-indigo-200/65 focus:border-cyan-200"
            />
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-200 px-5 py-3 text-sm font-semibold text-indigo-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? "Looking up" : "Look up website"}
            </button>
          </form>
        </div>

        {history.length > 0 && (
          <section className="mt-6 rounded-2xl border border-border bg-card/70 p-4 sm:p-5" aria-label="Recent website lookups">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Saved website lookups ({history.length})
              </p>
              <button
                type="button"
                onClick={clearHistory}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear history
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((item) => (
                <button
                  key={`${item.domain}-${item.retrievedAt}`}
                  type="button"
                  onClick={() => {
                    setDomain(item.domain);
                    setResult(item);
                    setError("");
                  }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-mono transition ${
                    result?.domain === item.domain
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/40"
                  }`}
                >
                  {item.domain}
                </button>
              ))}
            </div>
          </section>
        )}

        {error && (
          <div className="mt-8 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5 text-sm text-amber-100">
            <BadgeInfo className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        )}
        {!result && !error && !loading && (
          <div className="mt-9 rounded-[1.5rem] border border-border bg-card p-8">
            <Globe2 className="h-7 w-7 text-primary" />
            <h2 className="mt-5 text-xl font-semibold text-foreground">
              No website looked up yet.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              Enter a public website to retrieve real source records. Nothing is
              preloaded.
            </p>
          </div>
        )}
        {result && (
          <section className="mt-9 space-y-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[10px] font-semibold tracking-[.14em] text-primary">
                  PUBLIC RECORDS
                </p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
                  {result.domain}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Retrieved{" "}
                  {new Date(result.retrievedAt).toLocaleString("en-GB")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={lookalikeLoading}
                  onClick={() => void runLookalikeScan(result.domain)}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
                >
                  {lookalikeLoading ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {lookalikeLoading
                    ? "Checking lookalike domains..."
                    : "Check for Fake / Lookalike Domains"}
                </button>
                <SourcePill enabled={result.sources.rdap} label="RDAP" />
                <SourcePill enabled={result.sources.dns} label="DNS" />
                <SourcePill
                  enabled={result.sources.certificateTransparency}
                  label="CT LOG"
                />
              </div>
            </div>

            {lookalikeError ? (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
                {lookalikeError}
              </div>
            ) : null}

            {emailAudit ? (
              <section className="rounded-[1.5rem] border border-border bg-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-semibold tracking-[.14em] text-primary">
                      EMAIL SPOOFING &amp; SSL ISSUANCE AUDIT
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      SPF, DMARC &amp; CAA Protection
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{emailAudit.summary}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-mono font-semibold uppercase ${
                      emailAudit.overallStatus === "protected"
                        ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                        : emailAudit.overallStatus === "partial"
                          ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                          : "border-destructive/40 bg-destructive/15 text-destructive"
                    }`}
                  >
                    {emailAudit.overallStatus}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {[
                    { title: "SPF (Allowed Senders)", item: emailAudit.spf },
                    { title: "DMARC (Fake Email Blocking)", item: emailAudit.dmarc },
                    { title: "CAA (SSL Certificate Lock)", item: emailAudit.caa },
                  ].map(({ title, item }) => (
                    <div key={title} className="rounded-xl border border-border bg-background/60 p-4 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">{title}</span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase ${
                            item.status === "pass"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : item.status === "warn"
                                ? "bg-amber-500/15 text-amber-400"
                                : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-2 leading-relaxed text-muted-foreground">{item.explanation}</p>
                      {item.status !== "pass" ? (
                        <div className="mt-2.5 rounded border border-border bg-muted/40 p-2 font-mono text-[11px] break-all">
                          <span className="block text-[10px] uppercase text-muted-foreground mb-0.5">
                            Copy-paste DNS fix:
                          </span>
                          {item.recommendedRecord}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {lookalikes ? (
              <section className="rounded-[1.5rem] border border-primary/30 bg-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] font-semibold tracking-[.14em] text-primary">
                      BRAND IMPERSONATION &amp; PHISHING CHECK
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">
                      {lookalikes.registeredCount} active lookalike{" "}
                      {lookalikes.registeredCount === 1 ? "domain" : "domains"} found (checked{" "}
                      {lookalikes.checkedCount} variants)
                    </h3>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-mono font-semibold ${
                      lookalikes.highRiskCount > 0
                        ? "border-destructive/40 bg-destructive/15 text-destructive"
                        : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    }`}
                  >
                    {lookalikes.highRiskCount} high risk
                  </span>
                </div>
                {lookalikes.registeredCount > 0 ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[600px] text-left text-xs">
                      <thead className="border-b border-border font-mono uppercase text-muted-foreground">
                        <tr>
                          <th className="pb-2 pr-4">Lookalike Domain</th>
                          <th className="pb-2 pr-4">Risk</th>
                          <th className="pb-2 pr-4">Server IP</th>
                          <th className="pb-2 pr-4">Can Send Email (MX)</th>
                          <th className="pb-2">Web Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60 font-mono">
                        {lookalikes.candidates
                          .filter((c) => c.registered)
                          .map((c) => (
                            <tr key={c.domain}>
                              <td className="py-2.5 pr-4 font-semibold text-foreground">
                                {c.domain}
                              </td>
                              <td className="py-2.5 pr-4">
                                <span
                                  className={`rounded px-2 py-0.5 uppercase ${
                                    c.risk === "high"
                                      ? "bg-destructive/15 text-destructive"
                                      : c.risk === "medium"
                                        ? "bg-orange-500/15 text-orange-400"
                                        : "bg-muted text-muted-foreground"
                                  }`}
                                >
                                  {c.risk}
                                </span>
                              </td>
                              <td className="py-2.5 pr-4 text-muted-foreground">
                                {c.ipv4[0] ?? "DNS only"}
                              </td>
                              <td className="py-2.5 pr-4">
                                {c.hasMail ? (
                                  <span className="text-orange-400">Yes (MX active)</span>
                                ) : (
                                  <span className="text-muted-foreground">No</span>
                                )}
                              </td>
                              <td className="py-2.5 text-muted-foreground">
                                {c.httpStatus !== null ? `HTTP ${c.httpStatus}` : "No web server"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    None of the {lookalikes.checkedCount} common lookalike or typosquatted domains are currently registered.
                  </p>
                )}
              </section>
            ) : null}
            {result.sourceErrors.length > 0 && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-100">
                Unavailable source: {result.sourceErrors.join(", ")}. Other
                retrieved source data remains visible below.
              </div>
            )}
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-[1.5rem] border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Database className="h-4 w-4" />
                  <p className="font-mono text-[10px] font-semibold tracking-[.14em]">
                    DOMAIN REGISTRATION (WHO REGISTERED IT)
                  </p>
                </div>
                {result.rdap ? (
                  <div className="mt-5 space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Handle
                      </p>
                      <p className="mt-1 break-all font-mono text-xs text-foreground">
                        {result.rdap.handle ?? "Not supplied by source"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Name</p>
                      <p className="mt-1 text-foreground">
                        {result.rdap.name ?? "Not supplied by source"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Status
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {result.rdap.status.length ? (
                          result.rdap.status.map((status) => (
                            <span
                              key={status}
                              className="rounded bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground"
                            >
                              {status}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            None supplied by source.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-6 text-muted-foreground">
                    RDAP returned no record for this domain.
                  </p>
                )}
              </section>
              <section className="rounded-[1.5rem] border border-border bg-card p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Network className="h-4 w-4" />
                  <p className="font-mono text-[10px] font-semibold tracking-[.14em]">
                    SERVER &amp; EMAIL ROUTING (DNS)
                  </p>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <DnsList title="IPv4" values={result.dns.ipv4} />
                  <DnsList title="IPv6" values={result.dns.ipv6} />
                  <DnsList title="Nameservers" values={result.dns.ns} />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Mail exchangers
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {result.dns.mx.length ? (
                        result.dns.mx.map((record) => (
                          <p
                            key={`${record.exchange}-${record.priority}`}
                            className="break-all font-mono text-[10px] text-foreground"
                          >
                            {record.priority} · {record.exchange}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No records returned.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
            <section className="rounded-[1.5rem] border border-border bg-card p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-emerald-300">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="font-mono text-[10px] font-semibold tracking-[.14em]">
                    SECURITY CERTIFICATES &amp; SUBDOMAINS
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Up to 30 unique source records
                </p>
              </div>
              {result.certificates.length ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="border-b border-border text-[10px] font-semibold tracking-[.12em] text-muted-foreground">
                      <tr>
                        <th className="pb-3">NAME</th>
                        <th className="pb-3">ISSUER</th>
                        <th className="pb-3">VALIDITY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.certificates.map((certificate, index) => (
                        <tr
                          key={`${certificate.id ?? index}-${certificate.name}`}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="py-3 pr-4 font-mono text-xs text-foreground">
                            {certificate.name ?? "Not supplied"}
                          </td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground">
                            {certificate.issuer ?? "Not supplied"}
                          </td>
                          <td className="py-3 text-xs text-muted-foreground">
                            {certificate.notBefore ?? "Unknown"} to{" "}
                            {certificate.notAfter ?? "Unknown"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">
                  No certificate records were returned by the source.
                </p>
              )}
            </section>
          </section>
        )}
      </div>
    </div>
  );
}

function DnsList({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="mt-2 space-y-1.5">
        {values.length ? (
          values.map((value) => (
            <p
              key={value}
              className="break-all font-mono text-[10px] text-foreground"
            >
              {value}
            </p>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No records returned.</p>
        )}
      </div>
    </div>
  );
}
