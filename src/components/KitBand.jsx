import { Link } from 'react-router-dom';
import { Arrow } from './Icons.jsx';
import useScrollProgress from '../hooks/useScrollProgress.js';
import { kit } from '../data/content.js';
import '../styles/kit.css';

const src = `${import.meta.env.BASE_URL}${kit.image}`;

/*
  "Behind every frame": the exploded camera across the page, drifting sideways and opening out a
  little as it scrolls past, with a line and a link to the full layout on Our Details; under it, the
  rest of the kit as cards.
*/
export default function KitBand() {
  const ref = useScrollProgress();
  return (
    <section className="kit-band" ref={ref} aria-labelledby="kit-band-title">
      <div className="wrap kit-band-head">
        <div className="sr">
          <div className="label rust">{kit.bandLabel}</div>
          <h2 className="kit-band-title display" id="kit-band-title">
            {kit.bandTitle}
          </h2>
        </div>
        <div className="kit-band-side sr">
          <p>{kit.bandText}</p>
          <Link className="btn btn--ghost" to="/our-details#kit">
            <span>{kit.bandCta}</span>
            <Arrow />
          </Link>
        </div>
      </div>
      <div className="kit-band-pic">
        <img src={src} alt={kit.alt} width={kit.width} height={kit.height} loading="lazy" />
      </div>

      {/* the rest of the kit: lights, other cameras, lenses, the drone, the edit */}
      <div className="wrap kit-gear">
        <h3 className="kit-gear-label label rust">{kit.gearLabel}</h3>
        <ul className="kit-gear-grid">
          {kit.gear.map((g, i) => (
            <li key={g.name} className={`gear sr${g.wide ? ' gear--wide' : ''}`} style={{ '--i': i % 4 }}>
              <figure className="gear-photo">
                <img src={g.photo} alt={g.alt} loading="lazy" />
                <figcaption className="gear-kind label">{g.kind}</figcaption>
              </figure>
              <h4 className="gear-name display">{g.name}</h4>
              <p className="gear-text">{g.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
