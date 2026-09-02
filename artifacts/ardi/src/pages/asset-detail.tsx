import { useParams, Link } from 'wouter';
import { ArrowLeft, Play, Server, AlertTriangle } from 'lucide-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { SeverityBadge } from '@/components/severity-badge';
import {
  useGetAsset,
  useGetScans,
  useGetFindings,
  useCreateScan,
  getGetAssetQueryKey,
  getGetScansQueryKey,
  getGetFindingsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function AssetDetail() {
  const params = useParams<{ id: string }>();
  const assetId = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: asset, isLoading } = useGetAsset(assetId, {
    query: { enabled: !!assetId, queryKey: getGetAssetQueryKey(assetId) },
  });
  const { data: allScans } = useGetScans({ query: { queryKey: getGetScansQueryKey() } });
  const { data: allFindings } = useGetFindings({ query: { queryKey: getGetFindingsQueryKey() } });
  const createScan = useCreateScan();

  const scans = allScans?.filter((s) => s.assetId === assetId);
  const findings = allFindings?.filter((f) => f.assetId === assetId);

  const handleStartScan = () => {
    createScan.mutate(
      { data: { name: `Scan ${asset?.name}`, type: 'web_app', assetId } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() });
          toast({ title: 'Scan started', description: 'A new scan has been initiated' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Asset not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <Link href="/assets" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Assets
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{asset.name}</h1>
              <StatusBadge status={asset.status} />
            </div>
            <p className="text-muted-foreground font-mono">{asset.target}</p>
          </div>
          <Button onClick={handleStartScan} disabled={createScan.isPending} className="glow-primary" data-testid="button-start-scan">
            <Play className="w-4 h-4 mr-2" />
            {createScan.isPending ? 'Starting...' : 'Start Scan'}
          </Button>
        </div>
      </div>

      {/* Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Type</p>
          <p className="text-lg font-mono font-semibold">{asset.type.replace('_', ' ').toUpperCase()}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Risk Level</p>
          <p className="text-lg font-mono font-semibold uppercase">{asset.riskLevel}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Open Findings</p>
          <p className="text-2xl font-mono font-bold">{asset.openFindings || 0}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Last Scanned</p>
          <p className="text-sm font-mono">
            {asset.lastScannedAt
              ? formatDistanceToNow(new Date(asset.lastScannedAt), { addSuffix: true })
              : 'Never'}
          </p>
        </div>
      </div>

      {/* Scan History */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-bold mb-6">Scan History</h2>
        {scans && scans.length > 0 ? (
          <div className="space-y-4">
            {scans.map((scan) => (
              <Link key={scan.id} href={`/scans/${scan.id}`}>
                <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg hover:border-primary/50 transition-all cursor-pointer" data-testid={`scan-item-${scan.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{scan.name}</h3>
                      <StatusBadge status={scan.status} />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="font-mono">
                        {scan.startedAt
                          ? formatDistanceToNow(new Date(scan.startedAt), { addSuffix: true })
                          : 'Not started'}
                      </span>
                      {scan.findingsCount !== undefined && (
                        <span className="font-mono">{scan.findingsCount} findings</span>
                      )}
                    </div>
                  </div>
                  {scan.progress !== undefined && scan.status === 'running' && (
                    <div className="w-32">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${scan.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No scans yet. Start your first scan above.
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-bold mb-6">Findings</h2>
        {findings && findings.length > 0 ? (
          <div className="space-y-4">
            {findings.slice(0, 10).map((finding) => (
              <Link key={finding.id} href={`/findings/${finding.id}`}>
                <div className="flex items-start justify-between p-4 bg-muted/30 border border-border rounded-lg hover:border-primary/50 transition-all cursor-pointer" data-testid={`finding-item-${finding.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{finding.title}</h3>
                      <SeverityBadge severity={finding.severity} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{finding.category.replace('_', ' ')}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                      <span>{finding.mitreId}</span>
                      {finding.cve && <span>{finding.cve}</span>}
                    </div>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            ))}
            {findings.length > 10 && (
              <Link href="/findings">
                <p className="text-center text-sm text-primary hover:underline cursor-pointer">
                  View all {findings.length} findings →
                </p>
              </Link>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No findings yet</div>
        )}
      </div>
    </div>
  );
}
