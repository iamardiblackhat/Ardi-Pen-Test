import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, Play, Server, Shield } from 'lucide-react';
import { useLocation } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { getGetAssetsQueryKey, getGetScansQueryKey, useCreateAsset, useCreateScan, useStartScan, type AssetInputType } from '@workspace/api-client-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { Input } from '@workspace/ardi-ds/components/ui/input';
import { Label } from '@workspace/ardi-ds/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@workspace/ardi-ds/components/ui/select';
import { backendError } from '@/lib/api-error';
import { routes } from '@/shared/config/routes';

export default function Onboarding() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const createAsset = useCreateAsset();
  const createScan = useCreateScan();
  const startScan = useStartScan();
  const [step, setStep] = useState(1);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState<AssetInputType>('web_app');
  const [assetTarget, setAssetTarget] = useState('');
  const [assetId, setAssetId] = useState<number | null>(null);
  const [authorised, setAuthorised] = useState(false);
  const [startedScanId, setStartedScanId] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function addTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    try {
      const asset = await createAsset.mutateAsync({ data: { name: assetName.trim(), type: assetType, target: assetTarget.trim() } });
      await queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
      setAssetId(asset.id); setStep(3);
    } catch (requestError) { setError(backendError(requestError, 'The target could not be added.')); }
  }

  async function startPenTest() {
    if (!assetId || !authorised) return;
    setError('');
    try {
      const created = await createScan.mutateAsync({ data: { name: 'Initial authorised Pen Test', type: 'web_app', assetId } });
      const started = await startScan.mutateAsync({ id: created.id });
      await queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() });
      setStartedScanId(started.id); setStep(4);
    } catch (requestError) { setError(backendError(requestError, 'The Pen Test could not be started.')); }
  }

  const pending = createAsset.isPending || createScan.isPending || startScan.isPending;
  return (
    <main className="grid min-h-screen place-items-center bg-background p-4 grid-pattern sm:p-8">
      <div className="w-full max-w-2xl">
        <header className="mb-8 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary glow-primary"><Shield className="h-7 w-7 text-primary-foreground" aria-hidden="true" /></span><div><p className="text-xs font-mono uppercase tracking-widest text-primary">ARDI SEC</p><h1 className="text-3xl font-bold">Set up authorised testing</h1></div></header>
        <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Setup progress">{['Welcome', 'Scope', 'Authorise', 'Running'].map((label, index) => { const number = index + 1; return <li key={label} className="text-center"><span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full font-bold ${number <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{number < step ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : number}</span><span className="mt-2 hidden text-xs text-muted-foreground sm:block">{label}</span></li>; })}</ol>
        {step === 1 ? <section className="rounded-xl border bg-card p-6 sm:p-8"><h2 className="text-2xl font-bold">Start with permission and scope</h2><p className="mt-4 leading-7 text-muted-foreground">Add a system you own or have explicit permission to test. ARDI will then create and start a real Pen Test through the connected security API.</p><Button className="mt-8 glow-primary" onClick={() => setStep(2)}>Set authorised scope</Button></section> : null}
        {step === 2 ? <form className="space-y-5 rounded-xl border bg-card p-6 sm:p-8" onSubmit={addTarget}><div><Server className="mb-3 h-8 w-8 text-primary" aria-hidden="true" /><h2 className="text-2xl font-bold">Add an authorised target</h2></div><div className="space-y-2"><Label htmlFor="onboarding-name">Target name</Label><Input id="onboarding-name" required value={assetName} onChange={(event) => setAssetName(event.target.value)} placeholder="Production web app" /></div><div className="space-y-2"><Label htmlFor="onboarding-type">Target type</Label><Select value={assetType} onValueChange={(value) => setAssetType(value as AssetInputType)}><SelectTrigger id="onboarding-type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="web_app">Web application</SelectItem><SelectItem value="api">API</SelectItem><SelectItem value="network">Network</SelectItem><SelectItem value="cloud_aws">AWS cloud</SelectItem><SelectItem value="cloud_azure">Azure cloud</SelectItem><SelectItem value="cloud_gcp">GCP cloud</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="onboarding-target">URL or IP address</Label><Input id="onboarding-target" required value={assetTarget} onChange={(event) => setAssetTarget(event.target.value)} placeholder="https://app.example.com" /></div>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<div className="flex gap-3"><Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button><Button type="submit" disabled={!assetName.trim() || !assetTarget.trim() || pending} className="glow-primary">{createAsset.isPending ? 'Adding target…' : 'Add target'}</Button></div></form> : null}
        {step === 3 ? <section className="rounded-xl border bg-card p-6 sm:p-8"><Play className="mb-3 h-8 w-8 text-primary" aria-hidden="true" /><h2 className="text-2xl font-bold">Confirm and start the Pen Test</h2><p className="mt-4 text-muted-foreground">The target is in scope. The scanner starts only after your explicit confirmation.</p><label className="mt-6 flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm leading-6"><input type="checkbox" checked={authorised} onChange={(event) => setAuthorised(event.target.checked)} className="mt-1 h-4 w-4 accent-primary" /><span>I own this target or have explicit permission to test it.</span></label>{error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}<div className="mt-6 flex gap-3"><Button variant="outline" onClick={() => setStep(2)}>Back</Button><Button onClick={startPenTest} disabled={!authorised || pending} className="glow-primary">{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : null}{startScan.isPending ? 'Starting scanner…' : 'Start Pen Test'}</Button></div></section> : null}
        {step === 4 ? <section className="rounded-xl border bg-card p-8 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-primary" aria-hidden="true" /><h2 className="mt-5 text-2xl font-bold">Pen Test running</h2><p className="mt-3 text-muted-foreground">The security API confirmed that the scanner started.</p><Button className="mt-7 glow-primary" onClick={() => navigate(startedScanId ? routes.scan(startedScanId) : routes.scans)}>Open Pen Test</Button></section> : null}
      </div>
    </main>
  );
}
