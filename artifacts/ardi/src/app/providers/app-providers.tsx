import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@workspace/ardi-ds/components/ui/toaster';
import { TooltipProvider } from '@workspace/ardi-ds/components/ui/tooltip';
import { AppErrorBoundary } from '@/app/error-boundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}


