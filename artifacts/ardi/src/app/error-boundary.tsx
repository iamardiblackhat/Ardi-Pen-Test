import { Component, type ErrorInfo, type ReactNode } from 'react';
import { PageError } from '@/shared/ui/page-state';
import { isModuleLoadError } from './module-load-error';

type State = { error: Error | null };

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ARDI SEC render failure', error, info);
  }

  private reset = () => {
    if (this.state.error && isModuleLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      const moduleFailed = isModuleLoadError(this.state.error);
      return (
        <main className="mx-auto max-w-3xl p-4 sm:p-8">
          <PageError
            title="This part of ARDI SEC could not load"
            description={moduleFailed ? "The page files changed or could not be downloaded. Reload to load the current version." : "The error has been isolated so the rest of the site remains available."}
            actionLabel={moduleFailed ? "Reload page" : "Try again"}
            onRetry={this.reset}
          />
        </main>
      );
    }

    return this.props.children;
  }
}

