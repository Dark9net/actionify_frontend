import { useState } from 'react';
import { Link } from 'react-router-dom';
import RevealText from './RevealText.jsx';
import { Arrow } from './Icons.jsx';
import useReveal from '../hooks/useReveal.js';
import { workPreview } from '../data/content.js';
import '../styles/sections.css';

const pad = (n) => String(n).padStart(2, '0');

/*
  Five frames from the portfolio as a strip of tall panels. The open panel (first at rest, then the
  one last pointed at or focused) widens to show its whole frame, its kind of event and title; the
  others stay narrow slices with their number and kind set on the edge. Each opens Our Work at its
  kind of event. On phones and touch screens the panels sit in a plain grid, labelled at rest.
*/
export default function WorkPreview() {
  const [ref, shown] = useReveal(0.2);
  const [open, setOpen] = useState(0);
  const items = workPreview.items;

  return (
    <section className={`work${shown ? ' in' : ''}`} id="work" ref={ref}>
      <div className="wrap">
        <header className="sec-head">
          <div>
            <div className="sec-label label">{workPreview.label}</div>
            <h2 className="sec-title display rv" aria-label={workPreview.title}>
              <RevealText text={workPreview.title} />
            </h2>
          </div>
          <Link className="btn btn--ghost rise" to="/our-work">
            <span>{workPreview.cta}</span>
            <Arrow />
          </Link>
        </header>

        <div className="wk-strip">
          {items.map((item, i) => (
            <Link
              className={`wk-panel${i === open ? ' open' : ''}`}
              to={`/our-work?show=${item.tag}#gallery`}
              key={item.src}
              style={{ '--r': i }}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(i)}
              onFocus={() => setOpen(i)}
            >
              {/* the wipe and the rounding live on this layer, so the link keeps its own focus ring */}
              <span className="wk-clip">
                <span className="wk-media">
                  <img src={item.src} alt={item.alt} loading="lazy" />
                </span>
                <span className="wk-shade" aria-hidden="true" />
                <span className="wk-edge" aria-hidden="true">
                  <span className="wk-n">{pad(i + 1)}</span>
                  <span className="wk-edge-kind label">{item.kind}</span>
                </span>
                <span className="wk-over">
                  <span className="wk-meta">
                    <span className="wk-kind label">
                      {pad(i + 1)} · {item.kind}
                    </span>
                    <span className="wk-title display">{item.title}</span>
                  </span>
                  <span className="wk-go" aria-hidden="true">
                    <Arrow />
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
