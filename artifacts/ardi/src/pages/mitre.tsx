import { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import {
  useGetMitreCoverage,
  getGetMitreCoverageQueryKey,
} from '@workspace/api-client-react';
import type { MitreTactic } from '@workspace/api-client-react';

const tacticColors: Record<string, string> = {
  reconnaissance: 'border-blue-500/40 bg-blue-500/5',
  'resource-development': 'border-blue-400/40 bg-blue-400/5',
  'initial-access': 'border-orange-500/40 bg-orange-500/5',
  execution: 'border-red-500/40 bg-red-500/5',
  persistence: 'border-yellow-500/40 bg-yellow-500/5',
  'privilege-escalation': 'border-orange-400/40 bg-orange-400/5',
  'defense-evasion': 'border-purple-500/40 bg-purple-500/5',
  'credential-access': 'border-red-400/40 bg-red-400/5',
  discovery: 'border-cyan-500/40 bg-cyan-500/5',
  'lateral-movement': 'border-indigo-500/40 bg-indigo-500/5',
  collection: 'border-teal-500/40 bg-teal-500/5',
  'command-and-control': 'border-red-600/40 bg-red-600/5',
  exfiltration: 'border-orange-600/40 bg-orange-600/5',
  impact: 'border-destructive/40 bg-destructive/5',
};

function severityDot(severity: string) {
  const cls: Record<string, string> = {
    critical: 'bg-destructive',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-primary',
    info: 'bg-muted-foreground',
  };
  return cls[severity] ?? 'bg-muted-foreground';
}

function TacticCard({ tactic }: { tactic: MitreTactic }) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = tacticColors[tactic.id] ?? 'border-border bg-card';

  const techniques = tactic.techniques ?? [];
  const findingCount = techniques.reduce((sum, t) => sum + (t.count ?? 0), 0);

  return (
    <div className={`rounded-xl border ${colorClass} overflow-hidden`}>
      <button
        className="w-full p-4 text-left hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`mitre-tactic-${tactic.id}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {tactic.id}
              </span>
            </div>
            <h3 className="font-semibold text-sm leading-tight capitalize">
              {tactic.name?.replace('-', ' ') ?? tactic.id}
            </h3>
          </div>
          <div className="flex items-center gap-2 ml-3">
            <div className="text-right">
              <p className="text-lg font-bold font-mono">{findingCount}</p>
              <p className="text-[10px] text-muted-foreground">findings</p>
            </div>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        </div>
      </button>

      {expanded && techniques.length > 0 && (
        <div className="border-t border-border/50 divide-y divide-border/50">
          {techniques.map((tech: any) => (
            <div
              key={tech.id}
              className="px-4 py-3 bg-background/40 flex items-start gap-3"
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${severityDot(tech.severity ?? '')}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-mono text-primary">{tech.id}</span>
                  {tech.count > 0 && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {tech.count} finding{tech.count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs font-medium leading-snug">{tech.name}</p>
              </div>
              <a
                href={`https://attack.mitre.org/techniques/${tech.id?.replace('.', '/')}/`}
                target="_blank"
                rel="noreferrer"
                className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      )}

      {expanded && techniques.length === 0 && (
        <div className="border-t border-border/50 px-4 py-3 bg-background/40">
          <p className="text-xs text-muted-foreground">No specific techniques recorded</p>
        </div>
      )}
    </div>
  );
}

export default function Mitre() {
  const { data: tactics, isLoading } = useGetMitreCoverage({
    query: { queryKey: getGetMitreCoverageQueryKey() },
  });

  const totalFindings = tactics?.reduce((sum, t) => sum + t.techniques.reduce((s, tech) => s + (tech.count ?? 0), 0), 0) ?? 0;
  const coveredTactics = tactics?.filter((t) => t.techniques.some((tech) => (tech.count ?? 0) > 0)).length ?? 0;

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-56" />
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1">MITRE ATT&CK</h1>
          <p className="text-muted-foreground">
            Tactics and techniques observed across all findings
          </p>
        </div>
        <a
          href="https://attack.mitre.org/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mt-1"
        >
          <ExternalLink className="w-4 h-4" />
          ATT&CK Framework
        </a>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-2">Tactics Covered</p>
          <p className="text-3xl font-bold font-mono text-primary">
            {coveredTactics}
            <span className="text-lg text-muted-foreground">/{tactics?.length ?? 0}</span>
          </p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-2">Total Mapped</p>
          <p className="text-3xl font-bold font-mono">{totalFindings}</p>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-5">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide mb-2">Coverage</p>
          <p className="text-3xl font-bold font-mono text-yellow-500">
            {tactics && tactics.length > 0
              ? Math.round((coveredTactics / tactics.length) * 100)
              : 0}%
          </p>
        </div>
      </div>

      {/* Coverage note */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-start gap-3">
        <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          Coverage shows which ATT&CK tactics have been observed in your environment. Higher coverage
          means your testing is surfacing more of the attack surface — not that you are more vulnerable.
          Expand each tactic to see individual techniques.
        </p>
      </div>

      {/* Tactic grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {(tactics ?? []).map((tactic) => (
          <TacticCard key={tactic.id} tactic={tactic} />
        ))}
      </div>
    </div>
  );
}
