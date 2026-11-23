import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from './Footer.jsx';
import { Arrow } from './Icons.jsx';
import { ARROW, CREAM, NAVY } from './LogoMark.jsx';
import Wordmark from './Wordmark.jsx';
import useReveal from '../hooks/useReveal.js';
import { brand, pillars } from '../data/content.js';
import '../styles/pages.css';
import '../styles/pillar.css';

const pad = (n) => String(n).padStart(2, '0');

/*
  A pillar's lockup: the arrow, ACTIONIFY> and the pillar's name under it, in the header's navy.
  With `sting` it plays the logo sting once (1.8 s, then it holds), as the brand's motion sheet sets it:
    0.0 s  ground          the whole lockup shows faintly, as a ghost
    0.3 s  wing lands      the left wing rises in on the 54° line of the arrow
    0.6 s  body rises      the stem and the right wing follow on the same line
    0.9 s  wordmark        the letters rise into place, one after the other
    1.4 s  caret blinks    the name under it lights up and a caret ^ blinks after it
  Everything moves up, eases out on cubic-bezier(.2, .8, .2, 1) and settles: nothing bounces or spins.
*/
export function Lockup({ sub, sting = false, fill = NAVY, className = '' }) {
  return (
    <div className={`pl-lock${sting ? ' pl-lock--sting' : ''} ${className}`} role="img" aria-label={`${brand.name} ${sub}`}>
      <span className="pl-mark" aria-hidden="true">
        {sting && (
          <svg className="pl-ghost" viewBox="0 0 2645 2763" focusable="false">
            <g fill={fill}>
              {ARROW.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          </svg>
        )}
        <svg className="pl-wing" viewBox="0 0 2645 2763" focusable="false">
          <path fill={fill} d={ARROW[0]} />
        </svg>
        <svg className="pl-body" viewBox="0 0 2645 2763" focusable="false">
          <path fill={fill} d={ARROW[1]} />
          <path fill={fill} d={ARROW[2]} />
        </svg>
      </span>
      <span className="pl-type" aria-hidden="true">
        <span className="pl-word">
          {sting && <Wordmark className="pl-ghost pl-word-ghost" fill={fill} />}
          <Wordmark split className="pl-letters" letterClass="pl-l" fill={fill} />
        </span>
        <span className="pl-sub" style={{ color: fill }}>
          <span className="pl-sub-t">{sub}</span>
          {sting && <span className="pl-caret">^</span>}
        </span>
      </span>
    </div>
  );
}

/*
  The light on the glass: a mouse moving over a pane leaves a soft spot of light where it points
  (--mx, --my, read by .pl-glass::after). One listener for the whole page; touch and pen leave it be.
*/
function lightGlass(e) {
  if (e.pointerType !== 'mouse') return;
  const pane = e.target.closest?.('.pl-glass');
  if (!pane) return;
  const r = pane.getBoundingClientRect();
  pane.style.setProperty('--mx', `${Math.round(e.clientX - r.left)}px`);
  pane.style.setProperty('--my', `${Math.round(e.clientY - r.top)}px`);
}

/* a framed photograph behind the glass, under a shade that keeps the panes on it readable */
function Stage({ photo, alt = '', eager = false, shade = '', className = '', children }) {
  return (
    <div className={`pl-stage ${className}`}>
      <img
        className="pl-photo"
        src={photo}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
      <span className={`pl-shade${shade ? ` pl-shade--${shade}` : ''}`} aria-hidden="true" />
      {children}
    </div>
  );
}

/*
  The hero: the pillar's photograph opens out of a smaller frame and settles; a pane of cream glass
  rises onto it, and on that pane the lockup plays its sting, then the pillar's line rises in under it.
  "Replay the sting" runs the whole entrance again.
*/
function Hero({ pillar, n }) {
  const [run, setRun] = useState(0);
  return (
    <section className="pl-hero" aria-labelledby="pl-title">
      <div className="wrap">
        <Stage photo={pillar.photo.src} alt={pillar.photo.alt} eager className="pl-stage--hero" key={run}>
          <p className="pl-chip pl-glass pl-glass--dark label pl-rise" style={{ '--d': '1.5s' }}>
            Pillar {pad(n)} / {pad(pillars.length)}
          </p>
          <div className="pl-hero-card pl-glass">
            <Lockup sub={pillar.sub} sting className="pl-lock--hero" />
            <p className="pl-eyebrow label pl-rise" style={{ '--d': '1s' }}>
              {pillar.eyebrow}
            </p>
            <h1 id="pl-title" className="pl-title display pl-rise" style={{ '--d': '1.1s' }}>
              {pillar.name}
            </h1>
            <p className="pl-text pl-rise" style={{ '--d': '1.2s' }}>
              {pillar.text}
            </p>
            <div className="pl-actions pl-rise" style={{ '--d': '1.3s' }}>
              <Link className="pl-btn" to="/contact-us">
                <span>Talk to the studio</span>
                <Arrow />
              </Link>
              <button className="pl-replay" type="button" onClick={() => setRun((r) => r + 1)}>
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" />
                </svg>
                Replay the sting
              </button>
            </div>
          </div>
        </Stage>
      </div>
    </section>
  );
}

/* what the pillar makes: a pane of smoked glass for each craft, dealt onto the photograph in turn */
function Crafts({ pillar }) {
  const [ref, shown] = useReveal(0.25);
  return (
    <section className={`pl-sec pl-crafts${shown ? ' in' : ''}`} ref={ref} aria-labelledby="pl-crafts-title">
      <div className="wrap">
        <Stage photo={pillar.craftsPhoto} shade="deep" className="pl-stage--crafts">
          <div className="pl-stage-head">
            <h2 id="pl-crafts-title" className="pl-h2 display">
              What {pillar.name} makes
            </h2>
            <p className="pl-chip pl-glass pl-glass--dark label">{pad(pillar.crafts.length)} crafts</p>
          </div>
          <ol className="pl-craft-list">
            {pillar.crafts.map((c, i) => (
              <li className="pl-craft pl-glass pl-glass--dark pl-up" key={c} style={{ '--i': i }}>
                <span className="pl-craft-n label">{pad(i + 1)}</span>
                <span className="pl-craft-name display">{c}</span>
              </li>
            ))}
          </ol>
        </Stage>
      </div>
    </section>
  );
}

/*
  What a pillar sells and how it runs, where its data gives it: the packages (each a glass card that
  opens a conversation about it), a note with its points, a pipeline (step, who, result) and phases
  (Originals' first 90 days). Everything is dealt onto the photograph as the block comes into view.
*/
function Plan({ pillar }) {
  const [ref, shown] = useReveal(0.12);
  const { packages, note, steps, phases } = pillar;
  if (!packages && !note && !steps && !phases) return null;
  return (
    <section className={`pl-sec pl-plan${shown ? ' in' : ''}`} ref={ref} aria-label={`How ${pillar.name} works`}>
      <div className="wrap">
        <Stage photo={pillar.planPhoto} shade="deep" className="pl-stage--plan">
          {packages && (
            <div className="pl-block">
              <h2 className="pl-h2 display">{pillar.packagesTitle}</h2>
              <div className={note ? 'pl-plan-row' : 'pl-plan-one'}>
                <ul className={`pl-packs pl-packs--${packages.length}`}>
                  {packages.map(([name, includes, best], i) => (
                    <li className="pl-up" key={name} style={{ '--i': i }}>
                      <Link className="pl-pack pl-glass" to="/contact-us">
                        <span className="pl-pack-top">
                          <span className="pl-pack-n label">{pad(i + 1)}</span>
                          <span className="pl-pack-name display">{name}</span>
                        </span>
                        <span className="pl-pack-inc">{includes}</span>
                        <span className="pl-pack-best">
                          <span className="label">Best for</span>
                          {best}
                        </span>
                        <span className="pl-pack-go">
                          <span className="pl-pack-go-t">Ask about this package</span>
                          <span className="pl-pack-go-i" aria-hidden="true">
                            <Arrow />
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {/* the note stands beside the packages, the why next to what is sold */}
                {note && (
                  <div className="pl-note pl-glass pl-glass--dark pl-up" style={{ '--i': packages.length }}>
                    <h3 className="pl-note-title display">{note.title}</h3>
                    <p className="pl-note-text">{note.text}</p>
                    <ul className="pl-points">
                      {note.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {steps && (
            <div className="pl-block">
              <h2 className="pl-h2 display">{pillar.stepsTitle}</h2>
              <div className="pl-table pl-glass pl-up" role="table" aria-label={pillar.stepsTitle} style={{ '--i': 0 }}>
                <div className="pl-tr pl-th" role="row">
                  <span className="label" role="columnheader">Step</span>
                  <span className="label" role="columnheader">Who</span>
                  <span className="label" role="columnheader">Result</span>
                </div>
                {steps.map(([step, who, result], i) => (
                  <div className="pl-tr" role="row" key={step} style={{ '--i': i }}>
                    <span className="pl-td-name display" role="cell">
                      <span className="pl-td-n label" aria-hidden="true">{pad(i + 1)}</span>
                      {step}
                    </span>
                    <span className="pl-td-who" role="cell" data-k="Who">{who}</span>
                    <span role="cell" data-k="Result">{result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {phases && (
            <div className="pl-block">
              <h3 className="pl-h3 display">{pillar.phasesTitle}</h3>
              <ol className="pl-phases">
                {phases.map(([when, text], i) => (
                  <li className="pl-phase pl-glass pl-up" key={when} style={{ '--i': i + 1 }}>
                    <span className="pl-phase-bar" aria-hidden="true" />
                    <h4 className="pl-phase-when display">{when}</h4>
                    <p>{text}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Stage>
      </div>
    </section>
  );
}

/* the other two pillars: each its photograph, the cream lockup as the brand sheet draws it, a glass pane */
function Others({ pillar }) {
  const [ref, shown] = useReveal(0.2);
  const others = pillars.filter((p) => p.key !== pillar.key);
  return (
    <section className={`pl-others${shown ? ' in' : ''}`} ref={ref} aria-labelledby="pl-others-title">
      <div className="wrap">
        <h2 id="pl-others-title" className="pl-h2 display">
          The other pillars
        </h2>
        <ul className="pl-cards">
          {others.map((p, i) => (
            <li className="pl-up" key={p.key} style={{ '--i': i }}>
              <Link className="pl-card" to={p.to}>
                <span className="pl-card-frame" aria-hidden="true">
                  <img className="pl-photo" src={p.card} alt="" loading="lazy" decoding="async" />
                </span>
                <span className="pl-shade" aria-hidden="true" />
                <Lockup sub={p.sub} fill={CREAM} />
                <span className="pl-card-glass pl-glass pl-glass--dark">
                  <span className="pl-card-eyebrow label">{p.eyebrow}</span>
                  <span className="pl-card-title display">{p.name}</span>
                  <span className="pl-card-text">{p.text}</span>
                  <span className="pl-card-go" aria-hidden="true">
                    <Arrow />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* A pillar of the work (Films, Production, Originals): its own public page, on the logo's cream. */
export default function PillarPage({ pillar }) {
  const n = pillars.findIndex((p) => p.key === pillar.key) + 1;

  useEffect(() => {
    document.title = `${pillar.name} · ${brand.name}`;
  }, [pillar.name]);

  return (
    <div className="page pl-page" onPointerMove={lightGlass}>
      <main id="main">
        <Hero pillar={pillar} n={n} key={pillar.key} />
        <Crafts pillar={pillar} key={`c-${pillar.key}`} />
        <Plan pillar={pillar} key={`p-${pillar.key}`} />
        <Others pillar={pillar} key={`o-${pillar.key}`} />
      </main>
      <Footer />
    </div>
  );
}
