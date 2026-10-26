import { useHeroCarousel } from '@/features/security-home/hooks/use-hero-carousel';
import { useEffect } from 'react';
import { useArdiAssistant } from "@/features/ardi/ardi-assistant-provider";
import { SecurityAssistantSection } from '@/features/security-home/components/security-assistant-section';
import { SecurityFooter } from '@/features/security-home/components/security-footer';
import { SecurityHeader } from '@/features/security-home/components/security-header';
import { SecurityHero } from '@/features/security-home/components/security-hero';
import { CapabilityPreviewSection } from '@/features/security-home/components/capability-preview-section';
import { SecurityOperationsSection } from '@/features/security-home/components/security-operations-section';
import { useActiveSecuritySection } from '@/features/security-home/hooks/use-active-security-section';
import './security-home.css';

export default function SecurityHomePage() {
  const { setOpen: setArdiOpen } = useArdiAssistant();
  const navigation = useActiveSecuritySection();
  const hero = useHeroCarousel();

  useEffect(() => {
    document.title = 'ARDI SEC | Investigate. Test. Prove.';
  }, []);

  return (
    <div className="dark ardi-security-site">
      <a className="ardi-v2-skip" href="#ardi-main">Skip to ARDI SEC content</a>
      <SecurityHeader activeSection={navigation.activeSection} onOpenAssistant={() => setArdiOpen(true)} onSelectSection={navigation.setActiveSection} />
      <main id="ardi-main">
        <SecurityHero activeIndex={hero.activeIndex} activeScene={hero.activeScene} isPlaying={hero.isPlaying} onAdvance={hero.advance} onSelect={hero.select} onToggle={hero.toggle} videoRef={hero.videoRef} onOpenAssistant={() => setArdiOpen(true)} />
        <SecurityOperationsSection />
        <CapabilityPreviewSection />
        <SecurityAssistantSection onOpenAssistant={() => setArdiOpen(true)} />
      </main>
      <SecurityFooter />
    </div>
  );
}
