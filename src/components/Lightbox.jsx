import { useEffect } from 'react';
import useDialog, { dialogProps } from '../hooks/useDialog.js';
import { Arrow, Cross } from './Icons.jsx';
import '../styles/overlays.css';

const pad = (n) => String(n).padStart(2, '0');

/* One photograph at full size, with the arrow keys or the round buttons to step through the set. */
export default function Lightbox({ items, index, onMove, onClose }) {
  const open = index >= 0 && index < items.length;
  const ref = useDialog(open, 240);
  const item = open ? items[index] : null;
  const step = (by) => onMove((index + by + items.length) % items.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <dialog ref={ref} className="lightbox" aria-label="Photograph" {...dialogProps(open, onClose)}>
      {item && (
        <div className="lb-in">
          <div className="lb-top">
            <span className="label" aria-live="polite">
              {pad(index + 1)} / {pad(items.length)}
            </span>
            <button className="sheet-close label" type="button" onClick={onClose}>
              <span>Close</span>
              <Cross />
            </button>
          </div>
          <div className="lb-stage" onClick={(e) => e.target === e.currentTarget && onClose()}>
            {item.video ? (
              // a video (the client gallery): plays in place, its preview until it starts
              <video key={item.full} src={item.full} poster={item.poster || undefined} controls playsInline preload="metadata" aria-label={item.alt} />
            ) : (
              <img key={item.full} src={item.full} alt={item.alt} />
            )}
            <button className="lb-arrow lb-prev" type="button" aria-label="Previous photograph" onClick={() => step(-1)}>
              <Arrow />
            </button>
            <button className="lb-arrow lb-next" type="button" aria-label="Next photograph" onClick={() => step(1)}>
              <Arrow />
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
