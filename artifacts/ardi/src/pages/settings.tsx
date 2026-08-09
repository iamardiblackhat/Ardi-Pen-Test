import { useEffect, useState } from 'react';
import { User, Bell, Save, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  useGetMe,
  useUpdateMe,
  getGetMeQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/auth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
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
