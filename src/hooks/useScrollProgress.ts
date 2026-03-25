import { type RefObject, useEffect, useRef, useState } from 'react';

/**
 * Sleduje scroll progress kontejneru (0–1).
 * 0 = kontejner je pod viewportem, 1 = kontejner je nad viewportem.
 */
export function useScrollProgress(containerRef: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const el = containerRef.current;
        if (!el) {
          rafRef.current = 0;
          return;
        }
        const rect = el.getBoundingClientRect();
        const windowH = window.innerHeight;
        const scrolled = -rect.top;
        const scrollable = rect.height - windowH;
        if (scrollable <= 0) {
          rafRef.current = 0;
          return;
        }
        const p = Math.max(0, Math.min(1, scrolled / scrollable));
        setProgress(p);
        rafRef.current = 0;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef]);

  return progress;
}
