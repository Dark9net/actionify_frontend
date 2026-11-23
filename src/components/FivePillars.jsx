import { Link } from 'react-router-dom';
import RevealText from './RevealText.jsx';
import { Arrow } from './Icons.jsx';
import useReveal from '../hooks/useReveal.js';
import { fivePillars } from '../data/content.js';
import '../styles/five-pillars.css';

const pad = (n) => String(n).padStart(2, '0');

/*
  FIVE PILLARS: the Actionify ecosystem as the master plan's pillar chart sets it, one column per
  pillar: its number, its name, its promise, its line, what it covers and its one focus.

  Motion (brand sheet: everything moves up, eases out on cubic-bezier(.2, .8, .2, 1), nothing bounces):
    entering   once, when the section comes on screen: each column's rule draws in from the left,
               then its type rises 48 px into focus (blur 4 px to sharp), column after column,
               and the list under it follows line by line
    pointing   the column lifts onto a paper card, a rust rule draws along its top, the number
               turns rust and the list steps in one line after another; a pillar with its own
               page (Media, Sound) also lifts 2 px and its arrow nudges up its 54° line
  Asked for less motion: everything stands in place and only the colours answer the pointer.
*/
export default function FivePillars() {
  const [ref, shown] = useReveal(0.2);
  const { label, title, intro, items } = fivePillars;

  return (
    <section className={`fp${shown ? ' in' : ''}`} id="pillars" ref={ref} aria-labelledby="fp-title">
      <div className="wrap">
        <header className="sec-head fp-head">
          <div>
            <div className="sec-label label">{label}</div>
            <h2 id="fp-title" className="sec-title display rv" aria-label={title}>
              <RevealText text={title} />
            </h2>
          </div>
          <div className="fp-intro rise">
            <p>{intro}</p>
            <span className="fp-total label">{pad(items.length)} pillars</span>
          </div>
        </header>

        <ol className="fp-grid">
          {items.map((p, i) => {
            const Col = p.to ? Link : 'div';
            // the whole column is the link; its own words (ending on the division's name) say where it leads
            const link = p.to ? { to: p.to } : {};
            return (
              <li className="fp-item" key={p.name} style={{ '--i': i }}>
                <Col className={`fp-col${p.to ? ' fp-col--link' : ''}`} {...link}>
                  <span className="fp-rule" aria-hidden="true" />
                  <span className="fp-top fp-a" style={{ '--o': 0 }}>
                    <span className="fp-n label">{pad(i + 1)}</span>
                    {p.to && (
                      <span className="fp-go" aria-hidden="true">
                        <Arrow />
                      </span>
                    )}
                  </span>
                  <h3 className="fp-name display fp-a" style={{ '--o': 1 }}>
                    {p.name}
                  </h3>
                  <span className="fp-promise label fp-a" style={{ '--o': 2 }}>
                    {p.promise}
                  </span>
                  <span className="fp-line fp-a" style={{ '--o': 2 }}>
                    {p.line}
                  </span>
                  <ul className="fp-covers">
                    {p.covers.map((c, k) => (
                      <li className="fp-a" key={c} style={{ '--o': 3 + k * 0.4, '--k': k }}>
                        {c}
                      </li>
                    ))}
                  </ul>
                  <span className="fp-foot fp-a" style={{ '--o': 3 + p.covers.length * 0.4 }}>
                    <span className="fp-focus">
                      <span className="fp-focus-k label">Focus</span>
                      {p.focus}
                    </span>
                    {p.by && <span className="fp-by">{p.by}</span>}
                  </span>
                </Col>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
