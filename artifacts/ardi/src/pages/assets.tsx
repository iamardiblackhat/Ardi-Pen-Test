import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetAssetsQueryKey, useDeleteAsset, useGetAssets, type Asset } from '@workspace/api-client-react';
import { Input } from '@workspace/ardi-ds/components/ui/input';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { AssetCard } from '@/features/assets/components/asset-card';
import { CreateAssetDialog } from '@/features/assets/components/create-asset-dialog';
import { backendError } from '@/lib/api-error';
import { PageEmpty, PageError, PageLoading } from '@/shared/ui/page-state';

export default function Assets() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const assetsQuery = useGetAssets({ query: { queryKey: getGetAssetsQueryKey() } });
  const deleteAsset = useDeleteAsset();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const filteredAssets = useMemo(() => (assetsQuery.data ?? []).filter((asset) => `${asset.name} ${asset.target}`.toLowerCase().includes(search.toLowerCase())), [assetsQuery.data, search]);

  async function removeAsset(asset: Asset) {
    if (!window.confirm(`Delete ${asset.name}? This removes it from authorised scope.`)) return;
    try {
      await deleteAsset.mutateAsync({ id: asset.id });
      await queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
      toast({ title: 'Target removed', description: `${asset.name} is no longer in scope.` });
    } catch (error) {
      toast({ title: 'Target could not be removed', description: backendError(error, 'Try again.'), variant: 'destructive' });
    }
  }

  if (assetsQuery.isLoading) return <PageLoading label="Loading authorised targets" />;
  if (assetsQuery.isError) return <div className="p-4 sm:p-8"><PageError title="Authorised targets could not be loaded" description="The security API did not return the current scope." onRetry={() => assetsQuery.refetch()} /></div>;

  return (
    <main className="space-y-6 p-4 sm:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-bold">Authorised scope</h1><p className="mt-2 text-muted-foreground">Manage the systems you have permission to test.</p></div><CreateAssetDialog open={dialogOpen} onOpenChange={setDialogOpen} /></header>
      <label className="relative block"><span className="sr-only">Search authorised targets</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input placeholder="Search targets…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-10" /></label>
      {filteredAssets.length ? <section className="space-y-4" aria-label="Authorised targets">{filteredAssets.map((asset) => <AssetCard key={asset.id} asset={asset} onDelete={removeAsset} />)}</section> : <PageEmpty title={search ? 'No targets match this search' : 'No authorised targets'} description={search ? 'Try a different name, URL, or IP address.' : 'Add a target before starting a Pen Test.'} actionLabel={search ? undefined : 'Add authorised target'} onAction={search ? undefined : () => setDialogOpen(true)} />}
    </main>
  );
}
