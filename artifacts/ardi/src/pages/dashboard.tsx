import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import {
  getGetDashboardActivityQueryKey,
  getGetDashboardStatsQueryKey,
  getGetReportsQueryKey,
  getGetScansQueryKey,
  useGetDashboardActivity,
  useGetDashboardStats,
  useGetReports,
  useGetScans,
} from "@workspace/api-client-react";
import { ActivityFeed } from "@/features/dashboard/components/activity-feed";
import { nextWorkflowAction, workflowStages } from "@/shared/config/workflow";
import { PageError, PageLoading } from "@/shared/ui/page-state";

function stageStatus(step: number, input: {
  assets: number;
  scans: number;
  openFindings: number;
  reports: number;
}) {
  if (step === 1) return "Website lookup works now. Name search and attacker records need a connection.";
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
  const reportsQuery = useGetReports({ query: { queryKey: getGetReportsQueryKey() } });
  const activityQuery = useGetDashboardActivity({ query: { queryKey: getGetDashboardActivityQueryKey() } });

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

  return (
    <main className="space-y-8 p-4 sm:p-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Start here</p>
        <h1 className="mt-2 text-3xl font-bold">Do these four steps, in order.</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Research what is public, test only systems you are allowed to test, fix the problems that come back, then write a report.
        </p>
      </header>

      <Link
        href={next.href}
        className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/10 p-6 transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
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
              className="flex h-full gap-4 rounded-xl border border-card-border bg-card p-5 transition hover:border-primary/40"
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
    </main>
  );
}
