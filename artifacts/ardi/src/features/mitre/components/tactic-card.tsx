import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { MitreTactic } from '@workspace/api-client-react';

const tacticColors: Record<string, string> = { reconnaissance: 'border-blue-500/40 bg-blue-500/5', 'resource-development': 'border-blue-400/40 bg-blue-400/5', 'initial-access': 'border-orange-500/40 bg-orange-500/5', execution: 'border-red-500/40 bg-red-500/5', persistence: 'border-yellow-500/40 bg-yellow-500/5', 'privilege-escalation': 'border-orange-400/40 bg-orange-400/5', 'defense-evasion': 'border-purple-500/40 bg-purple-500/5', 'credential-access': 'border-red-400/40 bg-red-400/5', discovery: 'border-cyan-500/40 bg-cyan-500/5', 'lateral-movement': 'border-indigo-500/40 bg-indigo-500/5', collection: 'border-teal-500/40 bg-teal-500/5', 'command-and-control': 'border-red-600/40 bg-red-600/5', exfiltration: 'border-orange-600/40 bg-orange-600/5', impact: 'border-destructive/40 bg-destructive/5' };
const severityColors: Record<string, string> = { critical: 'bg-destructive', high: 'bg-orange-500', medium: 'bg-yellow-500', low: 'bg-primary', info: 'bg-muted-foreground' };

export function TacticCard({ tactic }: { tactic: MitreTactic }) {
  const [expanded, setExpanded] = useState(false);
  const techniques = tactic.techniques ?? [];
  const findingCount = techniques.reduce((total, technique) => total + (technique.count ?? 0), 0);
  const contentId = `mitre-${tactic.id}-techniques`;
  return (
    <article className={`overflow-hidden rounded-xl border ${tacticColors[tactic.id] ?? 'border-border bg-card'}`}>
      <button type="button" aria-expanded={expanded} aria-controls={contentId} className="w-full p-4 text-left transition-colors hover:bg-white/5" onClick={() => setExpanded((value) => !value)}>
        <span className="flex items-center justify-between"><span className="min-w-0 flex-1"><span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{tactic.id}</span><span className="mt-1 block text-sm font-semibold capitalize">{tactic.name?.replace('-', ' ') ?? tactic.id}</span></span><span className="ml-3 flex items-center gap-2"><span className="text-right"><strong className="block text-lg font-mono">{findingCount}</strong><span className="text-xs text-muted-foreground">findings</span></span>{expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}</span></span>
      </button>
      {expanded ? <div id={contentId} className="divide-y divide-border/50 border-t border-border/50">{techniques.length ? techniques.map((technique) => <div key={technique.id} className="flex items-start gap-3 bg-background/40 px-4 py-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityColors[technique.severity ?? ''] ?? 'bg-muted-foreground'}`} /><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-xs font-mono text-primary">{technique.id}</span>{technique.count > 0 ? <span className="text-xs font-mono text-muted-foreground">{technique.count} finding{technique.count === 1 ? '' : 's'}</span> : null}</span><span className="mt-0.5 block text-xs font-medium">{technique.name}</span></span><a href={`https://attack.mitre.org/techniques/${technique.id.replace('.', '/')}/`} target="_blank" rel="noreferrer" aria-label={`Open MITRE technique ${technique.id}`} className="shrink-0 text-muted-foreground hover:text-primary"><ExternalLink className="h-4 w-4" aria-hidden="true" /></a></div>) : <p className="bg-background/40 px-4 py-3 text-xs text-muted-foreground">No techniques recorded.</p>}</div> : null}
    </article>
  );
}
