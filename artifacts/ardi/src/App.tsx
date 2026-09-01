import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { AppSidebar, MobileAppHeader, MobileBottomNav } from '@/components/app-sidebar';
import { useEffect, useState } from 'react';
import { ArdiPanel, ArdiLauncher } from '@/components/ardi-panel';
import { useIsMobile } from '@/hooks/use-mobile';

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
import Osint from '@/pages/osint';
import { Cookies, Faq, Privacy, Terms } from '@/pages/public-info';
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
  const isMobile = useIsMobile();
  const [ardiOpen, setArdiOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) return;

    const introKey = 'ardi-mobile-intro-shown';
    if (!sessionStorage.getItem(introKey)) {
      setArdiOpen(true);
      sessionStorage.setItem(introKey, '1');
    }
  }, [isMobile]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <style>{`
        @media (max-width: 767px) {
          button[aria-label="Open ARDI"] {
            right: 1rem;
            bottom: calc(4.5rem + env(safe-area-inset-bottom));
          }
        }
      `}</style>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileAppHeader />
        <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <MobileBottomNav />
      <ArdiLauncher onClick={() => setArdiOpen(true)} />
      <ArdiPanel
        open={ardiOpen}
        onClose={() => setArdiOpen(false)}
        context={`The user is viewing ${window.location.pathname}. Only describe actions or results that the API has actually confirmed.`}
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/cookies" component={Cookies} />
      <Route path="/faq" component={Faq} />

      <Route path="/onboarding">
        <ProtectedRoute>
          <Onboarding />
        </ProtectedRoute>
      </Route>

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
      <Route path="/osint">
        <ProtectedRoute>
          <AppLayout><Osint /></AppLayout>
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
