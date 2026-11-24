import { RefObject, useEffect, useState } from 'react';

export const clamp = (n: number, min = 0, max = 1) => Math.min(max, Math.max(min, n));

/**
 * How far the page has scrolled through a tall "track" element whose child is pinned with `sticky`:
 * 0 when the track's top reaches the top of the screen, 1 when its bottom reaches the bottom.
 */
export const useScrollProgress = (trackRef: RefObject<HTMLElement>) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = trackRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      setProgress(travel > 0 ? clamp(-r.top / travel) : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [trackRef]);

  return progress;
};

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
