import { memo } from 'react';
import { Link } from 'react-router-dom';
import Letters from './Letters.jsx';
import { Arrow } from './Icons.jsx';
import useReveal from '../hooks/useReveal.js';
import useMoment from '../hooks/useMoment.js';
import { facts } from '../data/content.js';
import { glideTo } from '../lib/scroll.js';
import '../styles/facts.css';

/*
  The portrait develops once as it comes on screen, like a print in the developer tray
  (taste-skill's picture-develops moment, film look). Memoised so the section's reveal
  re-render never touches the classes the moment puts on it.
*/
const Portrait = memo(function Portrait() {
  const ref = useMoment();
  return (
    <figure
      className="portrait"
      data-moment="picture-develops"
      data-moment-opts='{"look":"film"}'
      ref={ref}
    >
      <img src={facts.portrait} alt={facts.portraitAlt} loading="lazy" />
    </figure>
  );
});

// 48 radial ticks around the play badge
const TICKS = Array.from({ length: 48 }, (_, k) => {
  const a = (k / 48) * Math.PI * 2;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return `M${(42 + c * 35.5).toFixed(2)} ${(42 + s * 35.5).toFixed(2)}L${(42 + c * 41).toFixed(2)} ${(42 + s * 41).toFixed(2)}`;
}).join('');

export default function Facts() {
  const [ref, shown] = useReveal(0.35);
  let i = 0;
  return (
    <section className={`facts${shown ? ' in' : ''}`} id="process" ref={ref}>
      <div className="facts-wrap">
        <div>
          <div className="f-label label">{facts.label}</div>
          <h2 className="f-title display rv" aria-label={facts.title.join(' ')}>
            {facts.title.map((word) => {
              const start = i;
              i += word.length;
              return (
                <span className="word" key={word}>
                  <Letters text={word} start={start} />
                </span>
              );
            })}
          </h2>
          <div className="badge-row">
            <a className="badge" href="#book" aria-label={facts.badgeAria} onClick={glideTo}>
              <svg viewBox="0 0 84 84">
                <path className="ticks" d={TICKS} />
                <path className="tri" d="M37.2 34.6v14.8l12.4-7.4z" />
              </svg>
            </a>
            <div className="label">{facts.badge}</div>
          </div>
        </div>

        <div>
          <p className="f-copy">{facts.copy}</p>
          <dl className="f-table">
            {facts.rows.map(([k, v], r) => (
              <div className="f-row" style={{ '--r': r }} key={k}>
                <dt className="k label">{k}</dt>
                <dd className="v">{v}</dd>
              </div>
            ))}
          </dl>
          <Link className="btn glass-btn f-cta rise" to="/hire-us">
            <span>Book a shoot</span>
            <Arrow />
          </Link>
        </div>

        <Portrait />
      </div>
    </section>
  );
}
