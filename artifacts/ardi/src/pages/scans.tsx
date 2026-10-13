import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { getGetScansQueryKey, useGetScans } from '@workspace/api-client-react';
import { Input } from '@workspace/ardi-ds/components/ui/input';
import { CreatePenTestDialog } from '@/features/scans/components/create-pen-test-dialog';
import { ScanCard } from '@/features/scans/components/scan-card';
import { PageEmpty, PageError, PageLoading } from '@/shared/ui/page-state';

export default function Scans() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const scansQuery = useGetScans({ query: { queryKey: getGetScansQueryKey() } });
  const filteredScans = useMemo(() => (scansQuery.data ?? []).filter((scan) => `${scan.name} ${scan.assetName}`.toLowerCase().includes(search.toLowerCase())), [scansQuery.data, search]);

  if (scansQuery.isLoading) return <PageLoading label="Loading security checks" />;
  if (scansQuery.isError) return <div className="p-4 sm:p-8"><PageError title="Pen Tests could not be loaded" description="The security API did not return assessment runs." onRetry={() => scansQuery.refetch()} /></div>;

  return (
    <main className="space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-bold">Runs</h1><p className="mt-2 text-muted-foreground">Start a security check against a target you added, then follow it here.</p></div><CreatePenTestDialog open={dialogOpen} onOpenChange={setDialogOpen} /></header>
      <label className="relative block"><span className="sr-only">Search Pen Tests</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input placeholder="Search assessments…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" /></label>
      {filteredScans.length ? <section className="space-y-4" aria-label="Pen Test runs">{filteredScans.map((scan) => <ScanCard key={scan.id} scan={scan} />)}</section> : <PageEmpty title={search ? 'No checks match this search' : 'No checks yet'} description={search ? 'Try a different check or target name.' : 'Start a check against a target you are allowed to test.'} actionLabel={search ? undefined : 'Start a test'} onAction={search ? undefined : () => setDialogOpen(true)} />}
    </main>
  );
}
