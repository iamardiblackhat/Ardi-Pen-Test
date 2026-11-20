import { useEffect, useState } from 'react';
import { User, Bell, Save, LogOut, Loader2, Palette, Webhook, KeyRound, Copy, Trash2, Send } from 'lucide-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { Input } from '@workspace/ardi-ds/components/ui/input';
import { Label } from '@workspace/ardi-ds/components/ui/label';
import { Switch } from '@workspace/ardi-ds/components/ui/switch';
import { Separator } from '@workspace/ardi-ds/components/ui/separator';
import { Avatar, AvatarFallback } from '@workspace/ardi-ds/components/ui/avatar';
import {
  useGetMe,
  useUpdateMe,
  getGetMeQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { backendError } from '@/lib/api-error';

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const updateMe = useUpdateMe();

  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [notifScanComplete, setNotifScanComplete] = useState(true);
  const [notifCritical, setNotifCritical] = useState(true);
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState(false);

  // White-label report & dossier branding state
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#16181d');
  const [contactEmail, setContactEmail] = useState('');
  const [footerText, setFooterText] = useState('');
  const [savingBranding, setSavingBranding] = useState(false);

  // Alert Webhooks state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Workspace API Keys state
  interface ApiKeyItem {
    id: number;
    name: string;
    keyPrefix: string;
    lastUsedAt: string | null;
    createdAt: string;
  }
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const headers: Record<string, string> = auth.getToken()
      ? { authorization: `Bearer ${auth.getToken()}` }
      : {};
    fetch('/api/settings/branding', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        setBrandName(data.brandName ?? '');
        setLogoUrl(data.logoUrl ?? '');
        setAccentColor(data.accentColor || '#16181d');
        setContactEmail(data.contactEmail ?? '');
        setFooterText(data.footerText ?? '');
      })
      .catch(() => {});

    fetch('/api/settings/webhooks', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        setWebhookUrl(data.webhookUrl ?? '');
        setWebhookEnabled(Boolean(data.enabled));
      })
      .catch(() => {});

    fetch('/api/settings/api-keys', { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data || !Array.isArray(data.keys)) return;
        setApiKeys(data.keys as ApiKeyItem[]);
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const saveWebhook = async () => {
    setSavingWebhook(true);
    try {
      const res = await fetch('/api/settings/webhooks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {}),
        },
        body: JSON.stringify({
          webhookUrl,
          enabled: webhookEnabled,
          notifyOnMonitoring: true,
          notifyOnHighFindings: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Could not save webhook', description: data.error || 'Check URL and try again.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Alert webhook saved' });
    } catch {
      toast({ title: 'Could not save webhook', description: 'Try again.', variant: 'destructive' });
    } finally {
      setSavingWebhook(false);
    }
  };

  const testWebhook = async () => {
    setTestingWebhook(true);
    try {
      const res = await fetch('/api/settings/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {}),
        },
        body: JSON.stringify({ webhookUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Test alert failed', description: data.error || 'Webhook rejected the test message.', variant: 'destructive' });
        return;
      }
      toast({ title: 'Test alert delivered', description: 'Check your Slack, Discord, or webhook channel.' });
    } catch {
      toast({ title: 'Test alert failed', description: 'Try again.', variant: 'destructive' });
    } finally {
      setTestingWebhook(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {}),
        },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Could not create API key', description: data.error || 'Try again.', variant: 'destructive' });
        return;
      }
      setApiKeys((prev) => [data.key as ApiKeyItem, ...prev]);
      setFreshKey(String(data.plaintextKey));
      setNewKeyName('');
      toast({ title: 'API key created', description: 'Copy it now. It will not be shown again.' });
    } catch {
      toast({ title: 'Could not create API key', description: 'Try again.', variant: 'destructive' });
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeApiKey = async (id: number) => {
    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, {
        method: 'DELETE',
        headers: auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {},
      });
      if (res.ok) {
        setApiKeys((prev) => prev.filter((k) => k.id !== id));
        toast({ title: 'API key revoked' });
      }
    } catch {
      toast({ title: 'Could not revoke API key', variant: 'destructive' });
    }
  };

  const saveBranding = async () => {
    setSavingBranding(true);
    try {
      const res = await fetch('/api/settings/branding', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(auth.getToken() ? { authorization: `Bearer ${auth.getToken()}` } : {}),
        },
        body: JSON.stringify({
          brandName,
          logoUrl,
          accentColor,
          contactEmail,
          footerText,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Could not save branding',
          description: data.error || 'Check your inputs and try again.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Report branding saved',
        description: 'All new PDF security reports and company dossiers will use your brand.',
      });
    } catch {
      toast({ title: 'Could not save branding', description: 'Try again.', variant: 'destructive' });
    } finally {
      setSavingBranding(false);
    }
  };

  // Local form state mirrors the server once, on load — after that it's
  // the user's to edit until they hit Save.
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setOrgName(user.orgName);
    setNotifScanComplete(user.notifyScanComplete);
    setNotifCritical(user.notifyCritical);
    setNotifWeeklyDigest(user.notifyWeeklyDigest);
  }, [user]);

  const saveProfile = () => {
    updateMe.mutate(
      { data: { name, orgName } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({ title: 'Profile updated' });
        },
        onError: (error) => toast({ title: 'Failed to update profile', description: backendError(error, 'Try again.'), variant: 'destructive' }),
      },
    );
  };

  const saveNotification = (patch: Partial<{ notifyScanComplete: boolean; notifyCritical: boolean; notifyWeeklyDigest: boolean }>) => {
    updateMe.mutate(
      { data: patch },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
        onError: (error) => toast({ title: 'Failed to update notification setting', description: backendError(error, 'Try again.'), variant: 'destructive' }),
      },
    );
  };

  const handleLogout = () => {
    auth.clearToken();
    setLocation('/login');
  };

  const initials = user
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your account and notifications</p>
      </div>

      {/* Profile */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <User className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Profile</h2>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/40">
              <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold font-mono">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-lg">{user?.name ?? '-'}</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? '-'}</p>
              <span className="inline-block mt-1 text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wide">
                {user?.role ?? 'admin'}
              </span>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" data-testid="input-name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email ?? ''} type="email" disabled title="Email changes aren't supported yet" />
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Security" data-testid="input-org-name" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="glow-primary" onClick={saveProfile} disabled={updateMe.isPending} data-testid="button-save-profile">
              {updateMe.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </section>

      {/* White-Label Report & Dossier Branding */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <Palette className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold">Report &amp; Dossier Branding (White-Label)</h2>
            <p className="text-xs text-muted-foreground">
              Add your own company name, logo, and color to every exported PDF security report and company due diligence dossier.
            </p>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company / Agency Name</Label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Acme Cyber Advisory"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Email (shown in footer)</Label>
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                type="email"
                placeholder="security@youragency.com"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Logo URL (PNG, SVG, or JPG)</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://youragency.com/logo.png"
              />
            </div>
            <div className="space-y-2">
              <Label>Report Accent Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#16181d'}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-10 w-12 rounded border border-border bg-transparent cursor-pointer"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#16181d"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Custom Footer Line</Label>
              <Input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                placeholder="Confidential client report prepared by Acme Cyber Advisory."
              />
            </div>
          </div>

          {(brandName || logoUrl) && (
            <div
              className="rounded-lg border border-border bg-background p-4"
              style={{ borderTopWidth: '3px', borderTopColor: /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : '#16181d' }}
            >
              <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-2">
                Report Header Preview
              </p>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={brandName || 'Brand logo'}
                  className="max-h-9 max-w-[180px] object-contain mb-2"
                />
              )}
              <p className="font-bold text-sm" style={{ color: /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : undefined }}>
                {brandName || 'ARDI SEC'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {footerText || 'Security assessment report and due diligence dossier.'}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button className="glow-primary" onClick={saveBranding} disabled={savingBranding}>
              {savingBranding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Branding
            </Button>
          </div>
        </div>
      </section>

      {/* Alert Webhooks (Slack, Discord, Teams) */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <Webhook className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold">Instant Alert Webhooks</h2>
            <p className="text-xs text-muted-foreground">
              Send automatic alerts to Slack, Discord, Microsoft Teams, or any HTTPS webhook whenever weekly monitoring detects a change.
            </p>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable Alert Webhooks</p>
              <p className="text-xs text-muted-foreground">Deliver real-time notifications when monitored websites change</p>
            </div>
            <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
          </div>
          <div className="space-y-2">
            <Label>Webhook URL (HTTPS)</Label>
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/... or https://discord.com/api/webhooks/..."
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={testWebhook} disabled={testingWebhook || !webhookUrl.trim()}>
              {testingWebhook ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Test Alert
            </Button>
            <Button className="glow-primary" onClick={saveWebhook} disabled={savingWebhook}>
              {savingWebhook ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Webhook
            </Button>
          </div>
        </div>
      </section>

      {/* Workspace API Keys (CI/CD & Automation) */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <KeyRound className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-lg font-bold">Workspace API Keys (CI/CD &amp; Automation)</h2>
            <p className="text-xs text-muted-foreground">
              Trigger ARDI security checks automatically from GitHub Actions, GitLab CI, or internal tools using the X-API-Key header.
            </p>
          </div>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Key name (e.g. GitHub Actions Deploy Check)"
              className="flex-1"
            />
            <Button onClick={createApiKey} disabled={creatingKey || !newKeyName.trim()}>
              {creatingKey ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
              Generate API Key
            </Button>
          </div>

          {freshKey ? (
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 space-y-2">
              <p className="text-xs font-semibold text-primary">
                Copy your new API key now. For security, it will not be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-background px-3 py-2 text-xs font-mono break-all border border-border">
                  {freshKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard?.writeText(freshKey);
                    toast({ title: 'API key copied' });
                  }}
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy
                </Button>
              </div>
            </div>
          ) : null}

          {apiKeys.length > 0 ? (
            <ul className="divide-y divide-border">
              {apiKeys.map((k) => (
                <li key={k.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{k.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {k.keyPrefix} | Created {new Date(k.createdAt).toLocaleDateString()}
                      {k.lastUsedAt ? ` | Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ' | Never used'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void revokeApiKey(k.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No active API keys yet.</p>
          )}
        </div>
      </section>

      {/* Notifications */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Notifications</h2>
        </div>
        <div className="bg-card border border-card-border rounded-xl divide-y divide-border overflow-hidden">
          {[
            {
              label: 'Scan completed',
              description: 'Notify when a scan finishes successfully',
              checked: notifScanComplete,
              onChange: (v: boolean) => { setNotifScanComplete(v); saveNotification({ notifyScanComplete: v }); },
              testId: 'switch-notif-scan',
            },
            {
              label: 'Critical finding discovered',
              description: 'Alert immediately when a critical severity finding is found',
              checked: notifCritical,
              onChange: (v: boolean) => { setNotifCritical(v); saveNotification({ notifyCritical: v }); },
              testId: 'switch-notif-critical',
            },
            {
              label: 'Weekly digest',
              description: 'Summary of findings and scan activity every Monday',
              checked: notifWeeklyDigest,
              onChange: (v: boolean) => { setNotifWeeklyDigest(v); saveNotification({ notifyWeeklyDigest: v }); },
              testId: 'switch-notif-digest',
            },
          ].map(({ label, description, checked, onChange, testId }) => (
            <div key={label} className="flex items-center justify-between p-5">
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
              <Switch checked={checked} onCheckedChange={onChange} data-testid={testId} />
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <LogOut className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Security</h2>
        </div>
        <div className="bg-card border border-card-border rounded-xl divide-y divide-border overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Sign Out</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sign out of this account on all devices</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
