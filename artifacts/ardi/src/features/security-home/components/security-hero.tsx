import { ArrowRight, Pause, Play } from 'lucide-react';
import { Link } from 'wouter';
import { heroScenes } from '@/features/security-home/security-home-content';
import { routes } from '@/shared/config/routes';

type Props = {
  activeIndex: number;
  activeScene: (typeof heroScenes)[number];
  isPlaying: boolean;
  onAdvance: () => void;
  onOpenAssistant: () => void;
  onSelect: (index: number) => void;
  onToggle: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
};

export function SecurityHero(props: Props) {
  return (
    <section className="ardi-v2-hero" aria-labelledby="ardi-hero-title">
      <div className="ardi-v2-hero-media" aria-hidden="true">
        <video
          key={props.activeScene.id}
          ref={props.videoRef}
          id="ardi-v2-hero-video"
          src={props.activeScene.src}
          poster={props.activeScene.poster}
          autoPlay={props.isPlaying}
          muted
          playsInline
          preload="metadata"
          onEnded={props.onAdvance}
        />
        <div className="ardi-v2-hero-grid" /><div className="ardi-v2-hero-fade" />
      </div>
      <div className="ardi-v2-shell ardi-v2-hero-content">
        <div className="ardi-v2-hero-copy">
          <p className="ardi-v2-kicker"><i /> ARDI SEC / AUTHORISED PEN TESTING</p>
          <h1 id="ardi-hero-title">Scope it.<br />Run the test.<br /><em>See the proof.</em></h1>
          <p className="ardi-v2-hero-lead">Pen Testing, evidence, OSINT, MITRE context, reports, and ARDI-assisted security work in one operating surface.</p>
          <div className="ardi-v2-hero-actions">
            <Link href={routes.scans} className="ardi-v2-button ardi-v2-button-primary">Start Pen Test <ArrowRight /></Link>
            <button type="button" className="ardi-v2-button ardi-v2-button-chat" onClick={props.onOpenAssistant}>Execute with ARDI <ArrowRight /></button>
            <button type="button" className="ardi-v2-video-button" onClick={props.onToggle} aria-controls="ardi-v2-hero-scenes" aria-pressed={props.isPlaying}>
              {props.isPlaying ? <Pause /> : <Play />} {props.isPlaying ? 'Pause scenes' : 'Play scenes'}
            </button>
          </div>
          <div id="ardi-v2-hero-scenes" className="ardi-v2-hero-scenes" aria-label="ARDI security scenes">
            {heroScenes.map((scene, index) => (
              <button key={scene.id} type="button" aria-pressed={index === props.activeIndex} className={index === props.activeIndex ? 'active' : ''} onClick={() => props.onSelect(index)}>
                <span>0{index + 1}</span><b>{scene.label}</b><small>{scene.detail}</small>
              </button>
            ))}
          </div>
        </div>
        <aside className="ardi-v2-hero-rail" aria-label="Authorised Pen Test workflow">
          <strong>How an authorised Pen Test runs</strong>
          <span><b>01</b> Confirm scope</span><span><b>02</b> Start assessment</span><span><b>03</b> Review evidence</span><span><b>04</b> Report action</span>
        </aside>
      </div>
    </section>
  );
}

