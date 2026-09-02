import { LucideIcon } from 'lucide-react';
import { cn } from '@workspace/ardi-ds/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}
export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-card border border-card-border rounded-lg p-6 shadow-md', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold font-mono text-card-foreground mt-2">{value}</p>
          {trend && (
            <p className={cn(
              'text-sm font-mono mt-2',
              trend.isPositive ? 'text-green-500' : 'text-destructive'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
