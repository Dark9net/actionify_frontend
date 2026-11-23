import { useEffect, useRef } from 'react';

/*
  Writes how far the page has scrolled through an element as `--p` (0 to 1) on that element, once per
  frame while scrolling. With `pinned`, 0 is when its top reaches the top of the screen and 1 when its
  bottom reaches the bottom (a tall track with a sticky stage inside); otherwise 0 is when its top
  enters at the bottom of the screen and 1 when its bottom leaves at the top.
  Under reduced motion it stays at 1, the finished state.
*/
export default function useScrollProgress({ pinned = false } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--p', '1');
      return;
    }
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = pinned ? -r.top / Math.max(1, r.height - vh) : (vh - r.top) / (r.height + vh);
      el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pinned]);
  return ref;
}
