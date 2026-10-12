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

function SourcePill({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold tracking-wide ${enabled ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-border bg-muted text-muted-foreground"}`}
    >
      {label} / {enabled ? "RETRIEVED" : "UNAVAILABLE"}
    </span>
  );
}

export default function Osint() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<DomainIntel | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
              <div className="flex flex-wrap gap-2">
                <SourcePill enabled={result.sources.rdap} label="RDAP" />
                <SourcePill enabled={result.sources.dns} label="DNS" />
                <SourcePill
                  enabled={result.sources.certificateTransparency}
                  label="CT LOG"
                />
              </div>
            </div>
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
                    RDAP REGISTRY
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
                    DNS RESOLUTION
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
                    CERTIFICATE TRANSPARENCY
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
                            {certificate.notBefore ?? "—"} →{" "}
                            {certificate.notAfter ?? "—"}
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
