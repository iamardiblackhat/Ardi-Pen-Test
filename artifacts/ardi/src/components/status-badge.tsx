import { cn } from '@workspace/ardi-ds/lib/utils';

type Status = 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'open' | 'in_progress' | 'resolved' | 'accepted_risk' | 'false_positive' | 'active' | 'inactive' | 'scanning' | 'generating' | 'ready';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}
const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-muted text-muted-foreground border-muted-foreground/50' },
  running: { label: 'Running', className: 'bg-primary/20 text-primary border-primary/50 animate-pulse' },
  completed: { label: 'Completed', className: 'bg-green-500/20 text-green-500 border-green-500/50' },
  failed: { label: 'Failed', className: 'bg-destructive/20 text-destructive border-destructive/50' },
  stopped: { label: 'Stopped', className: 'bg-muted text-muted-foreground border-muted-foreground/50' },
  open: { label: 'Open', className: 'bg-destructive/20 text-destructive border-destructive/50' },
  in_progress: { label: 'In Progress', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' },
  resolved: { label: 'Resolved', className: 'bg-green-500/20 text-green-500 border-green-500/50' },
  accepted_risk: { label: 'Accepted Risk', className: 'bg-blue-500/20 text-blue-500 border-blue-500/50' },
  false_positive: { label: 'False Positive', className: 'bg-muted text-muted-foreground border-muted-foreground/50' },
  active: { label: 'Active', className: 'bg-green-500/20 text-green-500 border-green-500/50' },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground border-muted-foreground/50' },
  scanning: { label: 'Scanning', className: 'bg-primary/20 text-primary border-primary/50 animate-pulse' },
  generating: { label: 'Generating', className: 'bg-primary/20 text-primary border-primary/50 animate-pulse' },
  ready: { label: 'Ready', className: 'bg-green-500/20 text-green-500 border-green-500/50' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  if (!config) return null;
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold border uppercase tracking-wide',
        config.className,
        className
      )}
      data-testid={`badge-status-${status}`}
    >
      {config.label}
    </span>
  );
}
