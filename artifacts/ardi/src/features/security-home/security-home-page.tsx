import { useState } from 'react';
import { ArdiPanel } from '@/components/ardi-panel';
import { auth } from '@/lib/auth';
import { SecurityAssistantSection } from '@/features/security-home/components/security-assistant-section';
import { SecurityFooter } from '@/features/security-home/components/security-footer';
import { SecurityHeader } from '@/features/security-home/components/security-header';
import { SecurityHero } from '@/features/security-home/components/security-hero';
import { PenTestingSection } from '@/features/security-home/components/pen-testing-section';
import { SecurityToolsSection } from '@/features/security-home/components/security-tools-section';
import { useActiveSecuritySection } from '@/features/security-home/hooks/use-active-security-section';
import { useHeroCarousel } from '@/features/security-home/hooks/use-hero-carousel';
import { routes } from '@/shared/config/routes';
import './security-home.css';

export default function SecurityHomePage() {
  const [ardiOpen, setArdiOpen] = useState(false);
  const hasWorkspace = auth.isAuthenticated();
  const carousel = useHeroCarousel();
  const navigation = useActiveSecuritySection();
  const workspaceRoute = (route: string) => hasWorkspace ? route : routes.login;

  return (
    <div className="dark ardi-security-site">
      <a className="ardi-v2-skip" href="#ardi-main">Skip to ARDI SEC content</a>
      <SecurityHeader activeSection={navigation.activeSection} onOpenAssistant={() => setArdiOpen(true)} onSelectSection={navigation.setActiveSection} />
      <main id="ardi-main">
        <SecurityHero
          activeIndex={carousel.activeIndex}
          activeScene={carousel.activeScene}
          isPlaying={carousel.isPlaying}
          onAdvance={carousel.advance}
          onOpenAssistant={() => setArdiOpen(true)}
          onSelect={carousel.select}
          onToggle={carousel.toggle}
          videoRef={carousel.videoRef}
        />
        <PenTestingSection workspaceRoute={workspaceRoute} />
        <SecurityToolsSection workspaceRoute={workspaceRoute} />
        <SecurityAssistantSection onOpenAssistant={() => setArdiOpen(true)} />
      </main>
      <ArdiPanel open={ardiOpen} onClose={() => setArdiOpen(false)} authenticated={hasWorkspace} context="The visitor is on the ARDI SEC public website." />
      <SecurityFooter />
    </div>
  );
}
