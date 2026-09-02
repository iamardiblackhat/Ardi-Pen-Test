import { useEffect, useState } from 'react';
import { primaryNavigation } from '@/features/security-home/security-home-content';

export function useActiveSecuritySection() {
  const [activeSection, setActiveSection] = useState<string>(primaryNavigation[0].id);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: '-18% 0px -58%', threshold: [0.1, 0.35, 0.6] },
    );

    primaryNavigation.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return { activeSection, setActiveSection };
}
