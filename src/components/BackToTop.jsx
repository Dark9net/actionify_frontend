import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/back-to-top.css';

/*
  "Back to top": a round button at the bottom right that comes in once the reader reaches the foot of
  the page (the footer mostly on screen) and goes again as they scroll back up. Its ring draws itself
  round over that last stretch and closes at the very end, so it reads as "you are at the end". A click glides to the top (the browser's
  own jump under reduced motion) and hands keyboard focus back to the start of the page.
*/
const R = 22;
const C = 2 * Math.PI * R;

export default function BackToTop() {
  const [shown, setShown] = useState(false);
  const ringRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const doc = document.documentElement;
      const vh = window.innerHeight;
      const max = doc.scrollHeight - vh;
      const y = window.scrollY;
      // only on pages long enough to need it, and only in the last stretch: within 40% of a screen of the end
      const stretch = vh * 0.4;
      const left = max - y;
      setShown(max > vh * 1.2 && left < stretch);
      // the ring goes round over that stretch and closes as the scroll runs out
      const t = Math.min(1, Math.max(0, 1 - left / stretch));
      if (ringRef.current) ringRef.current.style.strokeDashoffset = (C * (1 - t)).toFixed(2);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    // a new page may still be growing as its pictures load
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    // keyboard and screen-reader users continue from the start of the page, not from the footer
    const main = document.getElementById('main');
    if (main) {
      if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
    }
  };

  return (
    <button
      type="button"
      className={`to-top${shown ? ' is-shown' : ''}`}
      onClick={toTop}
      aria-label="Back to top"
      tabIndex={shown ? 0 : -1}
      aria-hidden={!shown}
    >
      <svg className="to-top-ring" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r={R} />
        <circle ref={ringRef} className="to-top-fill" cx="24" cy="24" r={R} strokeDasharray={C.toFixed(2)} strokeDashoffset={C.toFixed(2)} />
      </svg>
      <span className="to-top-arrow" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="M8 13.5V3M3.5 7.5L8 3l4.5 4.5" />
        </svg>
        <svg viewBox="0 0 16 16">
          <path d="M8 13.5V3M3.5 7.5L8 3l4.5 4.5" />
        </svg>
      </span>
      <span className="to-top-tip" aria-hidden="true">
        Top
      </span>
    </button>
  );
}
