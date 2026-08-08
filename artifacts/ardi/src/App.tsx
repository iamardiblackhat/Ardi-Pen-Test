import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { AppSidebar } from '@/components/app-sidebar';
import { useState } from 'react';
import { ArdiPanel, ArdiLauncher } from '@/components/ardi-panel';

import Landing from '@/pages/landing';
import Login from '@/pages/login';
import Register from '@/pages/register';
import Onboarding from '@/pages/onboarding';
import Dashboard from '@/pages/dashboard';
import Assets from '@/pages/assets';
import AssetDetail from '@/pages/asset-detail';
import Scans from '@/pages/scans';
import ScanDetail from '@/pages/scan-detail';
import Findings from '@/pages/findings';
import Reports from '@/pages/reports';
import Compliance from '@/pages/compliance';
import Mitre from '@/pages/mitre';
import Settings from '@/pages/settings';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function AppLayout({ children }: { children: React.ReactNode }) {
  // ARDI is present on every page of the app, not tucked behind one route.
  const [ardiOpen, setArdiOpen] = useState(false);
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AppSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <ArdiLauncher onClick={() => setArdiOpen(true)} />
      <ArdiPanel
        open={ardiOpen}
        onClose={() => setArdiOpen(false)}
        context={`The user is viewing ${window.location.pathname}`}
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Onboarding (protected but no sidebar) */}
      <Route path="/onboarding">
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </Route>

      {/* Protected app routes with sidebar */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/assets/:id">
        <ProtectedRoute>
          <AppLayout><AssetDetail /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/assets">
        <ProtectedRoute>
          <AppLayout><Assets /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/scans/:id">
        <ProtectedRoute>
          <AppLayout><ScanDetail /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/scans">
        <ProtectedRoute>
          <AppLayout><Scans /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/findings">
        <ProtectedRoute>
          <AppLayout><Findings /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <AppLayout><Reports /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/compliance">
        <ProtectedRoute>
          <AppLayout><Compliance /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/mitre">
        <ProtectedRoute>
          <AppLayout><Mitre /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <AppLayout><Settings /></AppLayout>
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
