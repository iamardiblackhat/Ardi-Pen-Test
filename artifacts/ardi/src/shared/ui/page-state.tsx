import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';

type PageStateProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

function PageStateFrame({
  children,
  title,
  description,
  actionLabel,
  onAction,
}: PageStateProps & { children: React.ReactNode }) {
  return (
    <section
      className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center"
      aria-live="polite"
    >
      {children}
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">{description}</p>
      ) : null}
      {actionLabel && onAction ? (
        <Button className="mt-5" type="button" onClick={onAction}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}

export function PageLoading({ label = 'Loading workspace' }: { label?: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center" role="status">
      <Loader2 className="mr-3 h-5 w-5 animate-spin text-primary" aria-hidden="true" />
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export function PageError({ title, description, onRetry }: PageStateProps & { onRetry?: () => void }) {
  return (
    <PageStateFrame title={title} description={description} actionLabel={onRetry ? 'Try again' : undefined} onAction={onRetry}>
      <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
    </PageStateFrame>
  );
}

export function PageEmpty({ title, description, actionLabel, onAction }: PageStateProps) {
  return (
    <PageStateFrame title={title} description={description} actionLabel={actionLabel} onAction={onAction}>
      <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
    </PageStateFrame>
  );
}


