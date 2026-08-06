import { useState } from 'react';
import { useLocation } from 'wouter';
import { Shield, CheckCircle2, Server, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateAsset, useCreateScan, getGetAssetsQueryKey } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('web_app');
  const [assetTarget, setAssetTarget] = useState('');
  const [createdAssetId, setCreatedAssetId] = useState<number | null>(null);
  
  const createAsset = useCreateAsset();
  const createScan = useCreateScan();

  const handleAddAsset = () => {
    createAsset.mutate(
      { data: { name: assetName, type: assetType as any, target: assetTarget } },
      {
        onSuccess: (asset) => {
          setCreatedAssetId(asset.id);
          queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
          toast({ title: 'Asset added', description: `${asset.name} has been added to your inventory` });
          setStep(3);
        },
        onError: () => {
          toast({ title: 'Failed to add asset', variant: 'destructive' });
        },
      }
    );
  };

  const handleStartScan = () => {
    if (!createdAssetId) return;
    createScan.mutate(
      { data: { name: 'Initial Scan', type: 'web_app', assetId: createdAssetId } },
      {
        onSuccess: () => {
          toast({ title: 'Scan started', description: 'Your first scan is now running' });
          setStep(4);
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-pattern">
      <div className="w-full max-w-2xl p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-lg glow-primary">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to Ardi</h1>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-12">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  s <= step ? 'bg-primary text-primary-foreground glow-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <CheckCircle2 className="w-5 h-5" /> : s}
              </div>
              {s < 4 && (
                <div className={`w-24 h-1 mx-2 ${s < step ? 'bg-primary' : 'bg-muted'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="bg-card border border-card-border rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">Let's get started</h2>
            <p className="text-muted-foreground mb-6">
              We'll help you set up your first asset and launch your initial security scan. This will only take a few minutes.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Add your first asset to scan</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Configure your initial security scan</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Start discovering vulnerabilities</span>
              </li>
            </ul>
            <Button onClick={() => setStep(2)} className="glow-primary" data-testid="button-start-onboarding">
              Get Started
            </Button>
          </div>
        )}

        {/* Step 2: Add Asset */}
        {step === 2 && (
          <div className="bg-card border border-card-border rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Server className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Add your first asset</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Tell us about the first asset you'd like to scan. This could be a web application, API, or network.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asset-name">Asset Name</Label>
                <Input
                  id="asset-name"
                  placeholder="Production Web App"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  data-testid="input-asset-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-type">Asset Type</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger id="asset-type" data-testid="select-asset-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web_app">Web Application</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="cloud_aws">AWS Cloud</SelectItem>
                    <SelectItem value="cloud_azure">Azure Cloud</SelectItem>
                    <SelectItem value="cloud_gcp">GCP Cloud</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset-target">Target URL or IP</Label>
                <Input
                  id="asset-target"
                  placeholder="https://app.example.com"
                  value={assetTarget}
                  onChange={(e) => setAssetTarget(e.target.value)}
                  data-testid="input-asset-target"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back">
                Back
              </Button>
              <Button
                onClick={handleAddAsset}
                disabled={!assetName || !assetTarget || createAsset.isPending}
                className="glow-primary"
                data-testid="button-add-asset"
              >
                {createAsset.isPending ? 'Adding...' : 'Add Asset'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Configure Scan */}
        {step === 3 && (
          <div className="bg-card border border-card-border rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Launch your first scan</h2>
            </div>
            <p className="text-muted-foreground mb-6">
              Your asset has been added. Ready to start scanning for vulnerabilities?
            </p>

            <div className="bg-muted/30 border border-border rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Initial Scan Configuration</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  OWASP Top 10 vulnerability tests
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  SSL/TLS configuration analysis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Common misconfiguration detection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  Automated report generation
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} data-testid="button-back-scan">
                Back
              </Button>
              <Button
                onClick={handleStartScan}
                disabled={createScan.isPending}
                className="glow-primary"
                data-testid="button-start-scan"
              >
                {createScan.isPending ? 'Starting...' : 'Start Scan'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="bg-card border border-card-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 glow-primary">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">You're all set!</h2>
            <p className="text-muted-foreground mb-8">
              Your first scan is now running. Head to the dashboard to monitor progress and view findings as they're discovered.
            </p>
            <Button onClick={() => setLocation('/dashboard')} className="glow-primary" data-testid="button-go-to-dashboard">
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
