import { useEffect, useRef } from 'react';

/*
  Mounts one of taste-skill's dealt moments on the element the returned ref is attached to.

  The kit's loader and moments live, unchanged, in public/assets/moments/ (copied from the skill).
  Its own auto-scan runs once on page load, which a single-page app outlives, so the scan is switched
  off (window.__momentsManual) and each moment is mounted here, per element, with the loader's mount().
  Every moment shows its finished state under reduced motion, and when its files fail to load.

  The element keeps data-moment="<id>" (and data-moment-opts) in its markup, as the kit expects.
*/
let loader = null;
function load() {
  if (!loader) {
    window.__momentsManual = true;
    const url = new URL(`${import.meta.env.BASE_URL}assets/moments/moments.js`, window.location.origin).href;
    loader = import(/* @vite-ignore */ url);
  }
  return loader;
}

function showFinished(el) {
  el.classList.add('mo-safe', 'is-done');
}

export default function useMoment() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    load()
      .then((m) => {
        if (!cancelled) m.mount(el).catch(() => showFinished(el));
      })
      .catch(() => showFinished(el));
    return () => {
      cancelled = true;
      // the moment's listeners and observers go with the element
      el.__momentP?.then((api) => api?.destroy?.()).catch(() => {});
    };
  }, []);

  return ref;
}
