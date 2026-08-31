import { Link, useLocation } from 'wouter';
import {
  Shield,
  LayoutDashboard,
  Server,
  Scan,
  AlertTriangle,
  Grid3x3,
  FileText,
  Settings,
  Activity,
} from 'lucide-react';
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

const mobileNavItems = [
  navItems[0],
  navItems[1],
  navItems[2],
  navItems[3],
  navItems[5],
];

export function AppSidebar() {
  const [location] = useLocation();
  const { data: user } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: scans } = useGetScans({ query: { queryKey: getGetScansQueryKey() } });

  const hasActiveScans = scans?.some((scan) => scan.status === 'running') || false;

  return (
    <aside className="hidden h-dvh w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex items-center gap-3 border-b border-sidebar-border p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary glow-primary">
          <Shield className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-sidebar-foreground">Ardi</h1>
          {hasActiveScans && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="font-mono font-medium">LIVE</span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || location.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md glow-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-primary/50">
              <AvatarFallback className="bg-primary/20 font-mono font-semibold text-primary">
                {user.name.split(' ').map((name) => name[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.orgName}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export function MobileAppHeader() {
  const [location] = useLocation();
  const title = navItems.find(
    (item) => location === item.path || location.startsWith(item.path + '/'),
  )?.label ?? 'Ardi';

  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:hidden">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/40">
          <Shield className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-mono uppercase tracking-[0.18em] text-primary">ARDI</p>
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        </div>
      </div>
      <Link
        href="/settings"
        aria-label="Open settings"
        className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Settings className="h-5 w-5" />
      </Link>
    </header>
  );
}

export function MobileBottomNav() {
  const [location] = useLocation();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur md:hidden"
      aria-label="Primary mobile navigation"
    >
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path || location.startsWith(item.path + '/');
        return (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              'flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="h-5 w-5" />
            <span className="max-w-full truncate">{item.label === 'Dashboard' ? 'Home' : item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
