import { cn } from '@workspace/ardi-ds/lib/utils';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}
const severityConfig = {
  critical: {
    label: 'Critical',
    className: 'bg-destructive/20 text-destructive border-destructive/50',
  },
  high: {
    label: 'High',
    className: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
  },
  medium: {
    label: 'Medium',
    className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
  },
  low: {
    label: 'Low',
    className: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
  },
  info: {
    label: 'Info',
    className: 'bg-muted text-muted-foreground border-muted-foreground/50',
  },
};

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold border uppercase tracking-wide',
        config.className,
        className
      )}
      data-testid={`badge-severity-${severity}`}
    >
      {config.label}
    </span>
  );
}
