import { useState, type FormEvent } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetReportsQueryKey, useCreateReport, useGetScans, type ReportInputFormat, type ReportInputType } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ardi-ds/components/ui/dialog';
import { Input } from '@workspace/ardi-ds/components/ui/input';
import { Label } from '@workspace/ardi-ds/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ardi-ds/components/ui/select';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { reportFormatLabels, reportTypeLabels } from '@/features/reports/report-options';
import { backendError } from '@/lib/api-error';

export function CreateReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReportInputType>('pentest');
  const [format, setFormat] = useState<ReportInputFormat>('html');
  const [scanId, setScanId] = useState('all');
  const scansQuery = useGetScans();
  const createReport = useCreateReport();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createReport.mutateAsync({ data: { title: title.trim(), type, format, scanId: scanId === 'all' ? undefined : Number(scanId) } });
      await queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() });
      toast({ title: 'Report ready', description: `${title.trim()} was generated from current workspace evidence.` });
      setTitle(''); setScanId('all'); onOpenChange(false);
    } catch (error) {
      toast({ title: 'Report could not be generated', description: backendError(error, 'Try again.'), variant: 'destructive' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button className="glow-primary"><Plus className="mr-2 h-4 w-4" aria-hidden="true" />New report</Button></DialogTrigger>
      <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Generate a report</DialogTitle></DialogHeader>
        <form className="space-y-4 pt-2" onSubmit={submit}>
          <div className="space-y-2"><Label htmlFor="report-title">Title</Label><Input id="report-title" required placeholder="Security assessment" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="report-type">Report type</Label><Select value={type} onValueChange={(value) => setType(value as ReportInputType)}><SelectTrigger id="report-type"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(reportTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="report-format">Format</Label><Select value={format} onValueChange={(value) => setFormat(value as ReportInputFormat)}><SelectTrigger id="report-format"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(reportFormatLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
          {type === 'technical' || type === 'pentest' ? <div className="space-y-2"><Label htmlFor="report-scan">Pen Test run <span className="text-muted-foreground">(optional)</span></Label><Select value={scanId} onValueChange={setScanId}><SelectTrigger id="report-scan"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Pen Tests</SelectItem>{scansQuery.data?.map((scan) => <SelectItem key={scan.id} value={String(scan.id)}>{scan.name}</SelectItem>)}</SelectContent></Select></div> : null}
          <Button type="submit" className="min-h-12 w-full glow-primary" disabled={!title.trim() || createReport.isPending}>{createReport.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}{createReport.isPending ? 'Generating report…' : 'Generate report'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
