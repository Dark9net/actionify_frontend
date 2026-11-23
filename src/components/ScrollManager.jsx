import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/*
  A new page starts at its top. A link with an #anchor (a services link to /our-work?show=…#gallery,
  /our-details#kit) starts there too, then glides down to its section, so the reader sees where they
  landed; on the same page it glides from where they are. Under reduced motion it simply jumps.
  Back and forward are left alone, so the browser can put the reader where they were, and so are
  replaced entries (the Our Work filters rewrite the address without moving the page).
*/
export default function ScrollManager() {
  const { pathname, search, hash } = useLocation();
  const type = useNavigationType();
  const lastPath = useRef(pathname);

  useEffect(() => {
    const newPage = lastPath.current !== pathname;
    lastPath.current = pathname;
    if (type !== 'PUSH') return;

    const target = hash && document.getElementById(hash.slice(1));
    if (!target) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
      return;
    }
    if (newPage) window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // two frames: the new page is laid out and painted at its top before the glide begins
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, search, hash, type]);

  return null;
}
