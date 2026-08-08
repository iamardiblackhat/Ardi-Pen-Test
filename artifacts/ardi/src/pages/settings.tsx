import { useState } from 'react';
import { User, Bell, Key, Shield, Save, Copy, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  useGetMe,
  getGetMeQueryKey,
} from '@workspace/api-client-react';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const DEMO_API_KEY = 'ardi_live_sk_7f3a9b2c1d4e5f6a7b8c9d0e1f2a3b4c';

function maskKey(key: string) {
  return key.slice(0, 16) + '••••••••••••••••••••••••••••••••';
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

  const [notifScanComplete, setNotifScanComplete] = useState(true);
  const [notifCritical, setNotifCritical] = useState(true);
  const [notifWeeklyDigest, setNotifWeeklyDigest] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(DEMO_API_KEY);
    toast({ title: 'API key copied', description: 'Keep this secret and do not commit it.' });
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
        <p className="text-muted-foreground">Manage your account, notifications, and API access</p>
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
              <p className="font-bold text-lg">{user?.name ?? '—'}</p>
              <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
              <span className="inline-block mt-1 text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-wide">
                {user?.role ?? 'admin'}
              </span>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input defaultValue={user?.name ?? ''} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input defaultValue={user?.email ?? ''} type="email" />
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Input defaultValue={user?.orgName ?? ''} placeholder="Acme Security" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="glow-primary" data-testid="button-save-profile">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
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
              onChange: setNotifScanComplete,
              testId: 'switch-notif-scan',
            },
            {
              label: 'Critical finding discovered',
              description: 'Alert immediately when a critical severity finding is found',
              checked: notifCritical,
              onChange: setNotifCritical,
              testId: 'switch-notif-critical',
            },
            {
              label: 'Weekly digest',
              description: 'Summary of findings and scan activity every Monday',
              checked: notifWeeklyDigest,
              onChange: setNotifWeeklyDigest,
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

      {/* API Key */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">API Access</h2>
        </div>
        <div className="bg-card border border-card-border rounded-xl p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Use this key to authenticate against the Ardi API from scripts or CI/CD pipelines.
            Treat it like a password.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs font-mono bg-muted rounded-lg px-3 py-2.5 text-muted-foreground border border-border overflow-hidden text-ellipsis whitespace-nowrap">
              {showKey ? DEMO_API_KEY : maskKey(DEMO_API_KEY)}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowKey(!showKey)}
              data-testid="button-toggle-key"
            >
              {showKey ? 'Hide' : 'Reveal'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyKey}
              data-testid="button-copy-key"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              data-testid="button-rotate-key"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Rotate Key
            </Button>
          </div>
        </div>
      </section>

      {/* Security */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Security</h2>
        </div>
        <div className="bg-card border border-card-border rounded-xl divide-y divide-border overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground mt-0.5">Add a TOTP authenticator for extra protection</p>
            </div>
            <Button size="sm" variant="outline" data-testid="button-enable-2fa">Enable 2FA</Button>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Active Sessions</p>
              <p className="text-xs text-muted-foreground mt-0.5">1 active session — this browser</p>
            </div>
            <Button size="sm" variant="outline" data-testid="button-revoke-sessions">Revoke others</Button>
          </div>
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
