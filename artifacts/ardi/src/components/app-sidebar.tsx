import { Link, useLocation } from 'wouter';
import { Shield, LayoutDashboard, Server, Scan, AlertTriangle, Grid3x3, FileText, Settings, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { useGetScans, getGetScansQueryKey } from '@workspace/api-client-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/assets', label: 'Assets', icon: Server },
  { path: '/scans', label: 'Scans', icon: Scan },
  { path: '/findings', label: 'Findings', icon: AlertTriangle },
  { path: '/mitre', label: 'MITRE ATT&CK', icon: Grid3x3 },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/compliance', label: 'Compliance', icon: Activity },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: scans } = useGetScans({ query: { queryKey: getGetScansQueryKey() } });

  const hasActiveScans = scans?.some(s => s.status === 'running') || false;

  return (
    <aside className="flex flex-col w-64 h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg glow-primary">
          <Shield className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight">Ardi</h1>
          <div className="flex items-center gap-2">
            {hasActiveScans && (
              <div className="flex items-center gap-1.5 text-xs text-primary">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse-glow" />
                <span className="font-mono font-medium">LIVE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || location.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md glow-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary/50">
              <AvatarFallback className="bg-primary/20 text-primary font-mono font-semibold">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.orgName}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
