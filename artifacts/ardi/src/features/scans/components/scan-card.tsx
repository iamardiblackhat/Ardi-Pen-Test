import { Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';
import type { Scan } from '@workspace/api-client-react';
import { StatusBadge } from '@/components/status-badge';
import { routes } from '@/shared/config/routes';

export function ScanCard({ scan }: { scan: Scan }) {
  return (
    <article className="rounded-xl border border-card-border bg-card shadow-md transition hover:border-primary/50 hover:shadow-lg">
      <Link href={routes.scan(scan.id)} className="block rounded-xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6" data-testid={`scan-card-${scan.id}`}>
        <span className="mb-4 flex items-start justify-between gap-4"><span className="min-w-0"><span className="mb-2 flex flex-wrap items-center gap-3"><span className="text-base font-bold sm:text-lg">{scan.name}</span><StatusBadge status={scan.status} /></span><span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"><span>Target: <span className="font-mono">{scan.assetName}</span></span><span>Type: <span className="font-mono">{scan.type.replace('_', ' ')}</span></span></span></span><Play className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" /></span>
        {scan.status === 'running' && scan.progress !== undefined ? <span className="mb-4 block"><span className="mb-2 flex justify-between text-xs text-muted-foreground"><span>Progress</span><span className="font-mono">{scan.progress}%</span></span><span className="block h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${scan.progress}%` }} /></span></span> : null}
        <span className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><span><span className="block text-xs text-muted-foreground">Started</span><span className="font-mono">{scan.startedAt ? formatDistanceToNow(new Date(scan.startedAt), { addSuffix: true }) : 'Pending'}</span></span><span><span className="block text-xs text-muted-foreground">Findings</span><strong className="font-mono">{scan.findingsCount || 0}</strong></span><span><span className="block text-xs text-muted-foreground">Critical</span><strong className="font-mono text-destructive">{scan.criticalCount || 0}</strong></span><span><span className="block text-xs text-muted-foreground">High</span><strong className="font-mono text-orange-500">{scan.highCount || 0}</strong></span></span>
      </Link>
    </article>
  );
}
