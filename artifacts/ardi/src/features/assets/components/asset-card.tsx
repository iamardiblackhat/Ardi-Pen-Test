import { Globe, Server, Smartphone, Trash2, type LucideIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';
import type { Asset } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { routes } from '@/shared/config/routes';

const assetIcons: Record<string, LucideIcon> = { web_app: Globe, network: Server, api: Server, mobile: Smartphone };
const riskColors: Record<string, string> = { critical: 'text-destructive', high: 'text-orange-500', medium: 'text-yellow-500', low: 'text-blue-500', none: 'text-muted-foreground' };

export function AssetCard({ asset, onDelete }: { asset: Asset; onDelete: (asset: Asset) => void }) {
  const Icon = assetIcons[asset.type] ?? Server;
  return (
    <article className="flex items-start gap-3 rounded-xl border border-card-border bg-card p-4 shadow-md transition hover:border-primary/50 sm:p-6">
      <Link href={routes.asset(asset.id)} className="flex min-w-0 flex-1 items-start gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-testid={`asset-card-${asset.id}`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="mb-2 flex flex-wrap items-center gap-2"><span className="text-base font-bold sm:text-lg">{asset.name}</span><StatusBadge status={asset.status} /><span className={`text-xs font-mono font-semibold uppercase ${riskColors[asset.riskLevel]}`}>{asset.riskLevel}</span></span>
          <span className="block break-all text-sm font-mono text-muted-foreground">{asset.target}</span>
          {asset.description ? <span className="mt-2 block text-sm text-muted-foreground">{asset.description}</span> : null}
          <span className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>Last tested: {asset.lastScannedAt ? formatDistanceToNow(new Date(asset.lastScannedAt), { addSuffix: true }) : 'Never'}</span><span>{asset.openFindings || 0} open findings</span></span>
        </span>
      </Link>
      <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${asset.name}`} onClick={() => onDelete(asset)}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>
    </article>
  );
}
