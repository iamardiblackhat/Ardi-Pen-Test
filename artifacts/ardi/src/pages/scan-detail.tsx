import { useParams, Link } from 'wouter';
import { ArrowLeft, Play, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { SeverityBadge } from '@/components/severity-badge';
import {
  useGetScan,
  useGetScanFindings,
  useStartScan,
  useStopScan,
  getGetScanQueryKey,
  getGetScanFindingsQueryKey,
  getGetScansQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function ScanDetail() {
  const params = useParams<{ id: string }>();
  const scanId = Number(params.id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scan, isLoading } = useGetScan(scanId, {
    query: { enabled: !!scanId, queryKey: getGetScanQueryKey(scanId) },
  });
  const { data: findings } = useGetScanFindings(scanId, {
    query: { enabled: !!scanId, queryKey: getGetScanFindingsQueryKey(scanId) },
  });
  const startScan = useStartScan();
  const stopScan = useStopScan();

  const handleStart = () => {
    startScan.mutate(
      { id: scanId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetScanQueryKey(scanId) });
          queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() });
          toast({ title: 'Scan started' });
        },
      }
    );
  };

  const handleStop = () => {
    stopScan.mutate(
      { id: scanId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetScanQueryKey(scanId) });
          queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() });
          toast({ title: 'Scan stopped' });
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

  if (!scan) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Scan not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <Link href="/scans" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Scans
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{scan.name}</h1>
              <StatusBadge status={scan.status} />
            </div>
            <p className="text-muted-foreground">
              Asset: <Link href={`/assets/${scan.assetId}`} className="font-mono hover:text-primary">{scan.assetName}</Link>
            </p>
          </div>
          <div className="flex gap-2">
            {scan.status === 'pending' && (
              <Button onClick={handleStart} disabled={startScan.isPending} className="glow-primary" data-testid="button-start-scan">
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
            )}
            {scan.status === 'running' && (
              <Button onClick={handleStop} disabled={stopScan.isPending} variant="destructive" data-testid="button-stop-scan">
                <StopCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      {scan.status === 'running' && scan.progress !== undefined && (
        <div className="bg-card border border-card-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Scan Progress</h2>
            <span className="text-2xl font-mono font-bold text-primary">{scan.progress}%</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all animate-pulse glow-primary"
              style={{ width: `${scan.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Scan Type</p>
          <p className="text-lg font-mono font-semibold">{scan.type.replace('_', ' ').toUpperCase()}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Findings</p>
          <p className="text-2xl font-mono font-bold">{scan.findingsCount || 0}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Critical</p>
          <p className="text-2xl font-mono font-bold text-destructive">{scan.criticalCount || 0}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-2">Duration</p>
          <p className="text-lg font-mono">
            {scan.duration ? `${Math.round(scan.duration / 60)}m ${scan.duration % 60}s` : 'In progress'}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-bold mb-6">Timeline</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 bg-primary rounded-full mt-2" />
            <div>
              <p className="font-semibold">Scan Created</p>
              <p className="text-sm text-muted-foreground font-mono">
                {formatDistanceToNow(new Date(scan.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          {scan.startedAt && (
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-primary rounded-full mt-2" />
              <div>
                <p className="font-semibold">Scan Started</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(scan.startedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          )}
          {scan.completedAt && (
            <div className="flex items-start gap-4">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
              <div>
                <p className="font-semibold">Scan Completed</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {formatDistanceToNow(new Date(scan.completedAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Findings */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-bold mb-6">Discovered Findings</h2>
        {findings && findings.length > 0 ? (
          <div className="space-y-4">
            {findings.map((finding) => (
              <Link key={finding.id} href={`/findings/${finding.id}`}>
                <div className="flex items-start justify-between p-4 bg-muted/30 border border-border rounded-lg hover:border-primary/50 transition-all cursor-pointer" data-testid={`finding-item-${finding.id}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold">{finding.title}</h3>
                      <SeverityBadge severity={finding.severity} />
                    </div>
                    <p className="text-sm text-muted-foreground">{finding.category.replace('_', ' ')}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono mt-2">
                      <span>{finding.mitreId}</span>
                      {finding.cve && <span>{finding.cve}</span>}
                      {finding.cvss && <span>CVSS: {finding.cvss}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {scan.status === 'running' ? 'Scanning in progress...' : 'No findings discovered'}
          </div>
        )}
      </div>

      {/* Status summary — real fields from the scan record. There is no live
          log stream from the scanner yet, so this deliberately doesn't fake
          one; it shows what's actually known. */}
      <div className="bg-card border border-card-border rounded-xl p-6">
        <h2 className="text-lg font-bold mb-6">Scan Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs mb-1">Target</p>
            <p className="font-mono">{scan.assetName}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Type</p>
            <p className="font-mono">{scan.type}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Progress</p>
            <p className="font-mono">{scan.progress ?? 0}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Findings so far</p>
            <p className="font-mono">{scan.findingsCount ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
