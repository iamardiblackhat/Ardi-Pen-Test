import { useMemo, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { useLocation, useParams } from 'wouter';
import { getGetFindingsQueryKey, useGetFindings, type Finding } from '@workspace/api-client-react';
import { Dialog } from '@workspace/ardi-ds/components/ui/dialog';
import { Input } from '@workspace/ardi-ds/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ardi-ds/components/ui/select';
import { FindingDetailDialog } from '@/features/findings/components/finding-detail-dialog';
import { FindingsTable } from '@/features/findings/components/findings-table';
import { PageError, PageLoading } from '@/shared/ui/page-state';
import { routes } from '@/shared/config/routes';

const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];

export default function Findings() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [, navigate] = useLocation();
  const requestedFindingId = Number(useParams<{ id?: string }>().id);
  const findingsQuery = useGetFindings({ query: { queryKey: getGetFindingsQueryKey() } });
  const findings = findingsQuery.data ?? [];
  const selected = Number.isFinite(requestedFindingId) ? findings.find((finding) => finding.id === requestedFindingId) ?? null : null;
  const filtered = useMemo(() => findings.filter((finding) => {
    if (severityFilter !== 'all' && finding.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && finding.status !== statusFilter) return false;
    return !search || `${finding.title} ${finding.assetName} ${finding.cve ?? ''} ${finding.mitreId}`.toLowerCase().includes(search.toLowerCase());
  }).sort((first, second) => severityOrder.indexOf(first.severity) - severityOrder.indexOf(second.severity)), [findings, search, severityFilter, statusFilter]);
  const summaries = [
    { label: 'Total', value: findings.length, style: 'text-foreground' },
    { label: 'Open', value: findings.filter((finding) => finding.status === 'open').length, style: 'text-destructive' },
    { label: 'Critical', value: findings.filter((finding) => finding.severity === 'critical').length, style: 'text-destructive' },
    { label: 'High', value: findings.filter((finding) => finding.severity === 'high').length, style: 'text-orange-400' },
  ];

  if (findingsQuery.isLoading) return <PageLoading label="Loading findings" />;
  if (findingsQuery.isError) return <div className="p-4 sm:p-8"><PageError title="Findings could not be loaded" description="The security API did not return test evidence." onRetry={() => findingsQuery.refetch()} /></div>;

  return (
    <main className="space-y-6 p-4 sm:p-8">
      <header><h1 className="text-3xl font-bold">Findings</h1><p className="mt-2 text-muted-foreground">Review vulnerabilities and evidence returned by authorised Pen Tests.</p></header>
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
