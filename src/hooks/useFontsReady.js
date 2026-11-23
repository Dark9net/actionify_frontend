import { useEffect, useState } from 'react';

/* Resolves once the display faces are in (capped), so letters never animate in a fallback face. */
export default function useFontsReady(cap = 1400) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => alive && setReady(true);
    const timer = setTimeout(done, cap);
    Promise.all([
      document.fonts.load('500 10px "Jost Variable"'),
      document.fonts.load('600 10px "Inter Variable"'),
      document.fonts.load('400 10px "IBM Plex Mono"'),
    ])
      .then(() => document.fonts.ready)
      .then(done, done);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [cap]);
  return ready;
}
