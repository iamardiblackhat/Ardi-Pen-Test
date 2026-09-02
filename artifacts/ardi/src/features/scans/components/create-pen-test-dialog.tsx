import { useState, type FormEvent } from 'react';
import { Crosshair, Loader2, Plus, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { getGetScansQueryKey, useCreateScan, useGetAssets, useStartScan, type ScanInputType } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@workspace/ardi-ds/components/ui/dialog';
import { Input } from '@workspace/ardi-ds/components/ui/input';
import { Label } from '@workspace/ardi-ds/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ardi-ds/components/ui/select';
import { backendError } from '@/lib/api-error';
import { routes } from '@/shared/config/routes';

export function CreatePenTestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const assetsQuery = useGetAssets();
  const createScan = useCreateScan();
  const startScan = useStartScan();
  const [name, setName] = useState('Authorised Pen Test');
  const [type, setType] = useState<ScanInputType>('full_stack');
  const [assetId, setAssetId] = useState('');
  const [authorised, setAuthorised] = useState(false);
  const [error, setError] = useState('');
  const pending = createScan.isPending || startScan.isPending;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetId || !authorised || pending) return;
    setError('');
    try {
      const created = await createScan.mutateAsync({ data: { name: name.trim(), type, assetId: Number(assetId) } });
      const started = await startScan.mutateAsync({ id: created.id });
      await queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() });
      onOpenChange(false);
      navigate(routes.scan(started.id));
    } catch (requestError) {
      setError(backendError(requestError, 'The Pen Test could not be started.'));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild><Button className="glow-primary"><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Start Pen Test</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Start an authorised Pen Test</DialogTitle></DialogHeader>
        {assetsQuery.isError ? <p role="alert" className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">Authorised targets could not be loaded.</p> : null}
        {!assetsQuery.isLoading && !assetsQuery.data?.length ? <div className="space-y-4 py-4 text-center"><ShieldCheck className="mx-auto h-9 w-9 text-primary" /><p className="text-sm text-muted-foreground">Add a target to authorised scope before starting a Pen Test.</p><Button type="button" onClick={() => navigate(routes.assets)}>Open authorised scope</Button></div> : null}
        {assetsQuery.data?.length ? <form className="mt-4 space-y-4" onSubmit={submit}>
          <div className="space-y-2"><Label htmlFor="pen-test-name">Assessment name</Label><Input id="pen-test-name" required value={name} onChange={(event) => setName(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="pen-test-target">Authorised target</Label><Select value={assetId} onValueChange={setAssetId}><SelectTrigger id="pen-test-target"><SelectValue placeholder="Select a target" /></SelectTrigger><SelectContent>{assetsQuery.data.map((asset) => <SelectItem key={asset.id} value={String(asset.id)}>{asset.name} — {asset.target}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="pen-test-type">Assessment type</Label><Select value={type} onValueChange={(value) => setType(value as ScanInputType)}><SelectTrigger id="pen-test-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full_stack">Full stack</SelectItem><SelectItem value="web_app">Web application</SelectItem><SelectItem value="api">API</SelectItem><SelectItem value="network">Network</SelectItem><SelectItem value="cloud">Cloud</SelectItem></SelectContent></Select></div>
          <label className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm leading-6"><input type="checkbox" checked={authorised} onChange={(event) => setAuthorised(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>I confirm that I own this target or have explicit permission to test it.</span></label>
          {error ? <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={!name.trim() || !assetId || !authorised || pending} className="min-h-12 w-full glow-primary">{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="mr-2 h-4 w-4" aria-hidden="true" />}{createScan.isPending ? 'Creating assessment…' : startScan.isPending ? 'Starting scanner…' : 'Confirm and start Pen Test'}</Button>
        </form> : null}
      </DialogContent>
    </Dialog>
  );
}
