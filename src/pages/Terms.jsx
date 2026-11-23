import { useEffect, useState } from 'react';
import PageShell from '../components/PageShell.jsx';
import { glideTo } from '../lib/scroll.js';
import { studio, terms } from '../data/content.js';
import '../styles/terms.css';

const pad = (n) => String(n).padStart(2, '0');

/*
  The terms of service (/terms), opened from the sign-up form and the footer. Beside the text, a list
  of its sections that stays in view: the one being read is marked, and a link glides to its section.
*/
export default function Terms() {
  const [active, setActive] = useState(terms.sections[0].id);

  // the section nearest the top third of the screen is the one being read
  useEffect(() => {
    const els = terms.sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]) setActive(seen[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <PageShell name="Terms of service" title={terms.title} slogan={terms.slogan} intro={terms.intro}>
      <section className="tos">
        <div className="wrap tos-grid">
          <nav className="tos-nav" aria-label="Sections of the terms">
            <p className="label rust">Last updated {terms.updated}</p>
            <ol>
              {terms.sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={glideTo}
                    className={active === s.id ? 'on' : undefined}
                    aria-current={active === s.id ? 'location' : undefined}
                  >
                    <span className="tos-n">{pad(i + 1)}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
            <button className="glass-btn tos-print" type="button" onClick={() => window.print()}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 9V4h10v5M7 17H5a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 5 9h14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 19 17h-2" />
                <path d="M7 14h10v6H7z" />
              </svg>
              Print or save as PDF
            </button>
          </nav>

          <div className="tos-body">
            {terms.sections.map((s, i) => (
              <article className="tos-sec sr" id={s.id} key={s.id} aria-labelledby={`${s.id}-h`}>
                <h2 className="tos-h display" id={`${s.id}-h`}>
                  <span className="tos-h-n label rust">{pad(i + 1)}</span>
                  {s.title}
                </h2>
                {s.body.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </article>
            ))}

            <aside className="tos-contact sr">
              <h2 className="display">{terms.contactTitle}</h2>
              <p>{terms.contactText}</p>
              <a className="glass-btn tos-mail" href={`mailto:${studio.email}?subject=${encodeURIComponent('A question about your terms')}`}>
                {studio.email}
              </a>
            </aside>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
