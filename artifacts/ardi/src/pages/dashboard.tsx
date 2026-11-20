import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, BellRing, Loader2, Play, ShieldAlert } from "lucide-react";
import {
  getGetDashboardActivityQueryKey,
  getGetDashboardStatsQueryKey,
  getGetFindingsQueryKey,
  getGetReportsQueryKey,
  getGetScansQueryKey,
  useGetDashboardActivity,
  useGetDashboardStats,
  useGetFindings,
  useGetReports,
  useGetScans,
} from "@workspace/api-client-react";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { auth } from "@/lib/auth";
import { computeSecurityGrade } from "@/lib/security-grade";
import { nextWorkflowAction, workflowStages } from "@/shared/config/workflow";
import { PageError, PageLoading } from "@/shared/ui/page-state";

interface HoneypotEvent {
  id: string;
  timestamp: string;
  ipMasked: string;
  path: string;
  method: string;
  userAgent: string;
  hits: number;
  blocked: boolean;
}

interface HoneypotTelemetry {
  activeDecoys: string[];
  totalHits: number;
  activeBlocks: number;
  recentEvents: HoneypotEvent[];
}

interface MonitoringAlert {
  id: number;
  assetId: number;
  assetName: string;
  scanId: number;
  severity: "info" | "warning" | "critical";
  summary: string;
  newFindingsCount: number;
  resolvedFindingsCount: number;
  totalFindingsCount: number;
  createdAt: string;
}

interface MonitoringFeed {
  monitoredAssetsCount: number;
  alerts: MonitoringAlert[];
}

function stageStatus(step: number, input: {
  assets: number;
  scans: number;
  openFindings: number;
  reports: number;
}) {
  if (step === 1) return "Look up any website, person, company, or known security threat.";
  if (step === 2) {
    if (input.assets === 0) return "No targets yet.";
    if (input.scans === 0) return `${input.assets} ${input.assets === 1 ? "target is" : "targets are"} ready to test.`;
    return `${input.scans} ${input.scans === 1 ? "check" : "checks"} on record.`;
  }
  if (step === 3) {
    if (input.openFindings === 0) return "No open problems.";
    return `${input.openFindings} open ${input.openFindings === 1 ? "problem" : "problems"}.`;
  }
  if (input.reports === 0) return "No report yet.";
  return `${input.reports} ${input.reports === 1 ? "report" : "reports"}.`;
}

