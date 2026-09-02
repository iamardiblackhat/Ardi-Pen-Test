import { useEffect, useState } from 'react';
import { AppSidebar, MobileAppHeader, MobileBottomNav } from '@/components/app-sidebar';
import { ArdiLauncher, ArdiPanel } from '@/components/ardi-panel';
import { useIsMobile } from '@/hooks/use-mobile';

export function WorkspaceLayout({ children }: { children: React.ReactNode }) {
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
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileAppHeader />
        <main className="min-w-0 flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>
      <MobileBottomNav />
      <ArdiLauncher
        className="bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6"
        onClick={() => setArdiOpen(true)}
      />
      <ArdiPanel
        open={ardiOpen}
        onClose={() => setArdiOpen(false)}
        context={`The user is viewing ${window.location.pathname}. Only describe actions or results that the API has confirmed.`}
      />
    </div>
  );
}

