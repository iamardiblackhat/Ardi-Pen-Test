import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { heroScenes } from '@/features/security-home/security-home-content';

export function useHeroCarousel() {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(!reduceMotion);

  const activeScene = heroScenes[activeIndex];

  useEffect(() => {
    if (reduceMotion) {
      videoRef.current?.pause();
      setIsPlaying(false);
      return;
    }
    if (isPlaying) void videoRef.current?.play().catch(() => setIsPlaying(false));
  }, [activeIndex, isPlaying, reduceMotion]);

  const advance = () => {
    setActiveIndex((current) => (current + 1) % heroScenes.length);
  };

  const select = (index: number) => {
    setActiveIndex(index);
    setIsPlaying(!reduceMotion);
  };

  const toggle = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (next) void videoRef.current?.play().catch(() => setIsPlaying(false));
    else videoRef.current?.pause();
  };

  return { activeIndex, activeScene, advance, isPlaying, select, toggle, videoRef };
}

