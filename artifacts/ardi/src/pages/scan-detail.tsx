import { ArrowLeft, Play, StopCircle } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetScanFindingsQueryKey, getGetScanQueryKey, getGetScansQueryKey, useGetScan, useGetScanFindings, useStartScan, useStopScan } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { StatusBadge } from '@/components/status-badge';
import { ScanResults } from '@/features/scans/components/scan-results';
import { backendError } from '@/lib/api-error';
import { routes } from '@/shared/config/routes';
import { PageError, PageLoading } from '@/shared/ui/page-state';

export default function ScanDetail() {
  const scanId = Number(useParams<{ id: string }>().id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scanQuery = useGetScan(scanId, { query: { enabled: Number.isFinite(scanId), queryKey: getGetScanQueryKey(scanId) } });
  const findingsQuery = useGetScanFindings(scanId, { query: { enabled: Number.isFinite(scanId), queryKey: getGetScanFindingsQueryKey(scanId) } });
  const startScan = useStartScan();
  const stopScan = useStopScan();

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
      <header><Link href={routes.scans} className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to Pen Testing</Link><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold">{scan.name}</h1><StatusBadge status={scan.status} /></div><p className="mt-2 text-muted-foreground">Target: <Link href={routes.asset(scan.assetId)} className="font-mono hover:text-primary">{scan.assetName}</Link></p></div><div>{scan.status === 'pending' ? <Button onClick={() => updateRun('start')} disabled={startScan.isPending} className="glow-primary"><Play className="mr-2 h-4 w-4" aria-hidden="true" />Start Pen Test</Button> : null}{scan.status === 'running' ? <Button onClick={() => updateRun('stop')} disabled={stopScan.isPending} variant="destructive"><StopCircle className="mr-2 h-4 w-4" aria-hidden="true" />Stop Pen Test</Button> : null}</div></div></header>
      {findingsQuery.isError ? <PageError title="Findings could not be loaded" description="The assessment exists, but its evidence is currently unavailable." onRetry={() => findingsQuery.refetch()} /> : <ScanResults scan={scan} findings={findingsQuery.data} />}
    </main>
  );
}
