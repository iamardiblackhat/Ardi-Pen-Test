import { useState } from 'react';
import { Link } from 'wouter';
import { Plus, Search, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/status-badge';
import {
  useGetScans,
  useGetAssets,
  useCreateScan,
  getGetScansQueryKey,
  getGetAssetsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

export default function Scans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: scans, isLoading } = useGetScans({ query: { queryKey: getGetScansQueryKey() } });
  const { data: assets } = useGetAssets({ query: { queryKey: getGetAssetsQueryKey() } });
  const createScan = useCreateScan();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('web_app');
  const [assetId, setAssetId] = useState('');

  const handleCreate = () => {
    createScan.mutate(
      { data: { name, type: type as any, assetId: Number(assetId) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() });
          toast({ title: 'Scan created', description: `${name} has been started` });
          setOpen(false);
          setName('');
          setAssetId('');
        },
        onError: () => {
          toast({ title: 'Failed to create scan', variant: 'destructive' });
        },
      }
    );
  };

  const filteredScans = scans?.filter((scan) =>
    scan.name.toLowerCase().includes(search.toLowerCase()) ||
    scan.assetName.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Scans</h1>
          <p className="text-muted-foreground">Orchestrate and monitor security scans</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary" data-testid="button-create-scan">
              <Plus className="w-4 h-4 mr-2" />
              Create Scan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Scan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="scan-name">Scan Name</Label>
                <Input
                  id="scan-name"
                  placeholder="Production API Security Scan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-scan-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scan-type">Scan Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="scan-type" data-testid="select-scan-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web_app">Web Application</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="cloud">Cloud</SelectItem>
                    <SelectItem value="full_stack">Full Stack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scan-asset">Target Asset</Label>
                <Select value={assetId} onValueChange={setAssetId}>
                  <SelectTrigger id="scan-asset" data-testid="select-scan-asset">
                    <SelectValue placeholder="Select an asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets?.map((asset) => (
                      <SelectItem key={asset.id} value={String(asset.id)}>
                        {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreate}
                disabled={!name || !assetId || createScan.isPending}
                className="w-full glow-primary"
                data-testid="button-submit-scan"
              >
                {createScan.isPending ? 'Creating...' : 'Create & Start Scan'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search scans..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-search-scans"
        />
      </div>

      {/* Scans List */}
      {filteredScans && filteredScans.length > 0 ? (
        <div className="space-y-4">
          {filteredScans.map((scan) => (
            <Link key={scan.id} href={`/scans/${scan.id}`}>
              <div className="bg-card border border-card-border rounded-xl p-6 hover:border-primary/50 transition-all cursor-pointer shadow-md hover:shadow-lg" data-testid={`scan-card-${scan.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold">{scan.name}</h3>
                      <StatusBadge status={scan.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Asset: <span className="font-mono">{scan.assetName}</span></span>
                      <span>Type: <span className="font-mono">{scan.type.replace('_', ' ')}</span></span>
                    </div>
                  </div>
                  <Play className="w-5 h-5 text-muted-foreground" />
                </div>

                {scan.status === 'running' && scan.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                      <span>Progress</span>
                      <span className="font-mono">{scan.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all animate-pulse"
                        style={{ width: `${scan.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Started</p>
                    <p className="text-sm font-mono">
                      {scan.startedAt
                        ? formatDistanceToNow(new Date(scan.startedAt), { addSuffix: true })
                        : 'Pending'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Findings</p>
                    <p className="text-sm font-mono font-bold">{scan.findingsCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Critical</p>
                    <p className="text-sm font-mono font-bold text-destructive">{scan.criticalCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">High</p>
                    <p className="text-sm font-mono font-bold text-orange-500">{scan.highCount || 0}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-card-border rounded-xl">
          <Play className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No scans found</h3>
          <p className="text-muted-foreground mb-6">
            {search ? 'Try a different search term' : 'Create your first scan to start testing'}
          </p>
          {!search && (
            <Button onClick={() => setOpen(true)} className="glow-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Scan
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