export default function Dashboard() {
  const statsQuery = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const scansQuery = useGetScans({ query: { queryKey: getGetScansQueryKey() } });
  const findingsQuery = useGetFindings({ query: { queryKey: getGetFindingsQueryKey() } });
  const reportsQuery = useGetReports({ query: { queryKey: getGetReportsQueryKey() } });
  const activityQuery = useGetDashboardActivity({ query: { queryKey: getGetDashboardActivityQueryKey() } });
  const [honeypot, setHoneypot] = useState<HoneypotTelemetry | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringFeed | null>(null);
  const [runningMonitor, setRunningMonitor] = useState(false);

  const loadMonitoring = () => {
    fetch("/api/dashboard/monitoring-alerts", {
      headers: auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MonitoringFeed | null) => {
        if (d) setMonitoring(d);
      })
      .catch(() => {});
  };

  useEffect(() => {
    let alive = true;
    const headers: Record<string, string> = auth.getToken()
      ? { authorization: `Bearer ${auth.getToken()}` }
      : {};
    fetch("/api/dashboard/honeypot", { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HoneypotTelemetry | null) => {
        if (alive) setHoneypot(d);
      })
      .catch(() => {});
    fetch("/api/dashboard/monitoring-alerts", { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: MonitoringFeed | null) => {
        if (alive && d) setMonitoring(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const handleRunMonitoredNow = async () => {
    setRunningMonitor(true);
    try {
      await fetch("/api/dashboard/monitoring-alerts/run", {
        method: "POST",
        headers: auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {},
      });
      loadMonitoring();
    } finally {
      setRunningMonitor(false);
    }
  };

  if (statsQuery.isLoading || scansQuery.isLoading || reportsQuery.isLoading) {
    return <PageLoading label="Loading your next step" />;
  }
  if (statsQuery.isError || !statsQuery.data) {
    return (
      <div className="p-4 sm:p-8">
        <PageError
          title="The workspace could not be loaded"
          description="The security API did not return your targets, checks, or problems."
          onRetry={() => {
            void statsQuery.refetch();
            void scansQuery.refetch();
            void reportsQuery.refetch();
          }}
        />
      </div>
    );
  }

  const counts = {
    assets: statsQuery.data.totalAssets,
    scans: scansQuery.data?.length ?? 0,
    openFindings: statsQuery.data.openFindings,
    reports: reportsQuery.data?.length ?? 0,
  };
  const next = nextWorkflowAction(counts);
  const overallGrade = computeSecurityGrade({
    hasCompletedScan: (scansQuery.data ?? []).some((s) => s.status === "completed"),
    findings: findingsQuery.data ?? [],
  });

  return (
    <main className="space-y-8 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Start here</p>
          <h1 className="mt-2 text-3xl font-bold">Do these four steps, in order.</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Research what is public, test only systems you are allowed to test, fix the problems that come back, then write a report.
          </p>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-card-border bg-card px-5 py-4 shadow-sm">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-2xl font-bold font-mono ${overallGrade.badgeClass}`}>
            {overallGrade.letter}
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              Overall Security Grade
            </p>
            <p className={`text-base font-semibold ${overallGrade.colorClass}`}>
              {overallGrade.label}
              {overallGrade.score !== null ? ` (${overallGrade.score}/100)` : ""}
            </p>
            <p className="text-xs text-muted-foreground">{overallGrade.summary}</p>
          </div>
        </div>
      </header>

      <Link
        href={next.href}
        className="ardi-glass-card flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/10 p-6 transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Do this next</p>
          <h2 className="mt-2 text-2xl font-bold">{next.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{next.detail}</p>
        </div>
        <span className="inline-flex items-center gap-2 font-medium text-primary">
          Go
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>

      <ol className="grid gap-4 md:grid-cols-2" aria-label="Workflow steps">
        {workflowStages.map((stage) => (
          <li key={stage.id}>
            <Link
              href={stage.href}
              className="ardi-glass-card flex h-full gap-4 rounded-xl border border-card-border bg-card p-5 transition hover:border-primary/40"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-sm text-primary">
                {stage.step}
              </span>
              <span>
                <span className="block text-lg font-semibold">{stage.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{stage.question}</span>
                <span className="mt-3 block text-sm">{stageStatus(stage.step, counts)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <ActivityFeed activity={activityQuery.data} />

      <section
        className="rounded-xl border border-card-border bg-card p-4 shadow-md sm:p-6"
        aria-labelledby="weekly-monitoring-title"
      >
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="weekly-monitoring-title" className="flex items-center gap-2 text-lg font-bold">
              <BellRing className="h-5 w-5 text-primary" aria-hidden="true" />
              Weekly Monitoring &amp; Change Alerts
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Websites with Weekly Monitoring enabled are checked automatically every Monday at 08:00 UTC and compared against their previous check.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {monitoring ? (
              <span className="rounded-md border border-border bg-muted/50 px-2.5 py-1 font-mono text-xs">
                Monitored sites: <strong>{monitoring.monitoredAssetsCount}</strong>
              </span>
            ) : null}
            {monitoring && monitoring.monitoredAssetsCount > 0 ? (
              <button
                type="button"
                onClick={handleRunMonitoredNow}
                disabled={runningMonitor}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {runningMonitor ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {runningMonitor ? "Checking sites..." : "Run monitored checks now"}
              </button>
            ) : null}
          </div>
        </header>

        {monitoring ? (
          monitoring.alerts.length > 0 ? (
            <ul className="divide-y divide-border">
              {monitoring.alerts.slice(0, 6).map((alert) => (
                <li key={alert.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[11px] uppercase ${
                          alert.severity === "critical"
                            ? "bg-destructive/15 text-destructive"
                            : alert.severity === "warning"
                              ? "bg-orange-500/15 text-orange-400"
                              : "bg-emerald-500/15 text-emerald-400"
                        }`}
                      >
                        {alert.severity === "info" ? "Stable" : alert.severity}
                      </span>
                      <span className="font-medium">{alert.assetName}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{alert.summary}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString()}
                    </span>
                    <Link
                      href={`/scans/${alert.scanId}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View diff
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              {monitoring.monitoredAssetsCount > 0
                ? "No weekly monitoring alerts recorded yet. Click 'Run monitored checks now' or wait for Monday's automatic run."
                : "Turn on Weekly Monitoring on any website in Assets to track security changes automatically every week."}
            </p>
          )
        ) : (
          <p className="text-sm text-muted-foreground">Loading weekly monitoring status...</p>
        )}
      </section>

      <section
        className="rounded-xl border border-card-border bg-card p-4 shadow-md sm:p-6"
        aria-labelledby="honeypot-sensor-title"
      >
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="honeypot-sensor-title" className="flex items-center gap-2 text-lg font-bold">
              <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
              Automatic Trap Pages (Bot &amp; Snooper Protection)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fake hidden addresses (like /.env or /wp-admin) that normal visitors never open. If a bot or hacker snoops on them, ARDI spots them and blocks repeat attempts automatically.
            </p>
          </div>
          {honeypot ? (
            <div className="flex gap-3 font-mono text-xs">
              <span className="rounded-md border border-border bg-muted/50 px-2.5 py-1">
                Snooping attempts caught: <strong>{honeypot.totalHits}</strong>
              </span>
              <span className="rounded-md border border-border bg-muted/50 px-2.5 py-1">
                Currently blocked: <strong>{honeypot.activeBlocks}</strong>
              </span>
            </div>
          ) : null}
        </header>

        {honeypot ? (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-mono uppercase tracking-wide text-muted-foreground">
                Protected trap addresses ({honeypot.activeDecoys.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {honeypot.activeDecoys.map((path) => (
                  <code
                    key={path}
                    className="rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground"
                  >
                    {path}
                  </code>
                ))}
              </div>
            </div>

            {honeypot.recentEvents.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border font-mono uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Time</th>
                      <th className="py-2 pr-4">Visitor IP (Masked)</th>
                      <th className="py-2 pr-4">Trap Address</th>
                      <th className="py-2 pr-4">Attempts</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {honeypot.recentEvents.slice(0, 10).map((evt) => (
                      <tr key={evt.id}>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2 pr-4">{evt.ipMasked}</td>
                        <td className="py-2 pr-4 text-primary">{evt.path}</td>
                        <td className="py-2 pr-4">{evt.hits}</td>
                        <td className="py-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] ${
                              evt.blocked
                                ? "bg-destructive/15 text-destructive"
                                : "bg-orange-500/15 text-orange-400"
                            }`}
                          >
                            {evt.blocked ? "Blocked" : "Logged"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                No bots or snooping attempts caught in this session.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading trap page status…</p>
        )}
      </section>
    </main>
  );
}
