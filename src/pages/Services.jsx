import { Link } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';
import CtaBand from '../components/CtaBand.jsx';
import { Arrow } from '../components/Icons.jsx';
import useReveal from '../hooks/useReveal.js';
import useScrollProgress from '../hooks/useScrollProgress.js';
import QrCode from '../components/QrCode.jsx';
import { servicesPage as sp } from '../data/content.js';
import '../styles/services-page.css';

const pad = (n) => String(n).padStart(2, '0');

/* Line icons; they take the text colour. */
const ICONS = {
  book: <path d="M4 4.5h11l5 5V20H4zM15 4.5V9.5h5M8 13h8M8 16.5h5" />,
  camera: (
    <>
      <path d="M3 8h3.5l1.7-2.5h7.6L17.5 8H21v11H3z" />
      <circle cx="12" cy="13.3" r="3.4" />
    </>
  ),
  edit: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M3 16l5-4.5 4 3.5 3-2.5 6 5" />
      <circle cx="16" cy="9" r="1.6" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2.5" />
    </>
  ),
  qr: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM16 16h2v2h-2z" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  download: <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4.5 19.5h15" />,
  shield: <path d="M12 3.5l7 2.5v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6zM9 12l2.2 2.2L15.5 10" />,
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  cross: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
};
function Icon({ name }) {
  return (
    <svg className="svc-ico" viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

/* The booking form, as a small card. */
function FormMock() {
  return (
    <div className="mk-form" aria-hidden="true">
      <div className="mk-form-head">
        <span className="label">Booking request</span>
        <span className="mk-dot" />
      </div>
      {[
        ['Kind of shoot', 'Conference or corporate event'],
        ['Date', 'Saturday 14 June'],
        ['Venue and city', 'Thamel, Kathmandu'],
        ['Coverage', 'A full day'],
      ].map(([k, v], i) => (
        <div className="mk-field" key={k} style={{ '--i': i }}>
          <span className="label">{k}</span>
          <span>{v}</span>
        </div>
      ))}
      <span className="mk-btn">
        Send booking request <Arrow />
      </span>
    </div>
  );
}

/* The private gallery in a browser window. `small` is the version used inside the journey. */
function GalleryMock({ small = false }) {
  const { mock } = sp;
  return (
    <div className={`mk-gallery${small ? ' mk-gallery--small' : ''}`} aria-hidden="true">
      <div className="mk-bar">
        <span className="mk-lights">
          <i />
          <i />
          <i />
        </span>
        <span className="mk-url">
          <Icon name="lock" />
          gallery.actionify.example/mama
        </span>
      </div>
      <div className="mk-body">
        <div className="mk-head">
          <div>
            <div className="mk-title display">{mock.event}</div>
            <div className="mk-meta">
              <Icon name="lock" />
              {mock.meta}
            </div>
          </div>
          <span className="mk-dl">
            <Icon name="download" />
            Download all
          </span>
        </div>
        <div className="mk-grid">
          {mock.photos.map((src, i) => (
            <span className="mk-tile" key={src} style={{ '--i': i }}>
              <img src={src} alt="" loading="lazy" />
              <span className="mk-tile-dl">
                <Icon name="download" />
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* One step of the journey: its words on one side, its picture on the other. */
function Step({ step, i }) {
  const [ref, shown] = useReveal(0.3);
  let visual;
  if (step.form) visual = <FormMock />;
  else if (step.ui) visual = <GalleryMock small />;
  else if (step.qr)
    visual = (
      <div className="mk-qr-wrap">
        <QrCode />
        <span className="mk-scan" />
      </div>
    );
  else visual = <img className="jr-photo" src={step.photo} alt={step.alt} loading="lazy" />;

  return (
    <li className={`jr-step${shown ? ' in' : ''}`} ref={ref} style={{ '--i': i }}>
      <span className="jr-node" aria-hidden="true">
        <Icon name={step.icon} />
      </span>
      <div className="jr-card">
        <div className="jr-words">
          <span className="label rust">Step {pad(i + 1)}</span>
          <h3 className="jr-name display">{step.name}</h3>
          <p>{step.text}</p>
        </div>
        <div className={`jr-visual${step.photo ? ' jr-visual--photo' : ''}`}>{visual}</div>
      </div>
    </li>
  );
}

/* The steps, on a rule that fills as the section scrolls past. */
function Journey() {
  const ref = useScrollProgress();
  return (
    <div className="jr" ref={ref}>
      <span className="jr-rule" aria-hidden="true">
        <span />
      </span>
      <ol className="jr-list">
        {sp.steps.map((step, i) => (
          <Step step={step} i={i} key={step.name} />
        ))}
      </ol>
    </div>
  );
}

/*
  The Services page: how a booking runs, from the request on this site to every guest holding the
  photos, then the private gallery, the dynamic QR code, and why it beats sending photos one by one.
*/
export default function Services() {
  const [galRef, galIn] = useReveal(0.25);
  const [qrRef, qrIn] = useReveal(0.3);

  return (
    <PageShell name="Services" title={sp.title} slogan={sp.slogan} intro={sp.intro}>
      {/* the journey */}
      <section className="svc-journey">
        <div className="wrap">
          <header className="d-head">
            <div className="sr">
              <h2 className="label rust">{sp.stepsLabel}</h2>
              <p className="d-title display">{sp.stepsTitle}</p>
            </div>
            <Link className="btn btn--ghost sr" to="/hire-us">
              <span>Book a shoot</span>
              <Arrow />
            </Link>
          </header>
          <Journey />
        </div>
      </section>

      {/* the private gallery */}
      <section className={`svc-gallery${galIn ? ' in' : ''}`} ref={galRef}>
        <div className="wrap svc-gallery-grid">
          <div className="svc-gallery-copy">
            <h2 className="label rust sr">{sp.galleryLabel}</h2>
            <p className="d-title display sr">{sp.galleryTitle}</p>
            <p className="svc-lead sr">{sp.galleryText}</p>
            <ul className="feat">
              {sp.galleryFeatures.map(([icon, name, text], i) => (
                <li className="sr" key={name} style={{ '--i': i }}>
                  <span className="feat-ico">
                    <Icon name={icon} />
                  </span>
                  <div>
                    <h3>{name}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="svc-gallery-pic">
            <GalleryMock />
            <span className="svc-badge" aria-hidden="true">
              <Icon name="shield" />
              Guests only
            </span>
          </div>
        </div>
      </section>

      {/* the dynamic QR code */}
      <section className={`svc-qr${qrIn ? ' in' : ''}`} ref={qrRef}>
        <div className="wrap svc-qr-grid">
          <div className="qr-card-wrap">
            <div className="qr-card">
              <span className="label">{sp.qrCard.event}</span>
              <div className="qr-frame">
                <QrCode />
                <span className="qr-scan" aria-hidden="true" />
              </div>
              <p className="qr-line display">{sp.qrCard.line}</p>
              <span className="qr-note">{sp.qrCard.note}</span>
            </div>
          </div>
          <div className="svc-qr-copy">
            <h2 className="label">{sp.qrLabel}</h2>
            <p className="d-title display">{sp.qrTitle}</p>
            <p className="svc-lead">{sp.qrText}</p>
            <ol className="qr-points">
              {sp.qrPoints.map(([name, text], i) => (
                <li key={name} style={{ '--i': i }}>
                  <span className="qr-n">{pad(i + 1)}</span>
                  <div>
                    <h3>{name}</h3>
                    <p>{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* the old way against this one */}
      <section className="svc-compare">
        <div className="wrap">
          <header className="d-head">
            <div className="sr">
              <h2 className="label rust">{sp.compareLabel}</h2>
              <p className="d-title display">{sp.compareTitle}</p>
            </div>
          </header>
          <div className="cmp">
            {['old', 'new'].map((k, ci) => {
              const col = sp.compare[k];
              return (
                <div className={`cmp-col cmp-col--${k} sr`} key={k} style={{ '--i': ci }}>
                  <h3 className="cmp-name display">{col.name}</h3>
                  <ul>
                    {col.points.map((pt) => (
                      <li key={pt}>
                        <span className="cmp-ico">
                          <Icon name={k === 'old' ? 'cross' : 'check'} />
                        </span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CtaBand />
    </PageShell>
  );
}
