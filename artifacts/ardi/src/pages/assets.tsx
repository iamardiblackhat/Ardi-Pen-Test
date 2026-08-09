import { useState } from 'react';
import { Link } from 'wouter';
import { Plus, Search, Server, Globe, Cloud, Smartphone, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/status-badge';
import {
  useGetAssets,
  useCreateAsset,
  useDeleteAsset,
  getGetAssetsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

const assetTypeIcons: Record<string, typeof Server> = {
  web_app: Globe,
  network: Server,
  cloud_aws: Cloud,
  cloud_azure: Cloud,
  cloud_gcp: Cloud,
  api: Server,
  mobile: Smartphone,
};

const riskLevelColors: Record<string, string> = {
  critical: 'text-destructive',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-500',
  none: 'text-muted-foreground',
};

export default function Assets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: assets, isLoading } = useGetAssets({ query: { queryKey: getGetAssetsQueryKey() } });
  const createAsset = useCreateAsset();
  const deleteAsset = useDeleteAsset();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('web_app');
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = () => {
    createAsset.mutate(
      { data: { name, type: type as any, target, description } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
          toast({ title: 'Asset created', description: `${name} has been added` });
          setOpen(false);
          setName('');
          setTarget('');
          setDescription('');
        },
        onError: () => {
          toast({ title: 'Failed to create asset', variant: 'destructive' });
        },
      }
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    deleteAsset.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
          toast({ title: 'Asset deleted', description: `${name} has been removed` });
        },
      }
    );
  };

  const filteredAssets = assets?.filter((asset) =>
    asset.name.toLowerCase().includes(search.toLowerCase()) ||
    asset.target.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-12 bg-muted rounded" />
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
          <h1 className="text-3xl font-bold mb-2">Assets</h1>
          <p className="text-muted-foreground">Manage your testable infrastructure</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="glow-primary" data-testid="button-add-asset">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Production API"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-asset-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="type" data-testid="select-asset-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web_app">Web Application</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="cloud_aws">AWS Cloud</SelectItem>
                    <SelectItem value="cloud_azure">Azure Cloud</SelectItem>
                    <SelectItem value="cloud_gcp">GCP Cloud</SelectItem>
                    <SelectItem value="mobile">Mobile App</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="target">Target (URL or IP)</Label>
                <Input
                  id="target"
                  placeholder="https://api.example.com"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  data-testid="input-asset-target"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Customer-facing REST API"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="input-asset-description"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!name || !target || createAsset.isPending}
                className="w-full glow-primary"
                data-testid="button-create-asset"
              >
                {createAsset.isPending ? 'Creating...' : 'Create Asset'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-search-assets"
        />
      </div>

      {/* Assets List */}
      {filteredAssets && filteredAssets.length > 0 ? (
        <div className="space-y-4">
          {filteredAssets.map((asset) => {
            const Icon = assetTypeIcons[asset.type] || Server;
            return (
              <Link key={asset.id} href={`/assets/${asset.id}`}>
                <div className="bg-card border border-card-border rounded-xl p-6 hover:border-primary/50 transition-all cursor-pointer shadow-md hover:shadow-lg" data-testid={`asset-card-${asset.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold truncate">{asset.name}</h3>
                          <StatusBadge status={asset.status} />
                          <span className={`text-xs font-mono font-semibold uppercase ${riskLevelColors[asset.riskLevel]}`}>
                            {asset.riskLevel}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono truncate mb-2">{asset.target}</p>
                        {asset.description && (
                          <p className="text-sm text-muted-foreground">{asset.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="font-mono">
                            Last scanned: {asset.lastScannedAt
                              ? formatDistanceToNow(new Date(asset.lastScannedAt), { addSuffix: true })
                              : 'Never'}
                          </span>
                          <span className="font-mono">
                            {asset.openFindings || 0} open findings
                          </span>
                          {asset.tags && asset.tags.length > 0 && (
                            <div className="flex gap-1">
                              {asset.tags.map((tag) => (
                                <span key={tag} className="px-2 py-0.5 bg-muted rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${asset.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(asset.id, asset.name);
                      }}
                      data-testid={`button-delete-asset-${asset.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-card border border-card-border rounded-xl">
          <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No assets found</h3>
          <p className="text-muted-foreground mb-6">
            {search ? 'Try a different search term' : 'Add your first asset to start scanning'}
          </p>
          {!search && (
            <Button onClick={() => setOpen(true)} className="glow-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Asset
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
