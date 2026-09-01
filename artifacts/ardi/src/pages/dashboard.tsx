import { Server, Scan, AlertTriangle, ShieldAlert, CheckCircle2, Activity } from 'lucide-react';
import { StatCard } from '@/components/stat-card';
import { SeverityBadge } from '@/components/severity-badge';
import { StatusBadge } from '@/components/status-badge';
import {
  useGetDashboardStats,
  useGetDashboardActivity,
  useGetFindingsBySeverity,
  useGetScanTrend,
  getGetDashboardStatsQueryKey,
  getGetDashboardActivityQueryKey,
  getGetFindingsBySeverityQueryKey,
  getGetScanTrendQueryKey,
} from '@workspace/api-client-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: activity } = useGetDashboardActivity({ query: { queryKey: getGetDashboardActivityQueryKey() } });
  const { data: severityData } = useGetFindingsBySeverity({ query: { queryKey: getGetFindingsBySeverityQueryKey() } });
  const { data: trendData } = useGetScanTrend({ query: { queryKey: getGetScanTrendQueryKey() } });

  if (statsLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const severityChartData = severityData?.map((item) => ({
    severity: item.severity.toUpperCase(),
    count: item.count,
    fill:
      item.severity === 'critical'
        ? 'hsl(var(--destructive))'
        : item.severity === 'high'
        ? 'hsl(var(--chart-4))'
        : item.severity === 'medium'
        ? 'hsl(var(--chart-3))'
        : item.severity === 'low'
        ? 'hsl(var(--chart-1))'
        : 'hsl(var(--muted))',
  }));

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Security Operations Center</h1>
        <p className="text-muted-foreground">Real-time view of your security posture</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Assets"
          value={stats?.totalAssets || 0}
          icon={Server}
          data-testid="stat-total-assets"
        />
        <StatCard
          title="Active Scans"
          value={stats?.activeScans || 0}
          icon={Scan}
          data-testid="stat-active-scans"
        />
        <StatCard
          title="Open Findings"
          value={stats?.openFindings || 0}
          icon={AlertTriangle}
          data-testid="stat-open-findings"
        />
        <StatCard
          title="Critical Findings"
          value={stats?.criticalFindings || 0}
          icon={ShieldAlert}
          data-testid="stat-critical-findings"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Findings by Severity */}
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-md">
          <h2 className="text-lg font-bold mb-6">Findings by Severity</h2>
          {severityChartData && severityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={severityChartData}>
                <XAxis dataKey="severity" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No findings data yet
            </div>
          )}
        </div>

        {/* Scan Trend */}
        <div className="bg-card border border-card-border rounded-xl p-6 shadow-md">
          <h2 className="text-lg font-bold mb-6">Scan Coverage Trend</h2>
          {trendData && trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="scans" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                <Line type="monotone" dataKey="findings" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ fill: 'hsl(var(--destructive))' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No trend data yet
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed & Quick Stats */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-6 shadow-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold">Recent Activity</h2>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          {activity && activity.length > 0 ? (
            <div className="space-y-4">
              {activity.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    item.type === 'finding_discovered' ? 'bg-destructive animate-pulse' :
                    item.type === 'finding_resolved' ? 'bg-green-500' :
                    item.type === 'scan_started' || item.type === 'scan_completed' ? 'bg-primary' :
                    'bg-muted-foreground'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.severity && <SeverityBadge severity={item.severity as any} />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">No recent activity</div>
          )}
        </div>

        {/* Live workspace facts only — no calculated posture score without a verified source. */}
        <div className="space-y-6">
          <div className="bg-card border border-card-border rounded-xl p-6 shadow-md">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Resolved Findings</h3>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
              <span className="text-3xl font-bold font-mono">{stats?.resolvedFindings || 0}</span>
            </div>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-6 shadow-md">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Last Scan</h3>
            <p className="text-sm font-mono">
              {stats?.lastScanAt
                ? formatDistanceToNow(new Date(stats.lastScanAt), { addSuffix: true })
                : 'No scans yet'}
            </p>
          </div>

          <Link href="/assets">
            <div className="bg-primary/5 border border-primary/30 rounded-xl p-6 hover:bg-primary/10 transition-colors cursor-pointer glow-primary">
              <h3 className="font-semibold text-primary mb-2">Quick Actions</h3>
              <p className="text-sm text-muted-foreground">Add a new asset to start scanning</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
