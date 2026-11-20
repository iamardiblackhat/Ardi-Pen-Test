import { useMemo, useState } from 'react';
import { CheckCheck, Copy, Download, Filter, Loader2, Search } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetFindingsQueryKey, useGetFindings, type Finding } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { Dialog } from '@workspace/ardi-ds/components/ui/dialog';
import { Input } from '@workspace/ardi-ds/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ardi-ds/components/ui/select';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { FindingDetailDialog } from '@/features/findings/components/finding-detail-dialog';
import { FindingsTable } from '@/features/findings/components/findings-table';
import { auth } from '@/lib/auth';
import { PageError, PageLoading } from '@/shared/ui/page-state';
import { routes } from '@/shared/config/routes';

const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];

function csvCell(value: unknown): string {
  const s = String(value ?? '').replace(/"/g, '""');
  return `"${s}"`;
}

export default function Findings() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bulkResolving, setBulkResolving] = useState(false);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const requestedFindingId = Number(useParams<{ id?: string }>().id);
  const findingsQuery = useGetFindings({ query: { queryKey: getGetFindingsQueryKey() } });
  const findings = findingsQuery.data ?? [];
  const selected = Number.isFinite(requestedFindingId) ? findings.find((finding) => finding.id === requestedFindingId) ?? null : null;
  const filtered = useMemo(() => findings.filter((finding) => {
    if (severityFilter !== 'all' && finding.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && finding.status !== statusFilter) return false;
    return !search || `${finding.title} ${finding.assetName} ${finding.cve ?? ''} ${finding.mitreId}`.toLowerCase().includes(search.toLowerCase());
  }).sort((first, second) => severityOrder.indexOf(first.severity) - severityOrder.indexOf(second.severity)), [findings, search, severityFilter, statusFilter]);

  const filteredOpen = useMemo(
    () => filtered.filter((f) => f.status === 'open' || f.status === 'in_progress'),
    [filtered],
  );

  function exportCsv() {
    const header = ['Title', 'Severity', 'Status', 'Target', 'Category', 'CVE', 'CVSS', 'MITRE', 'Remediation'];
    const rows = filtered.map((f) => [
      f.title,
      f.severity,
      f.status,
      f.assetName ?? '',
      f.category,
      f.cve ?? '',
      f.cvss ?? '',
      f.mitreId,
      f.remediation,
    ]);
    const csv = [header.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ardi-findings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV exported', description: `Downloaded ${filtered.length} findings.` });
  }

  async function copyMarkdown() {
    const lines = [
      `# Security Findings (${filtered.length})`,
      '',
      ...filtered.map(
        (f) =>
          `- [ ] **[${f.severity.toUpperCase()}] ${f.title}** (${f.assetName ?? 'Target'}${f.cve ? `, ${f.cve}` : ''})\n  - Status: ${f.status}\n  - Fix: ${f.remediation}`,
      ),
    ];
    await navigator.clipboard?.writeText(lines.join('\n')).catch(() => {});
    toast({
      title: 'Markdown copied',
      description: 'Paste straight into GitHub Issues, Linear, or Jira.',
    });
  }

  async function resolveFilteredOpen() {
    if (filteredOpen.length === 0) return;
    setBulkResolving(true);
    try {
      const token = auth.getToken();
      await Promise.all(
        filteredOpen.map((f) =>
          fetch(`/api/findings/${f.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ status: 'resolved' }),
          }),
        ),
      );
      await queryClient.invalidateQueries({ queryKey: getGetFindingsQueryKey() });
      toast({
        title: 'Findings marked resolved',
        description: `Updated ${filteredOpen.length} open finding${filteredOpen.length === 1 ? '' : 's'}.`,
      });
    } catch {
      toast({ title: 'Bulk update failed', description: 'Try again.', variant: 'destructive' });
    } finally {
      setBulkResolving(false);
    }
  }

  const summaries = [
    { label: 'Total', value: findings.length, style: 'text-foreground' },
    { label: 'Open', value: findings.filter((finding) => finding.status === 'open').length, style: 'text-destructive' },
    { label: 'Critical', value: findings.filter((finding) => finding.severity === 'critical').length, style: 'text-destructive' },
    { label: 'High', value: findings.filter((finding) => finding.severity === 'high').length, style: 'text-orange-400' },
  ];

  if (findingsQuery.isLoading) return <PageLoading label="Loading problems" />;
  if (findingsQuery.isError) return <div className="p-4 sm:p-8"><PageError title="Findings could not be loaded" description="The security API did not return test evidence." onRetry={() => findingsQuery.refetch()} /></div>;

  return (
    <main className="space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Problems</h1>
          <p className="mt-2 text-muted-foreground">These are the weaknesses a check actually found. Open one to see the evidence and a suggested fix.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => void copyMarkdown()} disabled={filtered.length === 0}>
            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Copy Markdown
          </Button>
          {filteredOpen.length > 0 ? (
            <Button size="sm" variant="default" onClick={() => void resolveFilteredOpen()} disabled={bulkResolving}>
              {bulkResolving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              )}
              Resolve {filteredOpen.length} Open
            </Button>
          ) : null}
        </div>
      </header>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Finding summary">{summaries.map((summary) => <article key={summary.label} className="rounded-xl border bg-card p-4 sm:p-5"><h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground">{summary.label}</h2><p className={`mt-2 text-3xl font-bold font-mono ${summary.style}`}>{summary.value}</p></article>)}</section>
      <section className="flex flex-col gap-3 sm:flex-row" aria-label="Filter findings">
        <label className="relative flex-1 sm:max-w-sm"><span className="sr-only">Search findings</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input placeholder="Search title, target, CVE, or MITRE ID…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" /></label>
        <Select value={severityFilter} onValueChange={setSeverityFilter}><SelectTrigger className="w-full sm:w-44" aria-label="Filter by severity"><Filter className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden="true" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All severities</SelectItem><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent></Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-44" aria-label="Filter by status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="open">Open</SelectItem><SelectItem value="in_progress">In progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="accepted_risk">Accepted risk</SelectItem><SelectItem value="false_positive">False positive</SelectItem></SelectContent></Select>
      </section>
      <FindingsTable findings={filtered} onSelect={(finding: Finding) => navigate(routes.finding(finding.id))} />
      <p className="text-sm text-muted-foreground" aria-live="polite">{filtered.length} of {findings.length} findings</p>
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && navigate(routes.findings)}>{selected ? <FindingDetailDialog finding={selected} onClose={() => navigate(routes.findings)} /> : null}</Dialog>
    </main>
  );
}
