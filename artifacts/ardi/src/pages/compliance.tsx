import { useState } from 'react';
import { Shield, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  useGetComplianceFrameworks,
  useGetComplianceFramework,
  getGetComplianceFrameworksQueryKey,
  getGetComplianceFrameworkQueryKey,
} from '@workspace/api-client-react';
import { formatDistanceToNow } from 'date-fns';

function statusIcon(status: string) {
  if (status === 'passed') return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
  if (status === 'failed') return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
  return <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />;
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-destructive';
}

function progressColor(score: number) {
  if (score >= 80) return '[&>div]:bg-green-500';
  if (score >= 60) return '[&>div]:bg-yellow-500';
  return '[&>div]:bg-destructive';
}

const frameworkDescriptions: Record<string, string> = {
  soc2: 'Service Organization Control 2 — trust service criteria for security, availability, and confidentiality.',
  pcidss: 'Payment Card Industry Data Security Standard — requirements for processing cardholder data.',
  iso27001: 'International standard for information security management systems.',
  hipaa: 'Health Insurance Portability and Accountability Act — security of electronic protected health information.',
};

function FrameworkDetail({ id }: { id: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: framework, isLoading } = useGetComplianceFramework(id, {
    query: { queryKey: getGetComplianceFrameworkQueryKey(id) },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3 mt-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-muted rounded" />)}
      </div>
    );
  }

  if (!framework?.controls) return null;

  const controls = framework.controls as any[];
  const grouped: Record<string, typeof controls> = {};
  for (const control of controls) {
    const cat = control.category ?? 'General';
    (grouped[cat] ??= []).push(control);
  }

  return (
    <div className="space-y-3 mt-4">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-lg border border-border overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/20 transition-colors"
            onClick={() => setExpanded(expanded === category ? null : category)}
          >
            <span className="font-semibold text-sm">{category}</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                {items.filter((c: any) => c.status === 'passed').length}
                <XCircle className="w-3.5 h-3.5 text-destructive ml-1" />
                {items.filter((c: any) => c.status === 'failed').length}
              </div>
              {expanded === category ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>
          {expanded === category && (
            <div className="border-t border-border divide-y divide-border">
              {items.map((control: any) => (
                <div key={control.id} className="p-4 bg-background/50">
                  <div className="flex items-start gap-3">
                    {statusIcon(control.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                          {control.id}
                        </span>
                        <span className="text-sm font-medium">{control.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{control.description}</p>
                      {control.findings && control.findings.length > 0 && (
                        <p className="text-xs text-destructive mt-1.5 font-mono">
                          {control.findings.length} associated finding{control.findings.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Compliance() {
  const [activeFramework, setActiveFramework] = useState<string | null>(null);

  const { data: frameworks, isLoading } = useGetComplianceFrameworks({
    query: { queryKey: getGetComplianceFrameworksQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-48 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-1">Compliance</h1>
        <p className="text-muted-foreground">
          Regulatory framework posture based on current findings
        </p>
      </div>

      {/* Framework overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {(frameworks ?? []).map((fw) => {
          const isActive = activeFramework === fw.id;
          return (
            <button
              key={fw.id}
              onClick={() => setActiveFramework(isActive ? null : fw.id)}
              className={`rounded-xl border p-6 text-left transition-all hover:border-primary/50 ${
                isActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card'
              }`}
              data-testid={`compliance-card-${fw.id}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg border ${
                  isActive ? 'bg-primary/20 border-primary/40' : 'bg-muted border-border'
                }`}>
                  <Shield className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className={`text-2xl font-bold font-mono ${scoreColor(fw.score)}`}>
                  {fw.score}%
                </div>
              </div>

              <h3 className="font-bold text-sm leading-tight mb-1">{fw.name}</h3>
              <p className="text-xs text-muted-foreground mb-4">v{fw.version}</p>

              <Progress
                value={fw.score}
                className={`h-1.5 mb-3 ${progressColor(fw.score)}`}
              />

              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-xs font-mono text-green-500">{fw.controlsPassed}</p>
                  <p className="text-[10px] text-muted-foreground">Pass</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-destructive">{fw.controlsFailed}</p>
                  <p className="text-[10px] text-muted-foreground">Fail</p>
                </div>
                <div>
                  <p className="text-xs font-mono text-muted-foreground">{fw.controlsTotal}</p>
                  <p className="text-[10px] text-muted-foreground">Total</p>
                </div>
              </div>

              {fw.lastAssessedAt && (
                <p className="text-[10px] text-muted-foreground mt-3 font-mono">
                  Last assessed {formatDistanceToNow(new Date(fw.lastAssessedAt), { addSuffix: true })}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded framework detail */}
      {activeFramework && (
        <div className="rounded-xl border border-border bg-card p-6">
          {(() => {
            const fw = frameworks?.find((f) => f.id === activeFramework);
            if (!fw) return null;
            return (
              <>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-xl font-bold">{fw.name}</h2>
                    <p className="text-sm text-muted-foreground">{frameworkDescriptions[fw.id] ?? ''}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setActiveFramework(null)}>
                    Collapse
                  </Button>
                </div>
                <FrameworkDetail id={activeFramework} />
              </>
            );
          })()}
        </div>
      )}

      {/* Overall posture summary */}
      {frameworks && frameworks.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold mb-4">Overall Posture</h2>
          <div className="space-y-4">
            {frameworks.map((fw) => (
              <div key={fw.id} className="flex items-center gap-4">
                <span className="text-sm font-mono w-20 text-muted-foreground uppercase tracking-wide">
                  {fw.id}
                </span>
                <Progress
                  value={fw.score}
                  className={`flex-1 h-2 ${progressColor(fw.score)}`}
                />
                <span className={`text-sm font-mono font-bold w-12 text-right ${scoreColor(fw.score)}`}>
                  {fw.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
