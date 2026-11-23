import { useLayoutEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import Quote from '../components/Quote.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Lightbox from '../components/Lightbox.jsx';
import KitBand from '../components/KitBand.jsx';
import { quotes, work } from '../data/content.js';

const pad = (n) => String(n).padStart(2, '0');
const kindOf = Object.fromEntries(work.filters);
const counts = Object.fromEntries(
  work.filters.map(([tag]) => [tag, tag === 'all' ? work.items.length : work.items.filter((p) => p.tag === tag).length])
);

/* The kinds of event as one segmented control; an ink pill slides to the one chosen. */
function Filters({ show, onChoose }) {
  const barRef = useRef(null);
  const [pill, setPill] = useState(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const place = () => {
      const on = bar.querySelector('[aria-pressed="true"]');
      if (on) setPill({ x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [show]);

  return (
    <div className="wf" ref={barRef} role="group" aria-label="Show a kind of work">
      {pill && (
        <span
          className="wf-pill"
          aria-hidden="true"
          style={{ width: pill.w, height: pill.h, transform: `translate(${pill.x}px, ${pill.y}px)` }}
        />
      )}
      {work.filters.map(([tag, label]) => (
        <button key={tag} className="wf-btn" type="button" aria-pressed={tag === show} onClick={() => onChoose(tag)}>
          <span className="label">{label}</span>
          <span className="wf-count">{counts[tag]}</span>
        </button>
      ))}
    </div>
  );
}

/* The portfolio: filter by kind of day, open any frame at full size, then the kit behind it. */
export default function OurWork() {
  const [params, setParams] = useSearchParams();
  const asked = params.get('show');
  const show = work.filters.some(([tag]) => tag === asked) ? asked : 'all';
  const items = show === 'all' ? work.items : work.items.filter((p) => p.tag === show);
  const [open, setOpen] = useState(-1);

  function choose(tag) {
    setOpen(-1);
    setParams(tag === 'all' ? {} : { show: tag }, { replace: true, preventScrollReset: true });
  }

  return (
    <PageShell name="Our Work" title={work.title} slogan={work.slogan} intro={work.intro}>
      <section className="gallery" id="gallery">
        <div className="wrap">
          <div className="g-bar">
            <Filters show={show} onChoose={choose} />
            <p className="g-count" aria-live="polite">
              <span className="display">{pad(items.length)}</span>
              <span className="label">{show === 'all' ? 'frames' : `${kindOf[show].toLowerCase()} frames`}</span>
            </p>
          </div>

          {/* keyed by the filter, so a new set deals in tile after tile */}
          <ul className="g-grid" key={show}>
            {items.map((photo, i) => (
              <li key={photo.src} style={{ '--i': Math.min(i, 9) }}>
                <button
                  className="g-item"
                  type="button"
                  data-o={photo.o}
                  aria-label={`View larger: ${photo.alt}`}
                  onClick={() => setOpen(i)}
                >
                  <span className="g-media">
                    <img src={photo.src} alt={photo.alt} loading={i < 6 ? 'eager' : 'lazy'} />
                  </span>
                  <span className="g-over" aria-hidden="true">
                    <span className="g-meta">
                      <span className="label">{kindOf[photo.tag]}</span>
                      <span className="g-no display">No. {pad(work.items.indexOf(photo) + 1)}</span>
                    </span>
                    <span className="g-view">
                      <svg viewBox="0 0 14 14">
                        <path d="M7 1v12M1 7h12" />
                      </svg>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <KitBand />
      <Quote quote={quotes.work} tone="paper" />
      <CtaBand />
      <Lightbox items={items} index={open} onMove={setOpen} onClose={() => setOpen(-1)} />
    </PageShell>
  );
}
