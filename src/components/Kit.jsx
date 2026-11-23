import { kit } from '../data/content.js';
import useScrollProgress from '../hooks/useScrollProgress.js';
import '../styles/kit.css';

const pad = (n) => String(n).padStart(2, '0');
const src = `${import.meta.env.BASE_URL}${kit.image}`;

/*
  The picture is split into six parts, each a copy of the same image clipped to one group of parts
  (polygons in % of the picture). As the section scrolls through its pinned stage, the body settles
  first, then each group slides in from just outside its place: the lens from the left, the top plates
  from above, the boards and back from the right, the battery from below. Every part lands exactly on
  the exploded picture, so the finished frame is the original image. The body is already in place when the stage pins. `a` is where in the scroll a part
  starts (0 to 1), `d` how long it takes; dx and dy where it comes from.
*/
const PARTS = [
  { id: 'body', a: -0.12, d: 0.12, dx: '0%', dy: '4%', clip: '33.5% 19.6%, 69.7% 19.6%, 69.7% 77.6%, 65.8% 77.6%, 65.8% 89.8%, 62% 89.8%, 62% 100%, 33.5% 100%' },
  { id: 'lens', a: 0.03, d: 0.24, dx: '-18%', dy: '0%', clip: '0 0, 33.5% 0, 33.5% 100%, 0 100%' },
  { id: 'top', a: 0.11, d: 0.24, dx: '0%', dy: '-34%', clip: '42.8% 0, 67.3% 0, 67.3% 19.6%, 42.8% 19.6%' },
  { id: 'boards', a: 0.19, d: 0.24, dx: '12%', dy: '0%', clip: '69.7% 33.2%, 80.5% 33.2%, 80.5% 36.6%, 85.4% 36.6%, 85.4% 77.6%, 69.7% 77.6%' },
  { id: 'back', a: 0.27, d: 0.24, dx: '20%', dy: '0%', clip: '80.5% 24.4%, 100% 24.4%, 100% 71.5%, 85.4% 71.5%, 85.4% 36.6%, 80.5% 36.6%' },
  { id: 'base', a: 0.35, d: 0.24, dx: '0%', dy: '30%', clip: '65.8% 77.6%, 85.4% 77.6%, 85.4% 71.5%, 100% 71.5%, 100% 100%, 62% 100%, 62% 89.8%, 65.8% 89.8%' },
];

// each callout's place on the picture, the run of its line, and when in the scroll it appears
const vars = (c, i) => ({
  '--x': c.x,
  '--y': c.y,
  '--to': c.to,
  '--top': Math.min(c.y, c.to),
  '--len': Math.abs(c.to - c.y),
  '--a': 0.36 + i * 0.08,
});

export default function Kit() {
  const track = useScrollProgress({ pinned: true });

  return (
    <section className="kit-track" id="kit" ref={track} aria-labelledby="kit-title">
      <div className="kit-stage">
        <div className="wrap kit-head">
          <div>
            <div className="label rust">{kit.label}</div>
            <h2 className="kit-title display" id="kit-title">
              {kit.title}
            </h2>
          </div>
          <div className="kit-side">
            <p className="kit-intro">{kit.intro}</p>
            <div className="kit-meter" aria-hidden="true">
              <span className="label">Laid out</span>
              <span className="kit-bar">
                <span />
              </span>
            </div>
          </div>
        </div>

        <div className="kit-fig">
          <div className="kit-box">
            <div className="kit-pic" style={{ aspectRatio: `${kit.width} / ${kit.height}` }}>
              {/* the whole picture once for assistive tech; the six parts are its moving copies */}
              <img className="kit-sr" src={src} alt={kit.alt} width={kit.width} height={kit.height} />
              {PARTS.map((p) => (
                <img
                  key={p.id}
                  className="kit-part"
                  src={src}
                  alt=""
                  aria-hidden="true"
                  width={kit.width}
                  height={kit.height}
                  style={{ '--a': p.a, '--d': p.d, '--dx': p.dx, '--dy': p.dy, clipPath: `polygon(${p.clip})` }}
                />
              ))}
              {/* a numbered pin on each part, and the line from it to its label */}
              {kit.callouts.map((c, i) => (
                <span key={c.name} className={`kit-pin${c.to < c.y ? ' up' : ''}`} style={vars(c, i)} aria-hidden="true">
                  <span className="kit-line" />
                  <span className="kit-dot">{i + 1}</span>
                </span>
              ))}
            </div>

            <ol className="kit-calls">
              {kit.callouts.map((c, i) => (
                <li key={c.name} className={`kit-call${c.to < c.y ? ' up' : ''}${c.end ? ' end' : ''}${c.endNarrow ? ' end-narrow' : ''}`} style={vars(c, i)}>
                  <span className="kit-n label" aria-hidden="true">
                    {pad(i + 1)}
                  </span>
                  <strong>{c.name}</strong>
                  <span>{c.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
