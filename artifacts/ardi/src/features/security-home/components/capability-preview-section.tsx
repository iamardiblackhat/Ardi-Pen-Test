import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { publicCapabilities } from "@/features/capabilities/capability-content";
import { routes } from "@/shared/config/routes";

// Abstract capability diagrams are illustrations, not fabricated investigation data.
function CapabilityDiagram({ index }: { index: number }) {
  const nodes = Array.from({ length: index + 5 }, (_, i) => {
    const angle = (i / (index + 5)) * Math.PI * 2;
    return { x: 160 + Math.cos(angle) * (index % 2 ? 108 : 88), y: 75 + Math.sin(angle) * 58 };
  });
  return <svg viewBox="0 0 320 150" fill="none" aria-hidden="true">
    <ellipse cx="160" cy="75" rx="125" ry="60" stroke="currentColor" opacity=".18" />
    <ellipse cx="160" cy="75" rx="100" ry="42" stroke="currentColor" opacity=".3" transform={`rotate(${index * 19} 160 75)`} />
    {nodes.map((n, i) => <g key={i}>
      <path d={`M160 75 L${n.x} ${n.y}`} stroke="currentColor" opacity=".4" strokeDasharray={index % 3 === 0 ? '3 5' : undefined} />
      {index % 2 === 0 && <path d={`M${n.x} ${n.y} L${nodes[(i + 1) % nodes.length].x} ${nodes[(i + 1) % nodes.length].y}`} stroke="currentColor" opacity=".25" />}
      <circle cx={n.x} cy={n.y} r={i % 2 ? 5 : 8} stroke="currentColor" fill="#171232" />
      <circle cx={n.x} cy={n.y} r="2" fill="currentColor" />
    </g>)}
  </svg>;
}

export function CapabilityPreviewSection() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const count = publicCapabilities.length;
  const move = (step: number) => setActive(i => (i + step + count) % count);
  return <section id="capability-preview" className="ardi-v2-operations" aria-labelledby="capability-preview-title">
    <div className="ardi-v2-shell">
      <div className="ardi-v2-section-head">
        <div><h2 id="capability-preview-title">Follow the question.<br />Find the right capability.</h2></div>
        <p>Choose what you want to investigate, assess or understand. Each capability leads to its own workflow.</p>
      </div>
      <div className="ardi-capability-tour" role="region" aria-roledescription="carousel" aria-label="Security capabilities" tabIndex={0}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
        }}>
        <div className="ardi-capability-stack">
          {publicCapabilities.map((item, i) => {
            let offset = (i - active + count) % count;
            if (offset > count / 2) offset -= count;
            const selected = offset === 0;
            const Icon = item.icon;
            return <motion.article key={item.id} className="ardi-capability-slide" data-active={selected}
              aria-label={`${i + 1} of ${count}: ${item.label}`} aria-roledescription="slide"
              aria-hidden={!selected} inert={!selected ? true : undefined}
              initial={false}
              animate={{ x: `calc(-50% + ${offset * 34}%)`, y: Math.abs(offset) * 18, scale: 1 - Math.abs(offset) * .12, rotateY: offset * -12, rotateZ: offset * 2, opacity: Math.abs(offset) > 2 ? 0 : selected ? 1 : .65 }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 210, damping: 28 }}
              style={{ zIndex: count - Math.abs(offset), pointerEvents: selected ? 'auto' : 'none' }}
              drag={selected && !reduce ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.18}
              onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 45 || Math.abs(info.velocity.x) > 400) move(info.offset.x < 0 ? 1 : -1); }}>
              <div className="ardi-capability-art"><CapabilityDiagram index={i} /><Icon aria-hidden="true" /></div>
              <h3>{item.label}</h3><p>{item.summary}</p>
              <Link className="ardi-v2-button ardi-v2-button-primary" draggable={false} href={`${routes.capabilities}#${item.id}`}>Explore this capability <ArrowRight /></Link>
            </motion.article>;
          })}
        </div>
        <div className="ardi-capability-controls">
          <button type="button" aria-label="Previous capability" onClick={() => move(-1)}><ArrowLeft /></button>
          <p role="status" aria-live="polite">{active + 1} of {count}</p>
          <button type="button" aria-label="Next capability" onClick={() => move(1)}><ArrowRight /></button>
        </div>
        <div className="ardi-capability-options" role="group" aria-label="Choose a capability">
          {publicCapabilities.map((c, i) => <button type="button" key={c.id} onClick={() => setActive(i)} aria-pressed={i === active}>{c.label}</button>)}
        </div>
      </div>
    </div>
  </section>;
}
