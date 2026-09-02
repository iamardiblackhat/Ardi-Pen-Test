import { AlertCircle, CheckCircle2, Clock, Download, FileText, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Report } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { reportTypeLabels } from '@/features/reports/report-options';

function StatusIcon({ status }: { status: Report['status'] }) {
  if (status === 'ready') return <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />;
  if (status === 'generating') return <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />;
  if (status === 'failed') return <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />;
  return <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

export function ReportCard({ report, onDownload }: { report: Report; onDownload: (report: Report) => void }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-card-border bg-card p-5 shadow-md transition hover:border-border">
      <div className="flex items-start justify-between"><span className="rounded-lg border border-primary/20 bg-primary/10 p-2"><FileText className="h-5 w-5 text-primary" aria-hidden="true" /></span><StatusBadge status={report.status} /></div>
      <div className="flex-1"><h2 className="font-semibold leading-snug">{report.title}</h2><p className="mt-1 text-sm text-muted-foreground">{reportTypeLabels[report.type]}</p></div>
      {report.summary ? <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{report.summary}</p> : null}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground"><StatusIcon status={report.status} />{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}</span>{report.status === 'ready' && report.downloadUrl ? <Button size="sm" variant="outline" onClick={() => onDownload(report)}><Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Download {report.format.toUpperCase()}</Button> : null}</footer>
    </article>
  );
}
