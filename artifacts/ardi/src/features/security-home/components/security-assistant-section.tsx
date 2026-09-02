import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function SecurityAssistantSection({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    }, { threshold: 0.3 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <section id="assistant" className="ardi-v2-assistant" aria-labelledby="assistant-title">
      <div className="ardi-v2-shell ardi-v2-assistant-layout">
        <div className="ardi-v2-assistant-figure">
          <video ref={videoRef} src="/ardi/media/ardi-assessment.mp4" poster="/ardi/media/ardi-security-hero-poster.png" autoPlay={!reduceMotion} muted loop playsInline preload="metadata" aria-label="ARDI supporting an authorised security assessment" />
          <span className="ardi-v2-orbit ardi-v2-orbit-one" /><span className="ardi-v2-orbit ardi-v2-orbit-two" /><small>ARDI / COMMAND MODE</small>
        </div>
        <div className="ardi-v2-assistant-copy">
          <p className="ardi-v2-kicker"><i /> SITE-WIDE ASSISTANT</p>
          <h2 id="assistant-title">Ask, navigate, and execute from ARDI.</h2>
          <p>ARDI can inspect authenticated assets, scans, and findings, route users across the complete product, and start a confirmed Pen Test against an already authorised target.</p>
          <div className="ardi-v2-assistant-actions"><button type="button" className="ardi-v2-button ardi-v2-button-primary" onClick={onOpenAssistant}>Open ARDI command <ArrowRight /></button></div>
        </div>
        <div className="ardi-v2-assistant-meta"><span>ACCESS</span><b>SITE-WIDE</b><span>DATA</span><b>USER-SCOPED</b><span>EXECUTION</span><b>CONFIRMED</b></div>
      </div>
    </section>
  );
}
