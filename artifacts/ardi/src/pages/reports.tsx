import { useState } from 'react';
import { getGetReportsQueryKey, useGetReports, type Report } from '@workspace/api-client-react';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { CreateReportDialog } from '@/features/reports/components/create-report-dialog';
import { ReportCard } from '@/features/reports/components/report-card';
import { auth } from '@/lib/auth';
import { PageEmpty, PageError, PageLoading } from '@/shared/ui/page-state';

export default function Reports() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const reportsQuery = useGetReports({ query: { queryKey: getGetReportsQueryKey() } });
  const { toast } = useToast();

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

  if (reportsQuery.isLoading) return <PageLoading label="Loading reports" />;
  if (reportsQuery.isError) return <div className="p-4 sm:p-8"><PageError title="Reports could not be loaded" description="The security API did not return generated reports." onRetry={() => reportsQuery.refetch()} /></div>;
  const reports = [...(reportsQuery.data ?? [])].reverse();

  return (
    <main className="space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-bold">Reports</h1><p className="mt-2 text-muted-foreground">Generate downloadable reports from current targets, Pen Tests, and findings.</p></div><CreateReportDialog open={dialogOpen} onOpenChange={setDialogOpen} /></header>
      {reports.length ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Generated reports">{reports.map((report) => <ReportCard key={report.id} report={report} onDownload={download} />)}</section> : <PageEmpty title="No reports yet" description="Generate a report from real workspace evidence." actionLabel="New report" onAction={() => setDialogOpen(true)} />}
    </main>
  );
}
