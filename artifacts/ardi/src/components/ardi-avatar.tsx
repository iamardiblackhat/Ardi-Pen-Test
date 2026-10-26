import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
export type ArdiMood = "idle" | "working" | "celebrating" | "concerned";
const image = "/ardi/ardi-sec-glass-640.webp";
export function ArdiAvatar({
  mood = "idle",
  size = 40,
  className = "",
}: {
  mood?: ArdiMood;
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={`ardi-character-avatar relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`ARDI is ${mood}`}
    >
      <img
        src={image}
        alt=""
        width={640}
        height={835}
        className="h-full w-full object-contain"
        draggable={false}
      />
    </div>
  );
}
export function ArdiFull({
  mood = "idle",
  size = 200,
}: {
  mood?: ArdiMood;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null),
    visible = useInView(ref),
    reduce = useReducedMotion();
  return (
    <div
      ref={ref}
      className="ardi-character-full"
      style={{ width: size, maxWidth: "100%", aspectRatio: "640 / 835" }}
    >
      <motion.img
        src={image}
        srcSet="/ardi/ardi-sec-glass-320.webp 320w, /ardi/ardi-sec-glass-640.webp 640w, /ardi/ardi-sec-glass-960.webp 960w"
        sizes={`${size}px`}
        alt={`ARDI Sec glass mascot${mood === "working" ? ", working" : ""}`}
        width={640}
        height={835}
        draggable={false}
        className="h-full w-full object-contain"
        animate={!reduce && visible ? { y: [0, -5, 0] } : { y: 0 }}
        transition={{
          duration: 4,
          repeat: !reduce && visible ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
