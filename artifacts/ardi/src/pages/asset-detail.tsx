import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { Activity, ArrowLeft, Loader2, Lock, Play, RefreshCw, Server, AlertTriangle } from 'lucide-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { Switch } from '@workspace/ardi-ds/components/ui/switch';
import { StatusBadge } from '@/components/status-badge';
import { SeverityBadge } from '@/components/severity-badge';
import { auth } from '@/lib/auth';
import { computeSecurityGrade } from '@/lib/security-grade';
import {
  useGetAsset,
  useGetScans,
  useGetFindings,
  useCreateScan,
  useStartScan,
  useUpdateAsset,
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
  const updateAsset = useUpdateAsset();

  interface AssetHealth {
    online: boolean;
    httpStatus: number | null;
    responseTimeMs: number | null;
    tls: {
      available: boolean;
      protocol: string | null;
      issuer: string | null;
      validTo: string | null;
      daysRemaining: number | null;
      expiryStatus: 'healthy' | 'expiring_soon' | 'expired' | 'unavailable';
    };
  }
  const [health, setHealth] = useState<AssetHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const loadHealth = async () => {
    if (!assetId) return;
    setHealthLoading(true);
    try {
      const res = await fetch(`/api/assets/${assetId}/health`, {
        headers: auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {},
      });
      if (res.ok) setHealth((await res.json()) as AssetHealth);
    } catch {
      // ignore transient network errors
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    void loadHealth();
  }, [assetId]);

  const weeklyMonitoring = (asset?.tags ?? []).includes('monitor:weekly');

  const toggleWeeklyMonitoring = async (enabled: boolean) => {
    if (!asset) return;
    const baseTags = (asset.tags ?? []).filter((t) => t !== 'monitor:weekly');
    const nextTags = enabled ? [...baseTags, 'monitor:weekly'] : baseTags;
    try {
      await updateAsset.mutateAsync({ id: asset.id, data: { tags: nextTags } });
      await queryClient.invalidateQueries({ queryKey: getGetAssetQueryKey(assetId) });
      toast({
        title: enabled ? 'Weekly monitoring enabled' : 'Weekly monitoring paused',
        description: enabled
          ? `${asset.name} is marked for recurring weekly security checks.`
          : `${asset.name} will only be checked when you start one manually.`,
      });
    } catch {
      toast({
        title: 'Could not update monitoring setting',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

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

      {/* Live Website Health & SSL Expiry */}
      <div className="bg-card border border-card-border rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Live Website Health &amp; SSL Certificate Expiry
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real-time online check, response speed, and exact days remaining before your SSL certificate expires.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void loadHealth()} disabled={healthLoading}>
            {healthLoading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            Refresh Live Check
          </Button>
        </div>
        {health ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-muted-foreground uppercase font-mono text-[10px]">Website Status</p>
              <p className={`mt-1 font-semibold text-sm ${health.online ? 'text-emerald-400' : 'text-destructive'}`}>
                {health.online ? `Online (HTTP ${health.httpStatus})` : 'Offline / Unreachable'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-muted-foreground uppercase font-mono text-[10px]">Response Speed</p>
              <p className="mt-1 font-semibold font-mono text-sm">
                {health.responseTimeMs !== null ? `${health.responseTimeMs} ms` : 'Unavailable'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-muted-foreground uppercase font-mono text-[10px]">SSL Expiry</p>
              <p
                className={`mt-1 font-semibold font-mono text-sm ${
                  health.tls.expiryStatus === 'healthy'
                    ? 'text-emerald-400'
                    : health.tls.expiryStatus === 'expiring_soon'
                      ? 'text-amber-400'
                      : 'text-destructive'
                }`}
              >
                {health.tls.daysRemaining !== null
                  ? health.tls.daysRemaining < 0
                    ? `Expired ${Math.abs(health.tls.daysRemaining)}d ago`
                    : `${health.tls.daysRemaining} days left`
                  : 'No SSL detected'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-muted-foreground uppercase font-mono text-[10px]">TLS &amp; Issuer</p>
              <p className="mt-1 font-semibold text-sm truncate flex items-center gap-1" title={health.tls.issuer ?? ''}>
                <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
                {health.tls.protocol ?? 'None'}{health.tls.issuer ? ` (${health.tls.issuer})` : ''}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Running live website and SSL check...</p>
        )}
      </div>

      {/* Monitoring Schedule */}
      <div className="bg-card border border-card-border rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-sm">Weekly Monitoring &amp; Change Tracking</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track this website on a weekly schedule and highlight any new or fixed problems on each run.
          </p>
        </div>
        <Switch
          checked={weeklyMonitoring}
          disabled={updateAsset.isPending}
          onCheckedChange={(v) => void toggleWeeklyMonitoring(v)}
          aria-label="Enable weekly monitoring"
        />
      </div>

      {/* Embeddable Security Trust Badge */}
      {(() => {
        const cleanDomain = asset.target
          .replace(/^https?:\/\//i, '')
          .replace(/\/.*$/, '')
          .replace(/:\d+$/, '')
          .replace(/^www\./i, '');
        const badgeSrc = `${window.location.origin}/api/badge/${encodeURIComponent(cleanDomain)}.svg`;
        const embedHtml = `<a href="${window.location.origin}" target="_blank" rel="noreferrer"><img src="${badgeSrc}" alt="Verified by ARDI SEC" height="28" /></a>`;
        return (
          <div className="bg-card border border-card-border rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="font-semibold text-sm">Embeddable Website Security Badge</p>
              <p className="text-xs text-muted-foreground">
                Show visitors your live A+ to F security grade in your website footer. Updates automatically after every scan.
              </p>
              <div className="pt-1">
                <img src={`/api/badge/${encodeURIComponent(cleanDomain)}.svg`} alt="ARDI SEC live badge" height={28} />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void navigator.clipboard?.writeText(embedHtml);
                toast({
                  title: 'Badge HTML copied',
                  description: 'Paste it into your website footer to display your live ARDI SEC grade.',
                });
              }}
            >
              Copy HTML Embed Code
            </Button>
          </div>
        );
      })()}

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
