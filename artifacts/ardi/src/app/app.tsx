import { Router as WouterRouter } from 'wouter';
import { AppProviders } from '@/app/providers/app-providers';
import { AppRouter } from '@/app/router/app-router';

export default function App() {
  return (
    <AppProviders>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <AppRouter />
      </WouterRouter>
    </AppProviders>
  );
}

