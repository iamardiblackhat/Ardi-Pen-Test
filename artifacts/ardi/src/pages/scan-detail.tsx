import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Play, PlusCircle, StopCircle } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetScanFindingsQueryKey, getGetScanQueryKey, getGetScansQueryKey, useGetScan, useGetScanFindings, useStartScan, useStopScan } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { StatusBadge } from '@/components/status-badge';
import { ScanResults } from '@/features/scans/components/scan-results';
import { auth } from '@/lib/auth';
import { backendError } from '@/lib/api-error';
import { routes } from '@/shared/config/routes';
import { PageError, PageLoading } from '@/shared/ui/page-state';

interface ScanDiffItem {
  id: number;
  title: string;
  severity: string;
  category: string;
}

interface ScanDiff {
  hasPrevious: boolean;
  previousScan: {
    id: number;
    name: string;
    completedAt: string | null;
    findingsCount: number;
  } | null;
  newFindings: ScanDiffItem[];
  fixedFindings: ScanDiffItem[];
  unchangedCount: number;
}

export default function ScanDetail() {
  const scanId = Number(useParams<{ id: string }>().id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scanQuery = useGetScan(scanId, { query: { enabled: Number.isFinite(scanId), queryKey: getGetScanQueryKey(scanId) } });
  const findingsQuery = useGetScanFindings(scanId, { query: { enabled: Number.isFinite(scanId), queryKey: getGetScanFindingsQueryKey(scanId) } });
  const startScan = useStartScan();
  const stopScan = useStopScan();
  const [diff, setDiff] = useState<ScanDiff | null>(null);

  useEffect(() => {
    if (!Number.isFinite(scanId) || scanQuery.data?.status !== 'completed') return;
    let alive = true;
    fetch(`/api/scans/${scanId}/diff`, {
      headers: auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ScanDiff | null) => {
        if (alive) setDiff(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [scanId, scanQuery.data?.status]);

  async function updateRun(action: 'start' | 'stop') {
    try {
      if (action === 'start') await startScan.mutateAsync({ id: scanId }); else await stopScan.mutateAsync({ id: scanId });
      await Promise.all([queryClient.invalidateQueries({ queryKey: getGetScanQueryKey(scanId) }), queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() })]);
      toast({ title: action === 'start' ? 'Pen Test started' : 'Pen Test stopped' });
    } catch (error) {
      toast({ title: `Pen Test could not be ${action === 'start' ? 'started' : 'stopped'}`, description: backendError(error, 'Try again.'), variant: 'destructive' });
    }
  }

  if (!Number.isFinite(scanId)) return <div className="p-4 sm:p-8"><PageError title="Invalid Pen Test" description="This assessment address is not valid." /></div>;
  if (scanQuery.isLoading) return <PageLoading label="Loading Pen Test" />;
  if (scanQuery.isError || !scanQuery.data) return <div className="p-4 sm:p-8"><PageError title="Pen Test not found" description="The assessment may have been removed or is unavailable." onRetry={() => scanQuery.refetch()} /></div>;
  const scan = scanQuery.data;

  return (
    <main className="space-y-6 p-4 sm:p-8">
      <header><Link href={routes.testRuns} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to runs</Link><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{scan.name}</h1><StatusBadge status={scan.status} /></div><p className="mt-2 text-muted-foreground">Target: <Link href={routes.asset(scan.assetId)} className="font-mono hover:text-primary">{scan.assetName}</Link></p></div><div>{scan.status === 'pending' ? <Button onClick={() => updateRun('start')} disabled={startScan.isPending} className="glow-primary"><Play className="mr-2 h-4 w-4" aria-hidden="true" />Start Pen Test</Button> : null}{scan.status === 'running' ? <Button onClick={() => updateRun('stop')} disabled={stopScan.isPending} variant="destructive"><StopCircle className="mr-2 h-4 w-4" aria-hidden="true" />Stop Pen Test</Button> : null}</div></div></header>
      {diff && diff.hasPrevious ? (
        <section className="rounded-xl border border-card-border bg-card p-5 shadow-sm" aria-label="Changes since last check">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold">What changed since your last check</h2>
              <p className="text-xs text-muted-foreground">
                Compared against {diff.previousScan?.name ?? 'previous check'}
                {diff.previousScan?.completedAt ? ` (${new Date(diff.previousScan.completedAt).toLocaleDateString()})` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-xs">
              <span className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-orange-300">
                +{diff.newFindings.length} new
              </span>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                -{diff.fixedFindings.length} fixed
              </span>
              <span className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                {diff.unchangedCount} unchanged
              </span>
            </div>
          </div>
          {diff.newFindings.length > 0 || diff.fixedFindings.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {diff.newFindings.length > 0 ? (
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-orange-300">
                    <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    New problems spotted
                  </p>
                  <ul className="space-y-1 text-xs">
                    {diff.newFindings.slice(0, 6).map((item) => (
                      <li key={item.id}>
                        <Link href={routes.finding(item.id)} className="hover:underline">
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {diff.fixedFindings.length > 0 ? (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Fixed since last check
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {diff.fixedFindings.slice(0, 6).map((item) => (
                      <li key={item.id} className="line-through">
                        {item.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              No new problems appeared and nothing changed since the previous check.
            </p>
          )}
        </section>
      ) : null}
      {findingsQuery.isError ? <PageError title="Findings could not be loaded" description="The assessment exists, but its evidence is currently unavailable." onRetry={() => findingsQuery.refetch()} /> : <ScanResults scan={scan} findings={findingsQuery.data} />}
    </main>
  );
}
