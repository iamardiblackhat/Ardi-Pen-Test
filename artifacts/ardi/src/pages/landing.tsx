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
  ArrowRight, ArrowUpRight, FileSearch2, Menu, Pause, Play,
  ScanSearch, Search, Target, X,
} from 'lucide-react';
import { ArdiPanel } from '@/components/ardi-panel';
import { auth } from '@/lib/auth';
import './landing-live-lab.css';

const securityRoutes = [
  { code: '01', label: 'Scope', title: 'Map the estate', body: 'Put approved systems in one place before technical work begins.', href: '/assets', icon: Target },
  { code: '02', label: 'Assess', title: 'Run a test', body: 'Create and follow a controlled assessment against an approved asset.', href: '/scans', icon: ScanSearch },
  { code: '03', label: 'Evidence', title: 'Work findings', body: 'Review the evidence returned by the workspace and take the next action.', href: '/findings', icon: FileSearch2 },
  { code: '04', label: 'Research', title: 'Investigate', body: 'Use source-backed domain research to shape the next question.', href: '/osint', icon: Search },
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
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const hasWorkspace = auth.isAuthenticated();
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
            <a href="#assistant" className="ardi-v2-header-start">Talk to ARDI <ArrowUpRight /></a>
            <button type="button" className="ardi-v2-menu" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen}>{menuOpen ? <X /> : <Menu />}</button>
          </div>
        </div>
        {menuOpen && <nav className="ardi-v2-mobile-nav" aria-label="Mobile navigation"><div className="ardi-v2-shell">
          <a href="#operations" onClick={closeMenu}>Security operations <ArrowRight /></a>
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
              <p className="ardi-v2-hero-lead">A practical security workspace for authorised testing, evidence, and source-backed domain research.</p>
              <div className="ardi-v2-hero-actions">
                <a href="#assistant" className="ardi-v2-button ardi-v2-button-primary">Talk to ARDI free <ArrowRight /></a>
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

        <section id="assistant" className="ardi-v2-assistant" aria-labelledby="assistant-title">
          <div className="ardi-v2-shell ardi-v2-assistant-layout">
            <div className="ardi-v2-assistant-figure"><video src="/ardi/media/ardi-assessment.mp4" poster="/ardi/media/ardi-security-lab-poster.png" autoPlay muted loop playsInline preload="metadata" aria-label="ARDI guiding an authorised security assessment" /><span className="ardi-v2-orbit ardi-v2-orbit-one" /><span className="ardi-v2-orbit ardi-v2-orbit-two" /><small>ARDI / GUIDE MODE</small></div>
            <div className="ardi-v2-assistant-copy"><p className="ardi-v2-kicker"><i /> ASSISTANT CONSOLE</p><h2 id="assistant-title">Talk to the mascot. Move into the work.</h2><p>ARDI chat is available from the public site without an account. Use it for guidance, then create a workspace when you need to save authorised testing work.</p><div className="ardi-v2-assistant-actions"><button type="button" className="ardi-v2-button ardi-v2-button-primary" onClick={() => setArdiOpen(true)}>Open ARDI chat <ArrowRight /></button><Link href={workspaceRoute('/osint')} className="ardi-v2-text-action">Start domain research <ArrowRight /></Link></div></div>
            <div className="ardi-v2-assistant-meta"><span>ROLE</span><b>GUIDE</b><span>CONTEXT</span><b>WORKSPACE</b><span>ROUTE</span><b>CHAT → ACTION</b></div>
          </div>
        </section>

        <section className="ardi-v2-capabilities" aria-labelledby="capabilities-title">
          <div className="ardi-v2-shell"><div className="ardi-v2-section-head ardi-v2-capability-head"><div><p className="ardi-v2-kicker"><span>03</span> SECURITY FLOOR</p><h2 id="capabilities-title">Different jobs. Different operating surfaces.</h2></div><p>Built for authorised security work: assess the target, work the evidence, investigate the context.</p></div>
            <div className="ardi-v2-capability-grid">
              <Link href={workspaceRoute('/scans')} className="ardi-v2-capability ardi-v2-capability-test"><ScanSearch /><p>ASSESSMENT</p><h3>Test the approved target.</h3><span>Open assessment runs <ArrowUpRight /></span></Link>
              <Link href={workspaceRoute('/findings')} className="ardi-v2-capability ardi-v2-capability-evidence"><FileSearch2 /><p>EVIDENCE</p><h3>Work what the test returns.</h3><span>Open findings <ArrowUpRight /></span></Link>
              <Link href={workspaceRoute('/osint')} className="ardi-v2-capability ardi-v2-capability-intel"><img src="/ardi/ardi-celebrating.jpg" alt="ARDI greeting users at the research route" /><p>RESEARCH</p><h3>Investigate a public domain.</h3><span>Open domain research <ArrowUpRight /></span></Link>
            </div>
          </div>
        </section>

        <section className="ardi-v2-access" aria-labelledby="access-title"><div className="ardi-v2-shell ardi-v2-access-layout"><div><p className="ardi-v2-kicker"><span>04</span> FREE PUBLIC ACCESS</p><h2 id="access-title">Ask ARDI first. Create a workspace when ready.</h2><p>ARDI chat is available without an account. A workspace is only required to save authorised scopes, tests, evidence, and source-backed research.</p></div><div className="ardi-v2-access-console"><div><span>NO ARDI ACCOUNT</span><i /> <span>ARDI CHAT</span></div><b>Use the assistant now.</b><p>Ask ARDI a question before registering.</p><button type="button" className="ardi-v2-button ardi-v2-button-primary" onClick={() => setArdiOpen(true)}>Talk to ARDI <ArrowRight /></button><Link href="/register" className="ardi-v2-console-signin">Create an ARDI workspace <ArrowRight /></Link><Link href="/login" className="ardi-v2-console-signin">Already registered? Sign in <ArrowRight /></Link></div></div></section>
      </main>

      <ArdiPanel open={ardiOpen} onClose={() => setArdiOpen(false)} authenticated={hasWorkspace} context="The visitor is on the Ardi Sec Live Lab public page." />
      <footer className="ardi-v2-footer"><div className="ardi-v2-shell ardi-v2-footer-grid"><div><Link href="/" className="ardi-v2-brand"><ArdiMark /><span><b>ARDI SEC</b><small>AUTHORISED SECURITY LAB</small></span></Link><p>Penetration testing, evidence, and source-backed research routes for approved security work.</p></div><div className="ardi-v2-footer-links"><nav aria-label="Product links"><a href="#operations">Operations</a><a href="#assistant">Talk to ARDI</a><Link href="/login">Sign in</Link></nav><nav aria-label="Legal and support links"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/faq">FAQs</Link></nav></div><p>Authorised use only.<br />© {new Date().getFullYear()} Ardi Sec.</p></div></footer>
    </div>
  );
}
