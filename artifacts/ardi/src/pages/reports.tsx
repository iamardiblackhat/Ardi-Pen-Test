import { useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { getGetReportsQueryKey, useGetReports, type Report } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@workspace/ardi-ds/components/ui/dialog';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { CreateReportDialog } from '@/features/reports/components/create-report-dialog';
import { ReportCard } from '@/features/reports/components/report-card';
import { auth } from '@/lib/auth';
import { PageEmpty, PageError, PageLoading } from '@/shared/ui/page-state';

export default function Reports() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [sharedIds, setSharedIds] = useState<Record<number, boolean>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const reportsQuery = useGetReports({ query: { queryKey: getGetReportsQueryKey() } });
  const { toast } = useToast();

  async function shareReport(report: Report) {
    try {
      const response = await fetch(`/api/reports/${report.id}/share`, {
        method: 'POST',
        headers: { authorization: `Bearer ${auth.getToken() ?? ''}` },
      });
      const data = await response.json();
      if (!response.ok || !data.sharePath) throw new Error(data.error || 'Could not create share link.');
      const fullUrl = `${window.location.origin}${data.sharePath}`;
      await navigator.clipboard?.writeText(fullUrl).catch(() => {});
      setSharedIds((prev) => ({ ...prev, [report.id]: true }));
      toast({
        title: 'Client share link copied',
        description: `${fullUrl} (valid for 14 days, no login needed).`,
      });
    } catch {
      toast({ title: 'Could not create share link', description: 'Try again.', variant: 'destructive' });
    }
  }

  async function revokeShare(report: Report) {
    try {
      const response = await fetch(`/api/reports/${report.id}/share`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${auth.getToken() ?? ''}` },
      });
      if (!response.ok) throw new Error('Failed to revoke');
      setSharedIds((prev) => ({ ...prev, [report.id]: false }));
      toast({ title: 'Share link revoked', description: 'Anyone with the old link can no longer open this report.' });
    } catch {
      toast({ title: 'Could not revoke share link', description: 'Try again.', variant: 'destructive' });
    }
  }

  async function download(report: Report) {
    if (!report.downloadUrl) return;
    try {
      const response = await fetch(report.downloadUrl, { headers: { authorization: `Bearer ${auth.getToken() ?? ''}` } });
      if (!response.ok) throw new Error(`Download failed with status ${response.status}`);
      const blobUrl = URL.createObjectURL(await response.blob());
      const disposition = response.headers.get('Content-Disposition') ?? '';
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `${report.title}.${report.format}`;
      const anchor = document.createElement('a');
      anchor.href = blobUrl; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: 'Report download failed', description: 'The report service did not return a downloadable file.', variant: 'destructive' });
    }
  }

  async function preview(report: Report) {
    if (!report.downloadUrl) return;
    try {
      const response = await fetch(report.downloadUrl, { headers: { authorization: `Bearer ${auth.getToken() ?? ''}` } });
      if (!response.ok) throw new Error(`Preview failed with status ${response.status}`);
      const html = await response.text();
      setPreviewTitle(report.title);
      setPreviewHtml(html);
    } catch {
      toast({ title: 'Report preview failed', description: 'Could not load the report preview.', variant: 'destructive' });
    }
  }

  function printPreview() {
    iframeRef.current?.contentWindow?.focus();
    iframeRef.current?.contentWindow?.print();
  }

  if (reportsQuery.isLoading) return <PageLoading label="Loading reports" />;
  if (reportsQuery.isError) return <div className="p-4 sm:p-8"><PageError title="Reports could not be loaded" description="The security API did not return generated reports." onRetry={() => reportsQuery.refetch()} /></div>;
  const reports = [...(reportsQuery.data ?? [])].reverse();

  return (
    <main className="space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-bold">Reports</h1><p className="mt-2 text-muted-foreground">Create a file from the targets, checks, and problems already stored, then preview, print as PDF, or download it.</p></div><CreateReportDialog open={dialogOpen} onOpenChange={setDialogOpen} /></header>
      {reports.length ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Generated reports">{reports.map((report) => <ReportCard key={report.id} report={report} onDownload={download} onPreview={preview} onShare={shareReport} onRevokeShare={revokeShare} isShared={Boolean(sharedIds[report.id])} />)}</section> : <PageEmpty title="No reports yet" description="Generate a report from real workspace evidence." actionLabel="New report" onAction={() => setDialogOpen(true)} />}

      <Dialog open={previewHtml !== null} onOpenChange={(open) => !open && setPreviewHtml(null)}>
        <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-3">
          <DialogHeader className="flex flex-row items-center justify-between gap-4 pr-8">
            <DialogTitle className="truncate">{previewTitle}</DialogTitle>
            <Button size="sm" onClick={printPreview}>
              <Printer className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Print / Save as PDF
            </Button>
          </DialogHeader>
          {previewHtml ? (
            <iframe
              ref={iframeRef}
              title={`Preview of ${previewTitle}`}
              srcDoc={previewHtml}
              className="w-full flex-1 rounded-lg border border-border bg-white"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
