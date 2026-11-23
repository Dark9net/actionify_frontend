/*
  An in-page link that glides to its section (the browser's own jump under reduced motion),
  without making every scroll on the page smooth: keyboard focus still jumps where it lands.
    <a href="#book" onClick={glideTo}>…</a>
*/
export function glideTo(e) {
  const id = e.currentTarget.getAttribute('href')?.replace(/^#/, '');
  const target = id && document.getElementById(id);
  if (!target) return;
  e.preventDefault();
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
}
