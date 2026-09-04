import { useEffect, useState } from 'react';
import { ArdiPanel } from '@/components/ardi-panel';
import { auth } from '@/lib/auth';
import { SecurityAssistantSection } from '@/features/security-home/components/security-assistant-section';
import { SecurityFooter } from '@/features/security-home/components/security-footer';
import { SecurityHeader } from '@/features/security-home/components/security-header';
import { SecurityHero } from '@/features/security-home/components/security-hero';
import { CapabilityPreviewSection } from '@/features/security-home/components/capability-preview-section';
import { SecurityOperationsSection } from '@/features/security-home/components/security-operations-section';
import { useActiveSecuritySection } from '@/features/security-home/hooks/use-active-security-section';
import { useHeroCarousel } from '@/features/security-home/hooks/use-hero-carousel';
import './security-home.css';

export default function SecurityHomePage() {
  const [ardiOpen, setArdiOpen] = useState(false);
  const hasWorkspace = auth.isAuthenticated();
  const carousel = useHeroCarousel();
  const navigation = useActiveSecuritySection();

  useEffect(() => {
    document.title = 'ARDI SEC | Investigate. Test. Prove.';
  }, []);

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
        <SecurityOperationsSection />
        <CapabilityPreviewSection />
        <SecurityAssistantSection onOpenAssistant={() => setArdiOpen(true)} />
      </main>
      <ArdiPanel open={ardiOpen} onClose={() => setArdiOpen(false)} authenticated={hasWorkspace} context="The visitor is on the ARDI SEC public website." />
      <SecurityFooter />
    </div>
  );
}
