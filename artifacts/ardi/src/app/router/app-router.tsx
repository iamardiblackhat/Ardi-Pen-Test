import { lazy, Suspense, type ComponentType } from 'react';
import { Route, Switch } from 'wouter';
import { ProtectedRoute } from '@/components/protected-route';
import { WorkspaceLayout } from '@/app/layouts/workspace-layout';
import { PageLoading } from '@/shared/ui/page-state';
import { routes } from '@/shared/config/routes';

const SecurityHomePage = lazy(() => import('@/features/security-home/security-home-page'));
const Login = lazy(() => import('@/pages/login'));
const Register = lazy(() => import('@/pages/register'));
const Onboarding = lazy(() => import('@/pages/onboarding'));
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Assets = lazy(() => import('@/pages/assets'));
const AssetDetail = lazy(() => import('@/pages/asset-detail'));
const Scans = lazy(() => import('@/pages/scans'));
const ScanDetail = lazy(() => import('@/pages/scan-detail'));
const Findings = lazy(() => import('@/pages/findings'));
const Reports = lazy(() => import('@/pages/reports'));
const Mitre = lazy(() => import('@/pages/mitre'));
const Osint = lazy(() => import('@/pages/osint'));
const Settings = lazy(() => import('@/pages/settings'));
const NotFound = lazy(() => import('@/pages/not-found'));
const publicInfo = import('@/pages/public-info');
const Terms = lazy(() => publicInfo.then((module) => ({ default: module.Terms })));
const Privacy = lazy(() => publicInfo.then((module) => ({ default: module.Privacy })));
const Cookies = lazy(() => publicInfo.then((module) => ({ default: module.Cookies })));
const Faq = lazy(() => publicInfo.then((module) => ({ default: module.Faq })));

type PageComponent = ComponentType<Record<string, never>>;

const publicRoutes: Array<{ path: string; component: PageComponent }> = [
  { path: routes.home, component: SecurityHomePage },
  { path: routes.login, component: Login },
  { path: routes.register, component: Register },
  { path: routes.terms, component: Terms },
  { path: routes.privacy, component: Privacy },
  { path: routes.cookies, component: Cookies },
  { path: routes.faq, component: Faq },
];

const workspaceRoutes: Array<{ path: string; component: PageComponent }> = [
  { path: routes.dashboard, component: Dashboard },
  { path: '/assets/:id', component: AssetDetail },
  { path: routes.assets, component: Assets },
  { path: '/scans/:id', component: ScanDetail },
  { path: routes.scans, component: Scans },
  { path: '/findings/:id', component: Findings },
  { path: routes.findings, component: Findings },
  { path: routes.reports, component: Reports },
  { path: routes.mitre, component: Mitre },
  { path: routes.osint, component: Osint },
  { path: routes.settings, component: Settings },
];

function DeferredPage({ component: Page }: { component: PageComponent }) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Page />
    </Suspense>
  );
}

export function AppRouter() {
  return (
    <Switch>
      {publicRoutes.map(({ path, component }) => (
        <Route key={path} path={path}>
          <DeferredPage component={component} />
        </Route>
      ))}
      <Route path={routes.onboarding}>
        <ProtectedRoute>
          <DeferredPage component={Onboarding} />
        </ProtectedRoute>
      </Route>
      {workspaceRoutes.map(({ path, component }) => (
        <Route key={path} path={path}>
          <ProtectedRoute>
            <WorkspaceLayout>
              <DeferredPage component={component} />
            </WorkspaceLayout>
          </ProtectedRoute>
        </Route>
      ))}
      <Route>
        <DeferredPage component={NotFound} />
      </Route>
    </Switch>
  );
}
