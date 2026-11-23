import PageShell from '../components/PageShell.jsx';
import Quote from '../components/Quote.jsx';
import CtaBand from '../components/CtaBand.jsx';
import Kit from '../components/Kit.jsx';
import Teams from '../components/Teams.jsx';
import useScrollProgress from '../hooks/useScrollProgress.js';
import { brand, details, facts, quotes, studio } from '../data/content.js';

const pad = (n) => String(n).padStart(2, '0');

/* A wide photograph that opens from an inset frame to the full width as it scrolls up the screen. */
function Banner() {
  const ref = useScrollProgress();
  return (
    <div className="d-banner" ref={ref}>
      <div className="d-banner-frame">
        <img src={details.banner} alt={details.bannerAlt} />
      </div>
    </div>
  );
}

/* The four stages of the standard, on a rule that fills as the section scrolls past. */
function Day() {
  const ref = useScrollProgress();
  return (
    <div className="day" ref={ref}>
      <div className="day-rule" aria-hidden="true">
        <span />
      </div>
      <ol className="day-steps">
        {details.day.map(([name, text], i) => (
          <li key={name} style={{ '--i': i }}>
            <span className="day-dot" aria-hidden="true" />
            <span className="label rust">Stage {pad(i + 1)}</span>
            <h4 className="display">{name}</h4>
            <p>{text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* Who the studio is, what it carries, who does what, how it works, and its details at a glance. */
export default function OurDetails() {
  const rows = [
    ['Studio', `${brand.name} ${brand.sub}`],
    ...facts.rows,
    ['Email', <a className="tlink" href={`mailto:${studio.email}`}>{studio.email}</a>],
    studio.phone && ['Phone', studio.phone],
    studio.location && ['Based in', studio.location],
  ].filter(Boolean);

  return (
    <PageShell name="Our Details" title={details.title} slogan={details.slogan} intro={details.intro}>
      <Banner />

      {/* the studio: the lead, two paragraphs, and four numbers */}
      <section className="about">
        <div className="wrap">
          <div className="about-grid">
            <div className="sr">
              <h2 className="label rust">{details.aboutLabel}</h2>
              <p className="about-lead display">{details.aboutLead}</p>
            </div>
            <div className="about-copy sr">
              {details.about.map((text) => (
                <p className="about-text" key={text}>
                  {text}
                </p>
              ))}
            </div>
          </div>
          <dl className="stats">
            {details.stats.map(([n, label], i) => (
              <div className="stat sr" key={label} style={{ '--i': i }}>
                <dt className="stat-n display">{n}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Kit />

      {/* the team, and how a film and an audio project flow between them */}
      <Teams />

      {/* how we work: the three principles, then a day in four steps */}
      <section className="principles">
        <div className="wrap">
          <header className="d-head">
            <div className="sr">
              <h2 className="label rust">{details.principlesLabel}</h2>
              <p className="d-title display">{details.dayTitle}</p>
            </div>
          </header>
          <ol className="pr-list">
            {details.principles.map(([name, text], i) => (
              <li className="pr-row" key={name}>
                <span className="pr-n label">{pad(i + 1)}</span>
                <h3 className="pr-name display">{name}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <h3 className="sr-only">{details.dayLabel}</h3>
          <Day />
        </div>
      </section>

      <section className="glance">
        <div className="wrap glance-grid">
          <div className="sr">
            <h2 className="label rust">{details.factsLabel}</h2>
            <dl className="d-table">
              {rows.map(([k, v]) => (
                <div className="d-row" key={k}>
                  <dt className="label">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figure className="glance-photo shot sr">
            <img src={details.factsPhoto} alt={details.factsPhotoAlt} loading="lazy" />
          </figure>
        </div>
      </section>

      <Quote quote={quotes.details} />
      <CtaBand />
    </PageShell>
  );
}
