import { AlertTriangle, CheckCircle2, Scan, Server, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';
import { getGetDashboardActivityQueryKey, getGetDashboardStatsQueryKey, getGetFindingsBySeverityQueryKey, getGetScanTrendQueryKey, useGetDashboardActivity, useGetDashboardStats, useGetFindingsBySeverity, useGetScanTrend } from '@workspace/api-client-react';
import { StatCard } from '@/components/stat-card';
import { ActivityFeed } from '@/features/dashboard/components/activity-feed';
import { SecurityCharts } from '@/features/dashboard/components/security-charts';
import { routes } from '@/shared/config/routes';
import { PageError, PageLoading } from '@/shared/ui/page-state';

export default function Dashboard() {
  const statsQuery = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const activityQuery = useGetDashboardActivity({ query: { queryKey: getGetDashboardActivityQueryKey() } });
  const severityQuery = useGetFindingsBySeverity({ query: { queryKey: getGetFindingsBySeverityQueryKey() } });
  const trendQuery = useGetScanTrend({ query: { queryKey: getGetScanTrendQueryKey() } });

  if (statsQuery.isLoading) return <PageLoading label="Loading security operations" />;
  if (statsQuery.isError) return <div className="p-4 sm:p-8"><PageError title="Security operations could not be loaded" description="The security API did not return workspace statistics." onRetry={() => statsQuery.refetch()} /></div>;
  const stats = statsQuery.data;

  return (
    <main className="space-y-8 p-4 sm:p-8">
      <header><h1 className="text-3xl font-bold">Security operations</h1><p className="mt-2 text-muted-foreground">Current authorised targets, Pen Tests, and verified findings.</p></header>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Security statistics"><StatCard title="Authorised targets" value={stats?.totalAssets || 0} icon={Server} /><StatCard title="Active Pen Tests" value={stats?.activeScans || 0} icon={Scan} /><StatCard title="Open findings" value={stats?.openFindings || 0} icon={AlertTriangle} /><StatCard title="Critical findings" value={stats?.criticalFindings || 0} icon={ShieldAlert} /></section>
      <SecurityCharts severities={severityQuery.data} trends={trendQuery.data} />
      <div className="grid gap-6 lg:grid-cols-3"><div className="lg:col-span-2"><ActivityFeed activity={activityQuery.data} /></div><aside className="space-y-6" aria-label="Workspace facts"><section className="rounded-xl border border-card-border bg-card p-6 shadow-md"><h2 className="text-sm font-semibold text-muted-foreground">Resolved findings</h2><p className="mt-4 flex items-center gap-3 text-3xl font-bold font-mono"><CheckCircle2 className="h-10 w-10 text-green-500" aria-hidden="true" />{stats?.resolvedFindings || 0}</p></section><section className="rounded-xl border border-card-border bg-card p-6 shadow-md"><h2 className="text-sm font-semibold text-muted-foreground">Last Pen Test</h2><p className="mt-4 font-mono text-sm">{stats?.lastScanAt ? formatDistanceToNow(new Date(stats.lastScanAt), { addSuffix: true }) : 'No Pen Tests yet'}</p></section><Link href={routes.assets} className="block rounded-xl border border-primary/30 bg-primary/5 p-6 transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><h2 className="font-semibold text-primary">Authorise a target</h2><p className="mt-2 text-sm text-muted-foreground">Add a system to scope before testing.</p></Link></aside></div>
    </main>
  );
}
