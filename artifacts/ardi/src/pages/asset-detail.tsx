import { useParams, Link, useLocation } from 'wouter';
import { ArrowLeft, Play, Server, AlertTriangle } from 'lucide-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { SeverityBadge } from '@/components/severity-badge';
import { computeSecurityGrade } from '@/lib/security-grade';
import {
  useGetAsset,
  useGetScans,
  useGetFindings,
  useCreateScan,
  useStartScan,
  getGetAssetQueryKey,
  getGetScansQueryKey,
  getGetFindingsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function AssetDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const assetId = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: asset, isLoading } = useGetAsset(assetId, {
    query: { enabled: !!assetId, queryKey: getGetAssetQueryKey(assetId) },
  });
  const { data: allScans } = useGetScans({ query: { queryKey: getGetScansQueryKey() } });
  const { data: allFindings } = useGetFindings({ query: { queryKey: getGetFindingsQueryKey() } });
  const createScan = useCreateScan();
  const startScan = useStartScan();

  const scans = allScans?.filter((s) => s.assetId === assetId);
  const findings = allFindings?.filter((f) => f.assetId === assetId);
  const grade = computeSecurityGrade({
    hasCompletedScan: Boolean(asset?.lastScannedAt) || (scans ?? []).some((s) => s.status === 'completed'),
    findings: findings ?? [],
  });

  const handleStartScan = async () => {
    try {
      const created = await createScan.mutateAsync({
        data: { name: `Security Check: ${asset?.name}`, type: 'full_stack', assetId },
      });
      const started = await startScan.mutateAsync({ id: created.id });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetFindingsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAssetQueryKey(assetId) }),
      ]);
      toast({
        title: started.status === 'completed' ? 'Security check complete' : 'Security check started',
        description:
          started.status === 'completed'
            ? `Found ${started.findingsCount ?? 0} item(s).`
            : 'Follow live progress on the check page.',
      });
      navigate(`/scans/${started.id}`);
    } catch {
      toast({
        title: 'Security check could not start',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    }
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
        <Link href="/test" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to targets
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{asset.name}</h1>
              <StatusBadge status={asset.status} />
            </div>
            <p className="text-muted-foreground font-mono">{asset.target}</p>
          </div>
          <Button onClick={handleStartScan} disabled={createScan.isPending || startScan.isPending} className="glow-primary" data-testid="button-start-scan">
            <Play className="w-4 h-4 mr-2" />
            {createScan.isPending || startScan.isPending ? 'Running check...' : 'Run Security Check'}
          </Button>
        </div>
      </div>

      {/* Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Security Grade</p>
          <div className="flex items-center gap-3">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-lg font-bold font-mono ${grade.badgeClass}`}>
              {grade.letter}
            </span>
            <div>
              <p className={`text-sm font-semibold ${grade.colorClass}`}>{grade.label}</p>
              <p className="text-xs text-muted-foreground">{grade.summary}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Risk Level</p>
          <p className="text-lg font-mono font-semibold uppercase">{asset.riskLevel}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Open Problems</p>
          <p className="text-2xl font-mono font-bold">{(findings ?? []).filter((f) => f.status === 'open' || f.status === 'in_progress').length}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Last Checked</p>
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
