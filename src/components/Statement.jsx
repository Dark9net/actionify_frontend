import { memo } from 'react';
import Letters from './Letters.jsx';
import useReveal from '../hooks/useReveal.js';
import useMoment from '../hooks/useMoment.js';
import { statement } from '../data/content.js';
import '../styles/statement.css';

/* Double ring with a six-blade aperture. */
function Emblem() {
  const R = 15;
  const pt = (deg, r) => {
    const a = (deg * Math.PI) / 180;
    return `${(33 + Math.cos(a) * r).toFixed(2)} ${(33 + Math.sin(a) * r).toFixed(2)}`;
  };
  const blades = Array.from({ length: 6 }, (_, k) => {
    const a = k * 60;
    return `M${pt(a, R)}L${pt(a + 90, R / Math.sqrt(3))}`;
  }).join('');
  return (
    <div className="emblem" aria-hidden="true">
      <svg viewBox="0 0 66 66">
        <circle cx="33" cy="33" r="31.5" />
        <circle cx="33" cy="33" r="26.5" />
        <circle cx="33" cy="33" r={R} />
        <path d={blades} />
      </svg>
    </div>
  );
}

/*
  The statement that lights up word by word as it crosses the middle of the screen
  (taste-skill's word-highlight moment). The moment rewrites this paragraph's words into spans,
  so React must never re-render it: it is memoised and takes no props.
*/
const LitStatement = memo(function LitStatement() {
  const ref = useMoment();
  const [before, strong, after] = statement.body;
  return (
    <div className="st-lit" data-moment="word-highlight" ref={ref}>
      <p className="mo-wh__text st-body">
        {before}
        <strong>{strong}</strong>
        {after}
      </p>
    </div>
  );
});

export default function Statement() {
  const [ref, shown] = useReveal(0.35);
  let i = 0; // letter index runs in reading order across the block, pills included
  return (
    <section className={`statement${shown ? ' in' : ''}`} ref={ref}>
      <div className="st-label label">{statement.label}</div>
      <h2 className="st-text display rv" aria-label={statement.aria}>
        {statement.lines.map((line, li) => (
          <span className="line" key={li}>
            {line.map((part, pi) => {
              if (typeof part === 'string') {
                const start = i;
                i += part.length;
                return (
                  <span key={pi}>
                    <Letters text={part} start={start} />
                  </span>
                );
              }
              return (
                <span className="pl" key={pi} style={{ '--i': i++ }} aria-hidden="true">
                  <img src={statement.pills[part.pill]} alt="" loading="lazy" />
                </span>
              );
            })}
          </span>
        ))}
      </h2>
      <Emblem />
      <LitStatement />
    </section>
  );
}
