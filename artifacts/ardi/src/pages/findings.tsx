import { useState } from 'react';
import { ThreatIntel } from '@/components/threat-intel';
import { Link } from 'wouter';
import {
  AlertTriangle, Search, Filter, ExternalLink, ChevronDown, Shield,
  ArrowUpDown, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/severity-badge';
import { StatusBadge } from '@/components/status-badge';
import {
  useGetFindings,
  useUpdateFinding,
  getGetFindingsQueryKey,
} from '@workspace/api-client-react';
import type { Finding } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];

function FindingDetail({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateFinding = useUpdateFinding();

  const handleStatusChange = (status: string) => {
    updateFinding.mutate(
      { id: finding.id, data: { status: status as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetFindingsQueryKey() });
          toast({ title: 'Status updated', description: `Finding marked as ${status.replace('_', ' ')}` });
        },
      }
    );
  };

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-start gap-3 pr-8">
          <span className="flex-1 leading-tight">{finding.title}</span>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-5">
        {/* Meta row */}
        <div className="flex flex-wrap gap-2">
          <SeverityBadge severity={finding.severity as any} />
          <StatusBadge status={finding.status as any} />
          {finding.cve && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold border bg-muted text-muted-foreground border-muted-foreground/30 uppercase tracking-wide">
              {finding.cve}
            </span>
          )}
          {finding.cvss !== null && finding.cvss !== undefined && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold border bg-orange-500/10 text-orange-400 border-orange-500/30 uppercase tracking-wide">
              CVSS {finding.cvss.toFixed(1)}
            </span>
          )}
        </div>

        {/* MITRE */}
        {finding.mitreId && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">MITRE ATT&CK</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Technique ID</p>
                <p className="font-mono font-semibold">{finding.mitreId}</p>
              </div>
              {finding.mitreTactic && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tactic</p>
                  <p className="font-semibold capitalize">{finding.mitreTactic.replace('-', ' ')}</p>
                </div>
              )}
              {finding.mitreTechnique && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Technique</p>
                  <p className="font-semibold">{finding.mitreTechnique}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live threat intelligence (OpenCTI) */}
        <ThreatIntel findingId={finding.id} />

        {/* Asset */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Affected Asset</p>
          <Link
            href={`/assets/${finding.assetId}`}
            className="text-primary hover:underline font-medium flex items-center gap-1"
            onClick={onClose}
          >
            {finding.assetName}
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Description</p>
          <p className="text-sm leading-relaxed">{finding.description}</p>
        </div>

        {/* Remediation */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Remediation</p>
          <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-4">
            <p className="text-sm leading-relaxed">{finding.remediation}</p>
          </div>
        </div>

        {/* Evidence */}
        {finding.evidence && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Evidence</p>
            <pre className="text-xs font-mono bg-muted rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
              {finding.evidence}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <p className="text-sm text-muted-foreground mr-2">Update status:</p>
          {['resolved', 'accepted_risk', 'false_positive'].map((s) => (
            <Button
              key={s}
              size="sm"
              variant="outline"
              className="text-xs capitalize"
              disabled={finding.status === s || updateFinding.isPending}
              onClick={() => handleStatusChange(s)}
            >
              {s.replace('_', ' ')}
            </Button>
          ))}
          {finding.status !== 'open' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              disabled={updateFinding.isPending}
              onClick={() => handleStatusChange('open')}
            >
              Reopen
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
}

export default function Findings() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Finding | null>(null);

  const { data: findings, isLoading } = useGetFindings({
    query: { queryKey: getGetFindingsQueryKey() },
  });

  const filtered = (findings ?? [])
    .filter((f) => {
      if (severityFilter !== 'all' && f.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          f.title.toLowerCase().includes(q) ||
          f.assetName?.toLowerCase().includes(q) ||
          f.cve?.toLowerCase().includes(q) ||
          f.mitreId?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const ai = SEVERITY_ORDER.indexOf(a.severity);
      const bi = SEVERITY_ORDER.indexOf(b.severity);
      return ai - bi;
    });

  const counts = {
    critical: findings?.filter((f) => f.severity === 'critical').length ?? 0,
    high: findings?.filter((f) => f.severity === 'high').length ?? 0,
    open: findings?.filter((f) => f.status === 'open').length ?? 0,
    total: findings?.length ?? 0,
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted rounded" />)}
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-1">Findings</h1>
        <p className="text-muted-foreground">Security vulnerabilities discovered across all assets</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.total, color: 'text-foreground', bg: 'bg-card' },
          { label: 'Open', value: counts.open, color: 'text-destructive', bg: 'bg-destructive/5 border-destructive/20' },
          { label: 'Critical', value: counts.critical, color: 'text-destructive', bg: 'bg-destructive/5 border-destructive/20' },
          { label: 'High', value: counts.high, color: 'text-orange-400', bg: 'bg-orange-500/5 border-orange-500/20' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl border p-5 ${bg}`}>
            <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-mono">{label}</p>
            <p className={`text-3xl font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, CVE, MITRE ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-findings"
          />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-44" data-testid="select-severity-filter">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="accepted_risk">Accepted Risk</SelectItem>
            <SelectItem value="false_positive">False Positive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-12 pl-4">Sev</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>MITRE</TableHead>
              <TableHead>CVE</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right pr-4">Found</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No findings match your filters</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((finding) => (
                <TableRow
                  key={finding.id}
                  className="cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => setSelected(finding)}
                  data-testid={`finding-row-${finding.id}`}
                >
                  <TableCell className="pl-4">
                    <SeverityBadge severity={finding.severity as any} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{finding.title}</span>
                      {finding.cvss !== null && finding.cvss !== undefined && (
                        <span className="text-xs font-mono text-muted-foreground">
                          {finding.cvss.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{finding.assetName}</span>
                  </TableCell>
                  <TableCell>
                    {finding.mitreId ? (
                      <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                        {finding.mitreId}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {finding.cve ? (
                      <span className="text-xs font-mono text-muted-foreground">{finding.cve}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={finding.status as any} />
                  </TableCell>
                  <TableCell className="text-right pr-4 text-xs text-muted-foreground font-mono">
                    {finding.createdAt
                      ? formatDistanceToNow(new Date(finding.createdAt), { addSuffix: true })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground font-mono">
        {filtered.length} of {counts.total} findings
      </p>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected && <FindingDetail finding={selected} onClose={() => setSelected(null)} />}
      </Dialog>
    </div>
  );
}
