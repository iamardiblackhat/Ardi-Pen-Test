import { AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Finding } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@workspace/ardi-ds/components/ui/table';
import { SeverityBadge } from '@/components/severity-badge';
import { StatusBadge } from '@/components/status-badge';

export function FindingsTable({ findings, onSelect }: { findings: Finding[]; onSelect: (finding: Finding) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Table>
        <TableHeader><TableRow className="bg-muted/30 hover:bg-muted/30"><TableHead className="pl-4">Severity</TableHead><TableHead>Finding</TableHead><TableHead>Target</TableHead><TableHead>MITRE</TableHead><TableHead>CVE</TableHead><TableHead>Status</TableHead><TableHead className="pr-4 text-right">Found</TableHead></TableRow></TableHeader>
        <TableBody>
          {!findings.length ? <TableRow><TableCell colSpan={7} className="py-16 text-center text-muted-foreground"><AlertTriangle className="mx-auto mb-3 h-8 w-8 opacity-30" aria-hidden="true" /><p>No findings match your filters.</p></TableCell></TableRow> : findings.map((finding) => (
            <TableRow key={finding.id} data-testid={`finding-row-${finding.id}`}>
              <TableCell className="pl-4"><SeverityBadge severity={finding.severity} /></TableCell>
              <TableCell><Button type="button" variant="link" className="h-auto justify-start p-0 text-left font-medium" onClick={() => onSelect(finding)}>{finding.title}{finding.cvss != null ? <span className="ml-2 font-mono text-xs text-muted-foreground">{finding.cvss.toFixed(1)}</span> : null}</Button></TableCell>
              <TableCell className="text-sm text-muted-foreground">{finding.assetName}</TableCell>
              <TableCell>{finding.mitreId ? <span className="rounded border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-mono text-primary">{finding.mitreId}</span> : '—'}</TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground">{finding.cve || '—'}</TableCell>
              <TableCell><StatusBadge status={finding.status} /></TableCell>
              <TableCell className="pr-4 text-right text-xs font-mono text-muted-foreground">{finding.createdAt ? formatDistanceToNow(new Date(finding.createdAt), { addSuffix: true }) : '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
