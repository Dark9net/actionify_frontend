import PageShell from '../components/PageShell.jsx';
import BookingForm from '../components/BookingForm.jsx';
import Quote from '../components/Quote.jsx';
import { Arrow } from '../components/Icons.jsx';
import useScrollProgress from '../hooks/useScrollProgress.js';
import { glideTo } from '../lib/scroll.js';
import { facts, hire, quotes } from '../data/content.js';

const pad = (n) => String(n).padStart(2, '0');
const minimum = facts.rows.find(([k]) => k === 'Bookings')?.[1] ?? '';

/* Line icons for what every booking includes; they take the text colour. */
const ICONS = {
  camera: (
    <svg viewBox="0 0 24 24">
      <path d="M3 8h3.5l1.7-2.5h7.6L17.5 8H21v11H3z" />
      <circle cx="12" cy="13.3" r="3.4" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24">
      <path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <path d="M3.8 6.6l1.2 1.1 2-2.3M3.8 12.1l1.2 1.1 2-2.3M3.8 17.6l1.2 1.1 2-2.3" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c.4-3.6 2.8-5.6 6-5.6s5.6 2 6 5.6" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.6c1.8.6 2.8 2.4 3 5.4" />
    </svg>
  ),
  gallery: (
    <svg viewBox="0 0 24 24">
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M3 16l5-4.5 4 3.5 3-2.5 6 5" />
      <circle cx="16" cy="9" r="1.6" />
    </svg>
  ),
};

/* The three steps, on a rule that fills as the column scrolls past. */
function Steps() {
  const ref = useScrollProgress();
  return (
    <ol className="steps" ref={ref}>
      {hire.steps.map(([name, text], i) => (
        <li key={name} style={{ '--i': i }}>
          <span className="step-n" aria-hidden="true">
            {pad(i + 1)}
          </span>
          <div>
            <h3 className="display">{name}</h3>
            <p>{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* A coverage card: glide to the form and choose that length of day in it (BookingForm listens). */
function pickPlan(e, i) {
  glideTo(e);
  window.dispatchEvent(new CustomEvent('actionify:coverage', { detail: hire.coverage[i] }));
}

/* The form itself with how a booking goes, then how long the day is, and the questions people ask first. */
export default function HireUs() {
  return (
    <PageShell name="Book a shoot" title={hire.title} slogan={hire.slogan} intro={hire.intro}>
      {/* the booking first: the form, with the steps and what is included beside it */}
      <section className="hire" id="booking">
        <div className="wrap hire-grid">
          <aside className="hire-side">
            <h2 className="label rust">{hire.stepsLabel}</h2>
            <Steps />
            <h3 className="label rust hire-inc-label">{hire.includedLabel}</h3>
            <ul className="inc">
              {hire.included.map(([icon, text], i) => (
                <li className="sr" key={text} style={{ '--i': i }}>
                  <span className="inc-ico" aria-hidden="true">
                    {ICONS[icon]}
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </aside>

          <div className="hire-form">
            <div className="hire-card">
              <div className="hire-card-head">
                <div className="label rust">{hire.formLabel}</div>
                <span className="hire-live label">
                  <span aria-hidden="true" />
                  Bookings {minimum.toLowerCase()}
                </span>
              </div>
              <h2 className="block-title display">{hire.formTitle}</h2>
              <p className="block-note">{hire.formNote}</p>
              <BookingForm />
            </div>
          </div>
        </div>
      </section>

      {/* coverage, under the form: three lengths of day; each card glides back up to the form and fills in its length */}
      <section className="plans">
        <div className="wrap">
          <header className="d-head">
            <div className="sr">
              <h2 className="label rust">{hire.coverageLabel}</h2>
              <p className="d-title display">{hire.coverageTitle}</p>
            </div>
          </header>
          <ul className="plan-grid">
            {hire.plans.map((plan, i) => (
              <li className="plan sr" key={plan.name} style={{ '--i': i }}>
                <a className="plan-link" href="#booking" onClick={(e) => pickPlan(e, i)}>
                  <span className="plan-photo">
                    <img src={plan.photo} alt="" loading="lazy" />
                    <span className="plan-badge display">{plan.short}</span>
                  </span>
                  <span className="plan-body">
                    <span className="plan-name display">{plan.name}</span>
                    <span className="plan-suits label">Suits</span>
                    <span className="plan-list">
                      {plan.suits.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </span>
                    <span className="plan-go">
                      <span>Request this</span>
                      <Arrow />
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* questions */}
      <section className="faq">
        <div className="wrap faq-grid">
          <div className="sr">
            <h2 className="label rust">{hire.faqLabel}</h2>
            <p className="d-title display">{hire.faqTitle}</p>
          </div>
          <div className="faq-list">
            {hire.faq.map(([q, a], i) => (
              <details className="faq-item sr" key={q} style={{ '--i': i }} name="faq">
                <summary>
                  <span className="faq-n label">{pad(i + 1)}</span>
                  <span className="faq-q">{q}</span>
                  <span className="faq-ico" aria-hidden="true" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <Quote quote={quotes.hire} tone="paper" />
    </PageShell>
  );
}
