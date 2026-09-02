import { useState } from 'react';
import { Crosshair, Loader2, ShieldCheck } from 'lucide-react';
import { useLocation } from 'wouter';
import { useCreateScan, useGetAssets, useStartScan, type ScanInputType } from '@workspace/api-client-react';
import { backendError } from '@/lib/api-error';
import { routes } from '@/shared/config/routes';

export function PenTestCommand({ onComplete }: { onComplete: () => void }) {
  const [, navigate] = useLocation();
  const [assetId, setAssetId] = useState('');
  const [name, setName] = useState('ARDI authorised Pen Test');
  const [scanType, setScanType] = useState<ScanInputType>('full_stack');
  const [authorised, setAuthorised] = useState(false);
  const [error, setError] = useState('');
  const assetsQuery = useGetAssets();
  const createScan = useCreateScan();
  const startScan = useStartScan();
  const pending = createScan.isPending || startScan.isPending;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assetId || !authorised || pending) return;
    setError('');
    try {
      const created = await createScan.mutateAsync({ data: { name: name.trim(), type: scanType, assetId: Number(assetId) } });
      const started = await startScan.mutateAsync({ id: created.id });
      onComplete();
      navigate(routes.scan(started.id));
    } catch (requestError) {
      setError(backendError(requestError, 'The Pen Test could not be started.'));
    }
  }

  if (assetsQuery.isLoading) return <p className="p-5 text-sm text-indigo-100/70">Loading authorised targets…</p>;
  if (assetsQuery.isError) return <p className="p-5 text-sm text-rose-200">Authorised targets could not be loaded. Try again from Scope.</p>;
  if (!assetsQuery.data?.length) return <div className="space-y-4 p-5"><ShieldCheck className="h-8 w-8 text-cyan-200" /><div><h3 className="font-semibold text-white">Authorise a target first</h3><p className="mt-2 text-sm leading-6 text-indigo-100/70">ARDI will not create a Pen Test until a target exists in your approved scope.</p></div><button type="button" onClick={() => { onComplete(); navigate(routes.assets); }} className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Open authorised scope</button></div>;

  return (
    <form onSubmit={submit} className="space-y-4 p-5">
      <div><p className="font-mono text-[11px] tracking-[.16em] text-cyan-200">EXECUTE / PEN TEST</p><h3 className="mt-2 text-xl font-semibold text-white">Start against an approved target.</h3></div>
      <div><label htmlFor="ardi-scan-name" className="text-sm font-medium text-indigo-50">Assessment name</label><input id="ardi-scan-name" required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-violet-200/20 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-200" /></div>
      <div><label htmlFor="ardi-scan-asset" className="text-sm font-medium text-indigo-50">Authorised target</label><select id="ardi-scan-asset" required value={assetId} onChange={(event) => setAssetId(event.target.value)} className="mt-2 w-full rounded-xl border border-violet-200/20 bg-[#17113a] px-4 py-3 text-sm text-white outline-none focus:border-cyan-200"><option value="">Select target</option>{assetsQuery.data.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} — {asset.target}</option>)}</select></div>
      <div><label htmlFor="ardi-scan-type" className="text-sm font-medium text-indigo-50">Assessment type</label><select id="ardi-scan-type" value={scanType} onChange={(event) => setScanType(event.target.value as ScanInputType)} className="mt-2 w-full rounded-xl border border-violet-200/20 bg-[#17113a] px-4 py-3 text-sm text-white outline-none focus:border-cyan-200"><option value="full_stack">Full stack</option><option value="web_app">Web application</option><option value="network">Network</option><option value="api">API</option><option value="cloud">Cloud</option></select></div>
      <label className="flex items-start gap-3 rounded-xl border border-cyan-200/20 bg-cyan-200/5 p-4 text-sm leading-5 text-indigo-50"><input type="checkbox" checked={authorised} onChange={(event) => setAuthorised(event.target.checked)} className="mt-1 h-4 w-4 accent-cyan-300" /><span>I confirm I own this target or have explicit permission to test it.</span></label>
      {error ? <p role="alert" className="rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p> : null}
      <button type="submit" disabled={!assetId || !name.trim() || !authorised || pending} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-4 text-sm font-semibold text-white transition hover:from-blue-400 hover:to-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 disabled:cursor-not-allowed disabled:opacity-45">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}{createScan.isPending ? 'Creating assessment…' : startScan.isPending ? 'Starting scanner…' : 'Confirm and start Pen Test'}</button>
    </form>
  );
}

