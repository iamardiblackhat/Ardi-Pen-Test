import { Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { ActivityItem } from '@workspace/api-client-react';
import { SeverityBadge } from '@/components/severity-badge';

function activityColor(type: ActivityItem['type']) {
  if (type === 'finding_discovered') return 'bg-destructive';
  if (type === 'finding_resolved') return 'bg-green-500';
  if (type === 'scan_started' || type === 'scan_completed') return 'bg-primary';
  return 'bg-muted-foreground';
}

export function ActivityFeed({ activity = [] }: { activity?: ActivityItem[] }) {
  return (
    <section className="rounded-xl border border-card-border bg-card p-4 shadow-md sm:p-6">
      <header className="mb-6 flex items-center justify-between"><h2 className="text-lg font-bold">Recent activity</h2><Activity className="h-5 w-5 text-muted-foreground" aria-hidden="true" /></header>
      {activity.length ? <ol className="space-y-4">{activity.slice(0, 8).map((item) => <li key={item.id} className="flex items-start gap-4 border-b border-border pb-4 last:border-0 last:pb-0"><span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${activityColor(item.type)}`} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-medium">{item.title}</h3>{item.severity ? <SeverityBadge severity={item.severity as 'critical' | 'high' | 'medium' | 'low' | 'info'} /> : null}</div><p className="mt-1 text-sm text-muted-foreground">{item.description}</p><time className="mt-1 block text-xs font-mono text-muted-foreground" dateTime={item.createdAt}>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</time></div></li>)}</ol> : <p className="py-12 text-center text-muted-foreground">No recent activity.</p>}
    </section>
  );
}
