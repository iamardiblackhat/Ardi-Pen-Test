import { Component, type ErrorInfo, type ReactNode } from 'react';
import { PageError } from '@/shared/ui/page-state';

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
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <main className="mx-auto max-w-3xl p-4 sm:p-8">
          <PageError
            title="This part of ARDI SEC could not load"
            description="The error has been isolated so the rest of the site remains available."
            onRetry={this.reset}
          />
        </main>
      );
    }

    return this.props.children;
  }
}

