import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeverityCount, TrendPoint } from '@workspace/api-client-react';

const severityColors: Record<string, string> = { critical: 'hsl(var(--destructive))', high: 'hsl(var(--chart-4))', medium: 'hsl(var(--chart-3))', low: 'hsl(var(--chart-1))', info: 'hsl(var(--muted))' };
const tooltipStyle = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' };

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-card-border bg-card p-4 shadow-md sm:p-6"><h2 className="mb-6 text-lg font-bold">{title}</h2>{children}</section>;
}

export function SecurityCharts({ severities = [], trends = [] }: { severities?: SeverityCount[]; trends?: TrendPoint[] }) {
  const severityData = severities.map((item) => ({ severity: item.severity.toUpperCase(), count: item.count, fill: severityColors[item.severity] }));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartFrame title="Findings by severity">{severityData.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={severityData}><XAxis dataKey="severity" stroke="hsl(var(--muted-foreground))" fontSize={12} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="count" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="flex h-[280px] items-center justify-center text-muted-foreground">No findings data yet.</p>}</ChartFrame>
      <ChartFrame title="Pen Test coverage trend">{trends.length ? <ResponsiveContainer width="100%" height={280}><LineChart data={trends}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} /><YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} /><Tooltip contentStyle={tooltipStyle} /><Line type="monotone" dataKey="scans" stroke="hsl(var(--primary))" strokeWidth={2} /><Line type="monotone" dataKey="findings" stroke="hsl(var(--destructive))" strokeWidth={2} /></LineChart></ResponsiveContainer> : <p className="flex h-[280px] items-center justify-center text-muted-foreground">No Pen Test trend data yet.</p>}</ChartFrame>
    </div>
  );
}
