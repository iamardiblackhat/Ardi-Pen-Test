import { useState } from 'react';
import { FileText, Plus, Download, Clock, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/status-badge';
import {
  useGetReports,
  useCreateReport,
  useGetAssets,
  useGetScans,
  getGetReportsQueryKey,
  getGetAssetsQueryKey,
  getGetScansQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';

const reportTypeLabels: Record<string, string> = {
  executive: 'Executive Summary',
  technical: 'Technical Report',
  compliance: 'Compliance Report',
  asset: 'Asset Report',
  pentest: 'Pentest Report',
};

const formatLabels: Record<string, string> = {
  pdf: 'PDF',
  html: 'HTML',
  json: 'JSON',
};

function statusIcon(status: string) {
  if (status === 'ready') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === 'generating') return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
  if (status === 'failed') return <AlertCircle className="w-4 h-4 text-destructive" />;
  return <Clock className="w-4 h-4 text-muted-foreground" />;
}

export default function Reports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useGetReports({
    query: { queryKey: getGetReportsQueryKey() },
  });
  const { data: assets } = useGetAssets({ query: { queryKey: getGetAssetsQueryKey() } });
  const { data: scans } = useGetScans({ query: { queryKey: getGetScansQueryKey() } });
  const createReport = useCreateReport();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('executive');
  const [format, setFormat] = useState('pdf');
  const [scanId, setScanId] = useState('');
  const [assetId, setAssetId] = useState('');

  const handleCreate = () => {
    if (!title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    createReport.mutate(
      {
        data: {
          title,
          type: type as any,
          format: format as any,
          scanId: scanId ? Number(scanId) : undefined,
          assetId: assetId ? Number(assetId) : undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetReportsQueryKey() });
          toast({ title: 'Report queued', description: `"${title}" is being generated` });
          setOpen(false);
          setTitle('');
          setScanId('');
          setAssetId('');
        },
        onError: () => {
          toast({ title: 'Failed to create report', variant: 'destructive' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">Reports</h1>
          <p className="text-muted-foreground">Generate and download security assessment reports</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary" data-testid="button-new-report">
              <Plus className="w-4 h-4 mr-2" />
              New Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Q3 2026 Security Assessment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="input-report-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(reportTypeLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(formatLabels).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(type === 'technical' || type === 'pentest') && (
                <div className="space-y-2">
                  <Label>Scan (optional)</Label>
                  <Select value={scanId} onValueChange={setScanId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a scan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No specific scan</SelectItem>
                      {scans?.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {type === 'asset' && (
                <div className="space-y-2">
                  <Label>Asset (optional)</Label>
                  <Select value={assetId} onValueChange={setAssetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All assets</SelectItem>
                      {assets?.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                className="w-full glow-primary"
                onClick={handleCreate}
                disabled={createReport.isPending}
                data-testid="button-generate-report"
              >
                {createReport.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                ) : 'Generate Report'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Report cards */}
      {reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...reports].reverse().map((report) => (
            <div
              key={report.id}
              className="bg-card border border-card-border rounded-xl p-6 shadow-md flex flex-col gap-4 hover:border-border transition-colors"
              data-testid={`report-card-${report.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <StatusBadge status={report.status as any} />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-sm leading-snug mb-1">{report.title}</h3>
                <p className="text-xs text-muted-foreground">{reportTypeLabels[report.type] ?? report.type}</p>
              </div>

              {report.summary && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {report.summary}
                </p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  {statusIcon(report.status)}
                  <span>{formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground uppercase">
                    {report.format}
                  </span>
                  {report.status === 'ready' && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                      <Download className="w-3 h-3" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
          <p className="text-sm mb-6">Generate your first security assessment report</p>
          <Button onClick={() => setOpen(true)} className="glow-primary">
            <Plus className="w-4 h-4 mr-2" />
            New Report
          </Button>
        </div>
      )}
    </div>
  );
}
