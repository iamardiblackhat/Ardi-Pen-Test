import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function SecurityAssistantSection({
  onOpenAssistant,
}: {
  onOpenAssistant: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reduceMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { threshold: 0.3 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <section
      id="assistant"
      className="ardi-v2-assistant"
      aria-labelledby="assistant-title"
    >
      <div className="ardi-v2-shell ardi-v2-assistant-layout">
        <div className="ardi-v2-assistant-figure">
          <video
            ref={videoRef}
            src="/ardi/media/ardi-assessment.mp4"
            poster="/ardi/media/ardi-security-hero-poster.png"
            autoPlay={!reduceMotion}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="ARDI supporting an authorised security assessment"
          />
          <span className="ardi-v2-orbit ardi-v2-orbit-one" />
          <span className="ardi-v2-orbit ardi-v2-orbit-two" />
          <small>ASK ARDI</small>
        </div>
        <div className="ardi-v2-assistant-copy">
          <p className="ardi-v2-kicker">
            <i /> SITE-WIDE ASSISTANT
          </p>
          <h2 id="assistant-title">Tell ARDI what you want to do.</h2>
          <p>
            Ask ARDI to research a company, look up a website, search known
            threats, or explain your test results. Once signed in, you can also
            ask it to prepare a security test or create a report.
          </p>
          <div className="ardi-v2-assistant-actions">
            <button
              type="button"
              className="ardi-v2-button ardi-v2-button-primary"
              onClick={onOpenAssistant}
            >
              Talk to ARDI <ArrowRight />
            </button>
          </div>
        </div>
        <div className="ardi-v2-assistant-meta">
          <span>ACCESS</span>
          <b>SITE-WIDE</b>
          <span>DATA</span>
          <b>YOUR ACCOUNT</b>
          <span>TESTS & REPORTS</span>
          <b>CONFIRMED</b>
        </div>
      </div>
    </section>
  );
}
