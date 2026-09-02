import { ExternalLink, Shield } from 'lucide-react';
import { getGetMitreCoverageQueryKey, useGetMitreCoverage } from '@workspace/api-client-react';
import { TacticCard } from '@/features/mitre/components/tactic-card';
import { PageError, PageLoading } from '@/shared/ui/page-state';

export default function Mitre() {
  const tacticsQuery = useGetMitreCoverage({ query: { queryKey: getGetMitreCoverageQueryKey() } });
  if (tacticsQuery.isLoading) return <PageLoading label="Loading MITRE ATT&CK coverage" />;
  if (tacticsQuery.isError) return <div className="p-4 sm:p-8"><PageError title="MITRE coverage could not be loaded" description="The security API did not return mapped findings." onRetry={() => tacticsQuery.refetch()} /></div>;
  const tactics = tacticsQuery.data ?? [];
  const totalFindings = tactics.reduce((total, tactic) => total + tactic.techniques.reduce((sum, technique) => sum + (technique.count ?? 0), 0), 0);
  const coveredTactics = tactics.filter((tactic) => tactic.techniques.some((technique) => (technique.count ?? 0) > 0)).length;
  const coverage = tactics.length ? Math.round((coveredTactics / tactics.length) * 100) : 0;

  return (
    <main className="space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-3xl font-bold">MITRE ATT&amp;CK</h1><p className="mt-2 text-muted-foreground">Tactics and techniques observed in real Pen Test findings.</p></div><a href="https://attack.mitre.org/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">ATT&amp;CK framework<ExternalLink className="h-4 w-4" aria-hidden="true" /></a></header>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="MITRE coverage summary"><article className="rounded-xl border bg-card p-5"><h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Tactics covered</h2><p className="mt-2 text-3xl font-bold font-mono text-primary">{coveredTactics}<span className="text-lg text-muted-foreground">/{tactics.length}</span></p></article><article className="rounded-xl border bg-card p-5"><h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Mapped findings</h2><p className="mt-2 text-3xl font-bold font-mono">{totalFindings}</p></article><article className="rounded-xl border bg-card p-5"><h2 className="text-xs font-mono uppercase tracking-wide text-muted-foreground">Coverage</h2><p className="mt-2 text-3xl font-bold font-mono text-yellow-500">{coverage}%</p></article></section>
      <aside className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><p className="text-sm text-muted-foreground">Coverage shows tactics observed in findings. Higher coverage means testing has surfaced more of the attack surface; it does not indicate greater vulnerability.</p></aside>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="MITRE tactics">{tactics.map((tactic) => <TacticCard key={tactic.id} tactic={tactic} />)}</section>
    </main>
  );
}
