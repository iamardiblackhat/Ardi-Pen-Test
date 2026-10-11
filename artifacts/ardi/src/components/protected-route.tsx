import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGetMe, getGetMeQueryKey } from '@workspace/api-client-react';
import { auth } from '@/lib/auth';
import { PageLoading } from '@/shared/ui/page-state';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });

  useEffect(() => {
    if (isError) {
      auth.setSession(false);
      setLocation('/login');
    } else if (user) {
      auth.setSession(true);
    }
  }, [isError, user, setLocation]);

  if (isLoading) {
    return <PageLoading label="Verifying session…" />;
  }

  if (isError || !user) {
    return null;
  }

  return <>{children}</>;
}
