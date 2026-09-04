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
          <p className="ardi-v2-kicker"><i /> ARDI SEC / SECURITY OPERATIONS</p>
          <h1 id="ardi-hero-title">Find the signal.<br />Run the work.<br /><em>See the proof.</em></h1>
          <p className="ardi-v2-hero-lead">Investigate people, organisations, domains, incidents, and threats from current public evidence. Test authorised systems and turn verified findings into action.</p>
          <div className="ardi-v2-hero-actions">
            <Link href={routes.capabilities} className="ardi-v2-button ardi-v2-button-primary">Explore capabilities <ArrowRight /></Link>
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
        <aside className="ardi-v2-hero-rail" aria-label="ARDI security operation workflow">
          <strong>How ARDI turns a question into action</strong>
          <span><b>01</b> Choose the outcome</span><span><b>02</b> Investigate the evidence</span><span><b>03</b> Run approved checks</span><span><b>04</b> Produce the result</span>
        </aside>
      </div>
    </section>
  );
}
