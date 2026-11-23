import { useEffect, useRef } from 'react';

/*
  Drag to select: press the mouse anywhere over the photographs (or the space round them) and drag; a
  rectangle of frosted glass follows the cursor and every photo it touches is picked. Shift, Ctrl or
  Cmd keeps what was picked before and adds to it. Near the top or the bottom of the screen the page
  scrolls on its own, so a long gallery can be swept in one go. Escape puts the selection back.

  A press that does not travel (under 6px) is an ordinary click. Touch and pen scroll as usual: they
  pick photos with the round tick on each one (the single-pointer way, which the mouse has too).

  areaRef: where a drag may start. tileSelector: the photos, each with data-id.
  getSelection() → the Set picked now. onPreview(Set) while dragging, onCommit(Set) at the end.
  boxRef: the rectangle (position:fixed) to move. ignore: a selector of places a drag may not start.
*/
export default function useMarquee({ areaRef, boxRef, tileSelector, ignore, getSelection, onPreview, onCommit, onCancel, enabled = true }) {
  const live = useRef({});
  live.current = { getSelection, onPreview, onCommit, onCancel };

  useEffect(() => {
    const area = areaRef.current;
    if (!area || !enabled) return;

    let start = null; // { x, y } in page coordinates
    let pointer = null; // { x, y } on screen
    let active = false;
    let base = new Set();
    let before = new Set();
    let raf = 0;
    let lastKey = '';
    let last = null; // the set picked by the latest frame (kept here: live.current is replaced on every render)

    const box = () => boxRef.current;

    function rect() {
      const x2 = pointer.x + window.scrollX;
      const y2 = pointer.y + window.scrollY;
      return {
        left: Math.min(start.x, x2),
        top: Math.min(start.y, y2),
        right: Math.max(start.x, x2),
        bottom: Math.max(start.y, y2),
      };
    }

    function frame() {
      raf = 0;
      if (!active) return;

      // close to an edge of the screen: scroll, faster the closer it is
      const edge = 90;
      const vh = window.innerHeight;
      let by = 0;
      if (pointer.y < edge) by = -Math.ceil((edge - pointer.y) / 5);
      else if (pointer.y > vh - edge) by = Math.ceil((pointer.y - (vh - edge)) / 5);
      if (by) window.scrollBy(0, by);

      const r = rect();
      const b = box();
      if (b) {
        b.style.transform = `translate(${r.left - window.scrollX}px, ${r.top - window.scrollY}px)`;
        b.style.width = `${r.right - r.left}px`;
        b.style.height = `${r.bottom - r.top}px`;
      }

      // which photos the rectangle touches
      const next = new Set(base);
      const sx = window.scrollX;
      const sy = window.scrollY;
      area.querySelectorAll(tileSelector).forEach((el) => {
        const t = el.getBoundingClientRect();
        const hit = t.right + sx > r.left && t.left + sx < r.right && t.bottom + sy > r.top && t.top + sy < r.bottom;
        if (hit) next.add(el.dataset.id);
      });
      const key = [...next].sort().join('|');
      if (key !== lastKey) {
        lastKey = key;
        const n = b?.querySelector('[data-n]');
        if (n) n.textContent = String(next.size);
        live.current.onPreview(next);
      }
      last = next;

      if (by) raf = requestAnimationFrame(frame);
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    function begin() {
      active = true;
      document.documentElement.classList.add('is-marquee');
      const b = box();
      if (b) b.hidden = false;
      // the browser's own text selection would fight the rectangle
      window.getSelection()?.removeAllRanges();
    }

    function finish(commit) {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      if (active) {
        document.documentElement.classList.remove('is-marquee');
        const b = box();
        if (b) b.hidden = true;
        if (commit) {
          live.current.onCommit(last || base);
          // the click that ends a drag must not open the photo under it
          const stop = (e) => {
            e.stopPropagation();
            e.preventDefault();
          };
          window.addEventListener('click', stop, { capture: true, once: true });
          setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0);
        } else {
          live.current.onCancel(before);
        }
      }
      active = false;
      start = null;
      lastKey = '';
      last = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancelPointer);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', schedule);
    }

    function onMove(e) {
      pointer = { x: e.clientX, y: e.clientY };
      if (!active) {
        const dx = e.clientX + window.scrollX - start.x;
        const dy = e.clientY + window.scrollY - start.y;
        if (dx * dx + dy * dy < 36) return;
        begin();
      }
      e.preventDefault();
      schedule();
    }
    const onUp = () => finish(true);
    const onCancelPointer = () => finish(false);
    function onKey(e) {
      if (e.key === 'Escape' && active) {
        e.preventDefault();
        e.stopPropagation();
        finish(false);
      }
    }

    function onDown(e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (ignore && e.target.closest(ignore)) return;
      start = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
      pointer = { x: e.clientX, y: e.clientY };
      before = new Set(live.current.getSelection());
      base = e.shiftKey || e.ctrlKey || e.metaKey ? new Set(before) : new Set();
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancelPointer);
      window.addEventListener('keydown', onKey, true);
      window.addEventListener('scroll', schedule, { passive: true });
    }

    area.addEventListener('pointerdown', onDown);
    return () => {
      area.removeEventListener('pointerdown', onDown);
      finish(false);
    };
  }, [areaRef, boxRef, tileSelector, ignore, enabled]);
}
