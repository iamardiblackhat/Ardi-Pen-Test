import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

/**
 * ARDI — the real character art, one render per emotional state.
 *
 * Art lives in `public/ardi/`. Each vertical (cyber, beauty, property…) ships
 * its own render set at the same paths; the component is shared.
 */

export type ArdiMood = 'idle' | 'working' | 'celebrating' | 'concerned';

const ART: Record<ArdiMood, string> = {
  idle: '/ardi/ardi-idle.jpg',
  working: '/ardi/ardi-working.jpg',
  celebrating: '/ardi/ardi-celebrating.jpg',
  // No dedicated render yet — the arms-crossed guard pose reads closest.
  concerned: '/ardi/ardi-working.jpg',
};

export function ArdiAvatar({
  mood = 'idle',
  size = 40,
  className = '',
}: {
  mood?: ArdiMood;
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div
      className={`relative flex-shrink-0 overflow-hidden rounded-full bg-background ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`ARDI is ${mood}`}
    >
      {/* Glow ring, brightest while he is actually doing something. */}
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-full z-10"
        style={{ boxShadow: '0 0 12px 1px hsl(var(--ardi-neon) / 0.55)' }}
        animate={
          reduce || mood === 'idle'
            ? { opacity: 0.35 }
            : { opacity: mood === 'working' ? [0.3, 0.9, 0.3] : [0.5, 1, 0.5] }
        }
        transition={{ duration: mood === 'working' ? 1.6 : 0.6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <AnimatePresence mode="wait">
        <motion.img
          key={mood}
          src={ART[mood]}
          alt=""
          draggable={false}
          className="h-full w-full object-cover mix-blend-screen"
          // The renders are shot on flat black, not transparent. Screen-blend
          // against the container's own background so that baked-in black
          // drops out and shows whatever is actually behind him — matching
          // the surface he's placed on, whatever theme that surface is —
          // instead of carrying his own visibly mismatched black backdrop.
          // Anchor scale at the top edge, not center: the old center-anchor
          // zoomed into his chest logo and cropped the head off.
          style={{ transformOrigin: '50% 0%' }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.3 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 2.6 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        />
      </AnimatePresence>
    </div>
  );
}

/** Full-body ARDI for empty states and onboarding, where there is room for him. */
export function ArdiFull({ mood = 'idle', size = 200 }: { mood?: ArdiMood; size?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative inline-block bg-ardi-surface" style={{ width: size, height: size }}>
      <motion.img
        key={mood}
        src={ART[mood]}
        alt={`ARDI is ${mood}`}
        draggable={false}
        width={size}
        height={size}
        className="select-none mix-blend-screen"
        style={{ filter: 'drop-shadow(0 0 24px hsl(var(--ardi-neon) / 0.35))' }}
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
