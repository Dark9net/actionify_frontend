import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import RevealText from './RevealText.jsx';
import { Arrow } from './Icons.jsx';
import useReveal from '../hooks/useReveal.js';
import { services } from '../data/content.js';
import '../styles/sections.css';

const pad = (n) => String(n).padStart(2, '0');

/*
  An editorial index of the events covered: one large serif row per kind of event. Pointing at a
  row lights it (the others step back), draws its rule in rust and brings up a photograph that
  follows the pointer; focusing a row pins that photograph beside it. Under 900px each row carries
  its own thumbnail instead.
*/
export default function Services() {
  const [ref, shown] = useReveal(0.2);
  const [active, setActive] = useState(-1);
  const listRef = useRef(null);
  const peekRef = useRef(null);
  const motion = useRef({ x: 0, y: 0, tx: 0, ty: 0, raf: 0, on: false });
  const items = services.items;

  // the preview eases toward the pointer (a fraction of the gap each frame), so it trails softly
  useEffect(() => {
    const m = motion.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    m.step = () => {
      m.raf = 0;
      const el = peekRef.current;
      if (!el) return;
      const k = reduce ? 1 : 0.18;
      m.x += (m.tx - m.x) * k;
      m.y += (m.ty - m.y) * k;
      el.style.setProperty('--px', `${m.x.toFixed(1)}px`);
      el.style.setProperty('--py', `${m.y.toFixed(1)}px`);
      if (Math.abs(m.tx - m.x) > 0.3 || Math.abs(m.ty - m.y) > 0.3) m.raf = requestAnimationFrame(m.step);
    };
    return () => cancelAnimationFrame(m.raf);
  }, []);

  function aim(x, y, jump) {
    const m = motion.current;
    m.tx = x;
    m.ty = y;
    if (jump) {
      m.x = x;
      m.y = y;
    }
    if (!m.raf) m.raf = requestAnimationFrame(m.step);
  }

  function onMove(e) {
    if (e.pointerType !== 'mouse') return;
    const box = listRef.current.getBoundingClientRect();
    const m = motion.current;
    aim(e.clientX - box.left, e.clientY - box.top, !m.on);
    m.on = true;
  }

  function onLeave() {
    motion.current.on = false;
    setActive(-1);
  }

  // keyboard: the preview stands at the right of the focused row
  function onFocusRow(i, e) {
    setActive(i);
    const row = e.currentTarget.getBoundingClientRect();
    const box = listRef.current.getBoundingClientRect();
    aim(box.width * 0.62, row.top - box.top + row.height / 2, true);
  }

  return (
    <section className={`services${shown ? ' in' : ''}`} id="services" ref={ref}>
      <div className="wrap">
        <header className="sec-head sv-head">
          <div>
            <div className="sec-label label">{services.label}</div>
            <h2 className="sec-title display rv" aria-label={services.title}>
              <RevealText text={services.title} />
            </h2>
          </div>
          <div className="sv-intro rise">
            <p>{services.intro}</p>
            <span className="sv-total label">
              {pad(items.length)} kinds of film
            </span>
          </div>
        </header>

        <div
          className={`sv-index${active >= 0 ? ' is-on' : ''}`}
          ref={listRef}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
        >
          <ul className="sv-list">
            {items.map((item, i) => (
              <li key={item.tag} className={`sv-row${i === active ? ' on' : ''}`} style={{ '--r': i }}>
                <Link
                  className="sv-link"
                  to={`/our-work?show=${item.tag}#gallery`}
                  onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)}
                  onFocus={(e) => onFocusRow(i, e)}
                  onBlur={() => setActive(-1)}
                >
                  <span className="sv-n label">{pad(i + 1)}</span>
                  <span className="sv-name display" data-text={item.name}>
                    {item.name}
                  </span>
                  <span className="sv-line">{item.line}</span>
                  <span className="sv-thumb" aria-hidden="true">
                    <img src={item.thumb} alt="" loading="lazy" />
                  </span>
                  <span className="sv-go" aria-hidden="true">
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* one frame for the whole list: each row's photograph is stacked inside and uncovered in turn */}
          <div className="sv-peek" ref={peekRef} aria-hidden="true">
            <div className="sv-peek-in">
              {items.map((item, i) => (
                <img
                  key={item.tag}
                  className={i === active ? 'on' : ''}
                  src={item.photo}
                  alt=""
                  // the frame is hidden until pointed at, so lazy loading would never start: load once the section is on screen
                  loading={shown ? 'eager' : 'lazy'}
                />
              ))}
              <span className="sv-peek-tag label">See {active >= 0 ? items[active].name.toLowerCase() : ''}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
