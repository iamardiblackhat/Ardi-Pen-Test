/**
 * ARDI SEC / LIVE LAB V2
 * Frontend-only Ardi Sec penetration-testing interface.
 * One moving ARDI hero; every later zone has a distinct security job and a
 * contained, role-specific media treatment. No record, count, scan, or
 * intelligence value is invented on this page.
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import {
  Activity, ArrowRight, ArrowUpRight, BrainCircuit, Bug, Database,
  FileSearch2, Globe2, Menu, Network, Pause, Play, Radar,
  ScanSearch, Search, ShieldAlert, ShieldCheck, Target, X,
} from 'lucide-react';
import { ArdiPanel } from '@/components/ardi-panel';
import { auth } from '@/lib/auth';
import './landing-live-lab.css';

const securityRoutes = [
  { code: '01', label: 'Scope', title: 'Map the estate', body: 'Put approved systems in one place before technical work begins.', href: '/assets', icon: Target },
  { code: '02', label: 'Assess', title: 'Run a test', body: 'Create and follow a controlled assessment against an approved asset.', href: '/scans', icon: ScanSearch },
  { code: '03', label: 'Evidence', title: 'Work findings', body: 'Review the evidence returned by the workspace and take the next action.', href: '/findings', icon: FileSearch2 },
  { code: '04', label: 'Research', title: 'Investigate', body: 'Use domain research and intelligence routes to shape the next question.', href: '/osint', icon: Search },
];

const intelligenceViews = [
  { id: 'malware', label: 'Malware', description: 'Code and families connected by your configured intelligence source.', icon: Bug },
  { id: 'actors', label: 'Threat actors', description: 'Groups and intrusion sets returned by the connected source.', icon: Network },
  { id: 'vulnerabilities', label: 'Vulnerabilities', description: 'Source-backed weakness records that relate to your investigation.', icon: ShieldAlert },
  { id: 'attacks', label: 'Attacks', description: 'Campaign, technique, and relationship context from the source.', icon: Activity },
];

const heroScenes = [
  {
    id: 'scope',
    label: 'Scope',
    detail: 'Authorise the target',
    type: 'video' as const,
    src: '/ardi/media/ardi-security-lab.mp4',
    poster: '/ardi/media/ardi-security-lab-poster.png',
  },
  {
    id: 'assess',
    label: 'Assess',
    detail: 'Run the controlled test',
    type: 'video' as const,
    src: '/ardi/media/ardi-assessment.mp4',
    poster: '/ardi/media/ardi-security-lab-poster.png',
  },
  {
    id: 'evidence',
    label: 'Evidence',
    detail: 'Work the verified proof',
    type: 'video' as const,
    src: '/ardi/media/ardi-evidence.mp4',
    poster: '/ardi/media/ardi-security-lab-poster.png',
  },
];

const primaryNavigation = [
  { id: 'operations', label: 'Operations' },
  { id: 'intelligence', label: 'Threat intelligence' },
  { id: 'assistant', label: 'Talk to ARDI' },
];

function ArdiMark() {
  return <span className="ardi-v2-mark" aria-hidden="true"><i /><b /></span>;
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ardiOpen, setArdiOpen] = useState(false);
  const [heroMotionPlaying, setHeroMotionPlaying] = useState(true);
  const [activeHeroScene, setActiveHeroScene] = useState(0);
  const [activeSection, setActiveSection] = useState('operations');
  const [intelView, setIntelView] = useState(intelligenceViews[0].id);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const hasWorkspace = auth.isAuthenticated();
  const activeIntelView = intelligenceViews.find((view) => view.id === intelView) ?? intelligenceViews[0];
  const heroScene = heroScenes[activeHeroScene];
  const workspaceRoute = (route: string) => hasWorkspace ? route : '/login';
  const closeMenu = () => setMenuOpen(false);

  const advanceHeroScene = () => {
    setActiveHeroScene((current) => (current + 1) % heroScenes.length);
  };

  useEffect(() => {
    if (!heroMotionPlaying) return;
    if (heroScene.type === 'video') {
      void heroVideoRef.current?.play();
      return;
    }
    const timer = window.setTimeout(advanceHeroScene, 6500);
    return () => window.clearTimeout(timer);
  }, [activeHeroScene, heroMotionPlaying, heroScene.type]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: '-18% 0px -58%', threshold: [0.1, 0.35, 0.6] });

    primaryNavigation.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  const toggleHeroMotion = () => {
    const nextPlaying = !heroMotionPlaying;
    setHeroMotionPlaying(nextPlaying);
    const video = heroVideoRef.current;
    if (heroScene.type !== 'video' || !video) return;
    if (nextPlaying) void video.play();
    else video.pause();
  };

  const selectHeroScene = (index: number) => {
    setActiveHeroScene(index);
    setHeroMotionPlaying(true);
  };

  return (
    <div className="dark ardi-live-v2">
      <a className="ardi-v2-skip" href="#ardi-main">Skip to security routes</a>
      <header className="ardi-v2-header">
        <div className="ardi-v2-shell ardi-v2-header-inner">
          <Link href="/" className="ardi-v2-brand" onClick={closeMenu} aria-label="Ardi Sec home">
            <ArdiMark />
            <span><b>ARDI SEC</b><small>AUTHORISED SECURITY LAB</small></span>
          </Link>
          <nav className="ardi-v2-nav" aria-label="Primary navigation">
            {primaryNavigation.map((item) => <a key={item.id} href={`#${item.id}`} onClick={() => setActiveSection(item.id)} aria-current={activeSection === item.id ? 'location' : undefined}>{item.label}</a>)}
            <Link href="/login">Sign in</Link>
          </nav>
          <div className="ardi-v2-header-actions">
            <button type="button" className="ardi-v2-header-chat" onClick={() => setArdiOpen(true)}>Chat with ARDI</button>
            <Link href="/register" className="ardi-v2-header-start">Start workspace <ArrowUpRight /></Link>
            <button type="button" className="ardi-v2-menu" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        {menuOpen && <nav className="ardi-v2-mobile-nav" aria-label="Mobile navigation"><div className="ardi-v2-shell">
          <a href="#operations" onClick={closeMenu}>Security operations <ArrowRight /></a>
          <a href="#intelligence" onClick={closeMenu}>Threat intelligence <ArrowRight /></a>
          <button type="button" onClick={() => { closeMenu(); setArdiOpen(true); }}>Talk to ARDI <ArrowRight /></button>
          <Link href="/login" onClick={closeMenu}>Sign in <ArrowRight /></Link>
        </div></nav>}
      </header>

      <main id="ardi-main">
        <section className="ardi-v2-hero" aria-labelledby="ardi-hero-title">
          <div className="ardi-v2-hero-media" aria-hidden="true">
            {heroScene.type === 'video'
              ? <video key={heroScene.id} ref={heroVideoRef} id="ardi-v2-hero-video" src={heroScene.src} poster={heroScene.poster} autoPlay={heroMotionPlaying} muted playsInline onEnded={advanceHeroScene} />
              : <img key={heroScene.id} className={`ardi-v2-hero-scene-image ${heroMotionPlaying ? 'is-playing' : ''}`} src={heroScene.src} alt="" />}
            <div className="ardi-v2-hero-grid" /><div className="ardi-v2-hero-fade" />
          </div>
          <div className="ardi-v2-shell ardi-v2-hero-content">
            <div className="ardi-v2-hero-copy">
              <p className="ardi-v2-kicker"><i /> ARDI SEC / PENETRATION TESTING LAB</p>
              <h1 id="ardi-hero-title">See the risk.<br />Run the test.<br /><em>Work the proof.</em></h1>
              <p className="ardi-v2-hero-lead">A practical security workspace for authorised testing, evidence, domain research, and source-bound threat intelligence.</p>
              <div className="ardi-v2-hero-actions">
                <Link href="/register" className="ardi-v2-button ardi-v2-button-primary">Start a workspace <ArrowRight /></Link>
                <button type="button" className="ardi-v2-button ardi-v2-button-chat" onClick={() => setArdiOpen(true)}>Talk to ARDI <ArrowRight /></button>
                <button type="button" className="ardi-v2-video-button" onClick={toggleHeroMotion} aria-controls="ardi-v2-hero-scenes" aria-pressed={heroMotionPlaying}>{heroMotionPlaying ? <Pause /> : <Play />} {heroMotionPlaying ? 'Pause ARDI scenes' : 'Play ARDI scenes'}</button>
              </div>
              <div id="ardi-v2-hero-scenes" className="ardi-v2-hero-scenes" role="tablist" aria-label="ARDI security scenes">
                {heroScenes.map((scene, index) => <button key={scene.id} type="button" role="tab" aria-selected={index === activeHeroScene} className={index === activeHeroScene ? 'active' : ''} onClick={() => selectHeroScene(index)}><span>0{index + 1}</span><b>{scene.label}</b><small>{scene.detail}</small></button>)}
              </div>
            </div>
            <aside className="ardi-v2-hero-rail" aria-label="How an authorised test moves through ARDI">
              <strong>How the authorised workspace runs</strong>
              <span><b>01</b> Confirm permission</span><span><b>02</b> Test approved systems</span><span><b>03</b> Review test evidence</span><span><b>04</b> Investigate context</span>
            </aside>
          </div>
        </section>

        <section id="operations" className="ardi-v2-operations" aria-labelledby="operations-title">
          <div className="ardi-v2-shell">
            <div className="ardi-v2-section-head"><div><p className="ardi-v2-kicker"><span>01</span> SECURITY OPERATIONS</p><h2 id="operations-title">Choose what you need to do.</h2></div><p>Each route is a real product destination—not a label pretending to be a control.</p></div>
            <div className="ardi-v2-route-board">
              <div className="ardi-v2-cable ardi-v2-cable-one" /><div className="ardi-v2-cable ardi-v2-cable-two" />
              {securityRoutes.map((route) => { const Icon = route.icon; return <Link key={route.code} href={workspaceRoute(route.href)} className={`ardi-v2-route ardi-v2-route-${route.code}`}><span className="ardi-v2-route-index">{route.code} / {route.label}</span><Icon /><h3>{route.title}</h3><p>{route.body}</p><b>Open route <ArrowUpRight /></b></Link>; })}
            </div>
          </div>
        </section>

        <section id="intelligence" className="ardi-v2-intelligence" aria-labelledby="intelligence-title">
          <div className="ardi-v2-shell ardi-v2-intelligence-layout">
            <div className="ardi-v2-intel-copy"><p className="ardi-v2-kicker"><span>02</span> THREAT INTELLIGENCE</p><h2 id="intelligence-title">An investigation floor, not a static card.</h2><p>Malware, threat actors, vulnerabilities, and attack context belong in an operating view. The controls are visible here; records appear only when the source is connected.</p><div className="ardi-v2-intel-gesture"><img src="/ardi/ardi-idle.jpg" alt="ARDI presenting the threat-intelligence workspace" /><span>ARDI / INVESTIGATE</span></div></div>
            <div className="ardi-v2-intel-console" aria-label="Threat intelligence workbench preview">
              <div className="ardi-v2-intel-topbar"><span><Database /> OPENCTI / THREAT FLOOR</span><b><i /> SOURCE STATE: CONNECTION REQUIRED</b></div>
              <div className="ardi-v2-intel-workspace">
                <aside className="ardi-v2-intel-sidebar" aria-label="Intelligence entity views">
                  <small>INVESTIGATE</small>
                  {intelligenceViews.map((view) => { const Icon = view.icon; return <button key={view.id} type="button" onClick={() => setIntelView(view.id)} className={view.id === activeIntelView.id ? 'active' : ''} aria-pressed={view.id === activeIntelView.id}><Icon /><span>{view.label}</span></button>; })}
                  <Link href={workspaceRoute('/intelligence')}><BrainCircuit /> Open workspace</Link>
                </aside>
                <div className="ardi-v2-intel-main">
                  <div className="ardi-v2-intel-toolbar"><div><Search /> <span>Search connected intelligence</span></div><button type="button">Filter entities</button><Link href={workspaceRoute('/intelligence')} aria-label="Open full threat intelligence workspace"><ArrowUpRight /></Link></div>
                  <div className="ardi-v2-intel-context"><activeIntelView.icon /><div><small>ACTIVE VIEW / {activeIntelView.label.toUpperCase()}</small><p>{activeIntelView.description}</p></div></div>
                  <div className="ardi-v2-intel-table" role="region" aria-label="Threat-intelligence entity table" tabIndex={0}><table><caption className="sr-only">Threat-intelligence table shown when a source is configured</caption><thead><tr><th>Entity</th><th>Type</th><th>Labels</th><th>Relationships</th><th>Updated</th></tr></thead><tbody><tr><td colSpan={5}><div className="ardi-v2-intel-empty"><Radar /><div><b>Ready for connected intelligence.</b><span>No malware, attack, actor, or vulnerability record is inserted until OpenCTI provides it.</span></div><Link href={workspaceRoute('/intelligence')}>Open dashboard <ArrowRight /></Link></div></td></tr></tbody></table></div>
                  <div className="ardi-v2-intel-status" aria-live="polite"><span><i /> Entity lenses</span><span><i /> Relationship-ready table</span><span><i /> Real source records only</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="assistant" className="ardi-v2-assistant" aria-labelledby="assistant-title">
          <div className="ardi-v2-shell ardi-v2-assistant-layout">
            <div className="ardi-v2-assistant-figure"><video src="/ardi/media/ardi-assessment.mp4" poster="/ardi/media/ardi-security-lab-poster.png" autoPlay muted loop playsInline preload="metadata" aria-label="ARDI guiding an authorised security assessment" /><span className="ardi-v2-orbit ardi-v2-orbit-one" /><span className="ardi-v2-orbit ardi-v2-orbit-two" /><small>ARDI / GUIDE MODE</small></div>
            <div className="ardi-v2-assistant-copy"><p className="ardi-v2-kicker"><i /> ASSISTANT CONSOLE</p><h2 id="assistant-title">Talk to the mascot. Move into the work.</h2><p>ARDI is placed as an actual interface, not decoration. Open the chat here for guidance, then continue into the security route that fits the question.</p><div className="ardi-v2-assistant-actions"><button type="button" className="ardi-v2-button ardi-v2-button-primary" onClick={() => setArdiOpen(true)}>Open ARDI chat <ArrowRight /></button><Link href={workspaceRoute('/osint')} className="ardi-v2-text-action">Start a domain investigation <ArrowRight /></Link></div></div>
            <div className="ardi-v2-assistant-meta"><span>ROLE</span><b>GUIDE</b><span>CONTEXT</span><b>WORKSPACE</b><span>ROUTE</span><b>CHAT → ACTION</b></div>
          </div>
        </section>

        <section className="ardi-v2-capabilities" aria-labelledby="capabilities-title">
          <div className="ardi-v2-shell"><div className="ardi-v2-section-head ardi-v2-capability-head"><div><p className="ardi-v2-kicker"><span>03</span> SECURITY FLOOR</p><h2 id="capabilities-title">Different jobs. Different operating surfaces.</h2></div><p>Built for authorised security work: assess the target, work the evidence, investigate the context.</p></div>
            <div className="ardi-v2-capability-grid">
              <Link href={workspaceRoute('/scans')} className="ardi-v2-capability ardi-v2-capability-test"><ScanSearch /><p>ASSESSMENT</p><h3>Test the approved target.</h3><span>Open assessment runs <ArrowUpRight /></span></Link>
              <Link href={workspaceRoute('/findings')} className="ardi-v2-capability ardi-v2-capability-evidence"><FileSearch2 /><p>EVIDENCE</p><h3>Work what the test returns.</h3><span>Open findings <ArrowUpRight /></span></Link>
              <Link href={workspaceRoute('/intelligence')} className="ardi-v2-capability ardi-v2-capability-intel"><img src="/ardi/ardi-celebrating.jpg" alt="ARDI greeting users at the intelligence route" /><p>THREAT CONTEXT</p><h3>Connect intelligence to the investigation.</h3><span>Open OpenCTI workspace <ArrowUpRight /></span></Link>
            </div>
          </div>
        </section>

        <section className="ardi-v2-access" aria-labelledby="access-title"><div className="ardi-v2-shell ardi-v2-access-layout"><div><p className="ardi-v2-kicker"><span>04</span> START THE WORKSPACE</p><h2 id="access-title">Make the first authorised route.</h2><p>Open a workspace, identify the systems in scope, and use the security routes that suit the work in front of you.</p></div><div className="ardi-v2-access-console"><div><span>WORKSPACE ACCESS</span><i /> <span>SECURITY LAB</span></div><b>Scope first. Then assess.</b><p>Use the product to organise real work—not a dashboard full of fake activity.</p><Link href="/register" className="ardi-v2-button ardi-v2-button-primary">Create a workspace <ArrowRight /></Link><Link href="/login" className="ardi-v2-console-signin">Already registered? Sign in <ArrowRight /></Link></div></div></section>
      </main>

      <ArdiPanel open={ardiOpen} onClose={() => setArdiOpen(false)} authenticated={hasWorkspace} context="The visitor is on the Ardi Sec Live Lab public page." />
      <footer className="ardi-v2-footer"><div className="ardi-v2-shell ardi-v2-footer-grid"><div><Link href="/" className="ardi-v2-brand"><ArdiMark /><span><b>ARDI SEC</b><small>AUTHORISED SECURITY LAB</small></span></Link><p>Penetration testing, evidence, intelligence, and research routes for approved security work.</p></div><div className="ardi-v2-footer-links"><nav aria-label="Product links"><a href="#operations">Operations</a><a href="#intelligence">Threat intelligence</a><a href="#assistant">Talk to ARDI</a><Link href="/login">Sign in</Link></nav><nav aria-label="Legal and support links"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/faq">FAQs</Link></nav></div><p>Authorised use only.<br />© {new Date().getFullYear()} Ardi Sec.</p></div></footer>
    </div>
  );
}
