import { useEffect, useState } from 'react';
import { ArrowRight, Check, MessageSquareText } from 'lucide-react';
import { Link } from 'wouter';
import { ArdiPanel } from '@/components/ardi-panel';
import { SecurityFooter } from '@/features/security-home/components/security-footer';
import { SecurityHeader } from '@/features/security-home/components/security-header';
import { publicCapabilities } from '@/features/capabilities/capability-content';
import { auth } from '@/lib/auth';
import { routes } from '@/shared/config/routes';
import '@/features/security-home/security-home.css';
import './public-capabilities-page.css';

export default function PublicCapabilitiesPage() {
  const [ardiOpen, setArdiOpen] = useState(false);
  const hasWorkspace = auth.isAuthenticated();

  useEffect(() => {
    document.title = 'Security Operations | ARDI SEC';
  }, []);

  return (
    <div className="dark ardi-security-site ardi-capabilities-page">
      <a className="ardi-v2-skip" href="#capabilities-main">Skip to capabilities</a>
      <SecurityHeader activeSection="capabilities" onOpenAssistant={() => setArdiOpen(true)} />
      <main id="capabilities-main">
        <section className="ardi-cap-hero" aria-labelledby="capabilities-title">
          <div className="ardi-cap-hero-media" aria-hidden="true">
            <video src="/ardi/media/ardi-evidence.mp4" poster="/ardi/media/ardi-security-hero-poster.png" autoPlay muted loop playsInline preload="metadata" />
            <div />
          </div>
          <div className="ardi-v2-shell ardi-cap-hero-copy">
            <p className="ardi-v2-kicker"><i /> ARDI SEC / SECURITY OPERATIONS</p>
            <h1 id="capabilities-title">Investigate deeper.<br />Test what matters.<br /><em>Act on proof.</em></h1>
            <p>Choose the outcome first. See exactly what ARDI can do before creating a workspace, then execute the real workflow from chat or the operating surface.</p>
            <div className="ardi-cap-hero-actions">
              <button type="button" className="ardi-v2-button ardi-v2-button-primary" onClick={() => setArdiOpen(true)}>Ask ARDI what fits <MessageSquareText /></button>
              <Link href={hasWorkspace ? routes.dashboard : routes.register} className="ardi-v2-button ardi-v2-button-chat">{hasWorkspace ? 'Open workspace' : 'Create free workspace'} <ArrowRight /></Link>
            </div>
          </div>
        </section>

        <nav className="ardi-cap-index" aria-label="Security operation index">
          <div className="ardi-v2-shell">
            {publicCapabilities.map((capability) => <a key={capability.id} href={`#${capability.id}`}><span>{capability.code}</span>{capability.label}</a>)}
          </div>
        </nav>

        <section className="ardi-cap-list" aria-label="Available security operations">
          <div className="ardi-v2-shell">
            {publicCapabilities.map((capability) => {
              const Icon = capability.icon;
              return (
                <article key={capability.id} id={capability.id} className="ardi-cap-card">
                  <header><span>{capability.code}</span><Icon aria-hidden="true" /><p>{capability.label}</p><b>{capability.coverage}</b></header>
                  <div className="ardi-cap-card-copy"><h2>{capability.title}</h2><p>{capability.summary}</p></div>
                  <ul>{capability.outcomes.map((outcome) => <li key={outcome}><Check aria-hidden="true" />{outcome}</li>)}</ul>
                  <div className="ardi-cap-card-actions">
                    <Link href={hasWorkspace ? capability.workspaceHref : routes.register}>{hasWorkspace ? 'Open this operation' : 'Create free workspace to run'} <ArrowRight /></Link>
                    <button type="button" onClick={() => setArdiOpen(true)}>Ask ARDI about it</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="ardi-cap-region" aria-labelledby="region-title">
          <div className="ardi-v2-shell"><p className="ardi-v2-kicker"><span>UK/EU</span> REGIONAL RESEARCH</p><h2 id="region-title">Not built around one country.</h2><p>Open-source investigations can prioritise UK, European, or global evidence. Results identify jurisdictions and retain their source trail instead of pretending every subject lives in the United States.</p></div>
        </section>
      </main>
      <ArdiPanel open={ardiOpen} onClose={() => setArdiOpen(false)} authenticated={hasWorkspace} context="The visitor is reviewing ARDI SEC capabilities and wants help choosing the correct real operation." />
      <SecurityFooter />
    </div>
  );
}
