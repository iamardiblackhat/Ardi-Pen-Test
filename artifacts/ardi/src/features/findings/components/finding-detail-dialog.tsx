import { useState } from 'react';
import { ExternalLink, RefreshCw, Shield } from 'lucide-react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetFindingsQueryKey, useUpdateFinding, type Finding, type FindingUpdateStatus } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle } from '@workspace/ardi-ds/components/ui/dialog';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { BlueTeamDefenses } from '@/components/blue-team-defenses';
import { SeverityBadge } from '@/components/severity-badge';
import { StatusBadge } from '@/components/status-badge';
import { ThreatIntel } from '@/components/threat-intel';
import { backendError } from '@/lib/api-error';
import { auth } from '@/lib/auth';
import { routes } from '@/shared/config/routes';

const resolutionStatuses: FindingUpdateStatus[] = ['resolved', 'accepted_risk', 'false_positive'];

interface VerifyResult {
  verified: boolean;
  status: string;
  checkedAt: string;
  message: string;
  evidence?: string | null;
}

export function FindingDetailDialog({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateFinding = useUpdateFinding();
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  async function changeStatus(status: FindingUpdateStatus) {
    try {
      await updateFinding.mutateAsync({ id: finding.id, data: { status } });
      await queryClient.invalidateQueries({ queryKey: getGetFindingsQueryKey() });
      toast({ title: 'Finding updated', description: `Status changed to ${status.replace('_', ' ')}.` });
    } catch (error) {
      toast({ title: 'Finding could not be updated', description: backendError(error, 'Try again.'), variant: 'destructive' });
    }
  }

  async function verifyFixNow() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const response = await fetch(`/api/findings/${finding.id}/verify`, {
        method: 'POST',
        headers: auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {},
      });
      const payload = (await response.json()) as VerifyResult & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Live verification scan failed.');
      }
      setVerifyResult(payload);
      await queryClient.invalidateQueries({ queryKey: getGetFindingsQueryKey() });
      toast({
        title: payload.verified ? 'Fix verified' : 'Issue still present',
        description: payload.message,
        variant: payload.verified ? 'default' : 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Verification could not complete',
        description: backendError(error, 'Try again.'),
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle className="pr-8 leading-tight">{finding.title}</DialogTitle></DialogHeader>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2"><SeverityBadge severity={finding.severity} /><StatusBadge status={finding.status} />{finding.cve ? <span className="rounded-md border px-2.5 py-0.5 text-xs font-mono font-semibold uppercase tracking-wide text-muted-foreground">{finding.cve}</span> : null}{finding.cvss != null ? <span className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs font-mono font-semibold text-orange-400">CVSS {finding.cvss.toFixed(1)}</span> : null}</div>
        {finding.mitreId ? <section className="rounded-lg border border-primary/20 bg-primary/5 p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary"><Shield className="h-4 w-4" aria-hidden="true" />How an attacker could use this (MITRE ATT&amp;CK)</h3><dl className="grid gap-3 text-sm sm:grid-cols-3"><div><dt className="text-xs text-muted-foreground">Method ID</dt><dd className="font-mono font-semibold">{finding.mitreId}</dd></div>{finding.mitreTactic ? <div><dt className="text-xs text-muted-foreground">Goal</dt><dd className="font-semibold capitalize">{finding.mitreTactic.replace('-', ' ')}</dd></div> : null}{finding.mitreTechnique ? <div><dt className="text-xs text-muted-foreground">Method</dt><dd className="font-semibold">{finding.mitreTechnique}</dd></div> : null}</dl></section> : null}
        <ThreatIntel findingId={finding.id} />
        <BlueTeamDefenses findingId={finding.id} />
        <section><h3 className="mb-1 text-xs text-muted-foreground">Affected website or system</h3><Link href={routes.asset(finding.assetId)} className="inline-flex items-center gap-1 font-medium text-primary hover:underline" onClick={onClose}>{finding.assetName}<ExternalLink className="h-3 w-3" aria-hidden="true" /></Link></section>
        <section><h3 className="mb-2 text-xs text-muted-foreground">What this means</h3><p className="text-sm leading-relaxed">{finding.description}</p></section>
        <section><h3 className="mb-2 text-xs text-muted-foreground">How to fix it</h3><p className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 text-sm leading-relaxed">{finding.remediation}</p></section>
        {finding.evidence ? <section><h3 className="mb-2 text-xs text-muted-foreground">What the check saw (technical proof)</h3><pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-4 text-xs font-mono">{finding.evidence}</pre></section> : null}
        {verifyResult ? (
          <div
            role="status"
            className={`rounded-lg border p-3 text-sm ${
              verifyResult.verified
                ? 'border-green-500/30 bg-green-500/10 text-green-300'
                : 'border-orange-500/30 bg-orange-500/10 text-orange-300'
            }`}
          >
            <p className="font-medium">{verifyResult.message}</p>
            {verifyResult.evidence ? (
              <p className="mt-1 font-mono text-xs opacity-90">{verifyResult.evidence}</p>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button size="sm" variant="default" disabled={verifying || updateFinding.isPending} onClick={verifyFixNow}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${verifying ? 'animate-spin' : ''}`} aria-hidden="true" />
            {verifying ? 'Re-checking…' : 'Re-check this now'}
          </Button>
          <span className="mx-1 text-sm text-muted-foreground">Update status:</span>
          {resolutionStatuses.map((status) => <Button key={status} size="sm" variant="outline" disabled={finding.status === status || updateFinding.isPending} onClick={() => changeStatus(status)} className="capitalize">{status.replace('_', ' ')}</Button>)}
          {finding.status !== 'open' ? <Button size="sm" variant="outline" disabled={updateFinding.isPending} onClick={() => changeStatus('open')}>Reopen</Button> : null}
        </div>
      </div>
    </DialogContent>
  );
}
