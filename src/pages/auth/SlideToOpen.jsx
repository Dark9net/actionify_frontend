import { useEffect, useRef, useState } from 'react';

const DONE_AT = 0.88; // let go past this share of the track and it opens

/*
  "Slide to open": a round handle dragged along a pill. The track fills behind it and the label fades
  as it goes; let go before the end and it springs back, reach the end and `onOpen` runs (a spinner
  shows while it does). Locked until `ready`. The keyboard gets the same thing: the handle is a slider,
  the arrow keys move it, Enter, Space or End open it at once.
*/
export default function SlideToOpen({ ready, busy, onOpen, label = 'Slide to open your gallery', lockedLabel }) {
  const trackRef = useRef(null);
  const knobRef = useRef(null);
  const drag = useRef(null);
  const [x, setX] = useState(0); // handle position, 0 to 1
  const [dragging, setDragging] = useState(false);

  // after a failed open, or when the code is cleared, the handle goes home
  useEffect(() => {
    if (!busy) setX(0);
  }, [busy, ready]);

  const room = () => {
    const t = trackRef.current;
    const k = knobRef.current;
    return t && k ? t.clientWidth - k.offsetWidth - 10 : 1;
  };

  function finish() {
    setX(1);
    onOpen();
  }

  function down(e) {
    if (!ready || busy) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { start: e.clientX, from: x * room() };
    setDragging(true);
  }
  function move(e) {
    if (!drag.current) return;
    const px = drag.current.from + (e.clientX - drag.current.start);
    setX(Math.min(1, Math.max(0, px / room())));
  }
  function up() {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    if (x >= DONE_AT) finish();
    else setX(0);
  }

  function key(e) {
    if (!ready || busy) return;
    if (['Enter', ' ', 'End'].includes(e.key)) {
      e.preventDefault();
      finish();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(1, x + 0.25);
      if (next >= 1) finish();
      else setX(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === 'Home') {
      e.preventDefault();
      setX(e.key === 'Home' ? 0 : Math.max(0, x - 0.25));
    }
  }

  const state = busy ? 'busy' : !ready ? 'locked' : x >= DONE_AT ? 'near' : 'ready';
  return (
    <div
      className={`au-slide${dragging ? ' is-dragging' : ''}`}
      data-state={state}
      ref={trackRef}
      style={{ '--x': x }}
    >
      <span className="au-slide-fill" aria-hidden="true" />
      <span className="au-slide-label" aria-hidden="true">
        {busy ? 'Opening your gallery' : ready ? label : lockedLabel}
      </span>
      <span
        className="au-slide-knob"
        ref={knobRef}
        role="slider"
        tabIndex={ready && !busy ? 0 : -1}
        aria-label={ready ? `${label}. Press Enter to open.` : lockedLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(x * 100)}
        aria-valuetext={busy ? 'Opening' : `${Math.round(x * 100)}%`}
        aria-disabled={!ready || busy}
        aria-busy={busy}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        {busy ? (
          <span className="au-spin" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 10h11M11 5.5l4.5 4.5-4.5 4.5" />
          </svg>
        )}
      </span>
    </div>
  );
}
