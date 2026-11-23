import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LogoMark from './LogoMark.jsx';
import Wordmark from './Wordmark.jsx';
import { brand, details, facts, footer, pages, services, studio } from '../data/content.js';
import '../styles/footer.css';

const fact = (key) => facts.rows.find(([k]) => k === key)?.[1] ?? '';

/* Small line icons for the chips and the button; they take the text colour. */
const Ico = {
  camera: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 8h3.5l1.7-2.5h7.6L17.5 8H21v11H3z" />
      <circle cx="12" cy="13.3" r="3.4" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c.4-3.6 2.8-5.6 6-5.6s5.6 2 6 5.6" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.6c1.8.6 2.8 2.4 3 5.4" />
    </svg>
  ),
};

/* The social networks' own marks, drawn as single-colour glyphs that take the text colour. */
const Social = {
  Instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.2" cy="6.8" r="1.1" className="ft-fill" />
    </svg>
  ),
  Facebook: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="ft-fill"
        d="M13.4 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.5-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.7v3h2.6V21z"
      />
    </svg>
  ),
};

/*
  The footer of every page: a full-screen dusk meadow (video) under the paper, the brand set large
  in amber at the foot, its letters dealt in by the scroll, and four columns over the top.
*/
export default function Footer() {
  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const [near, setNear] = useState(false);
  const year = new Date().getFullYear();

  // load the video only as the footer approaches the screen
  useEffect(() => {
    const el = rootRef.current;
    if (!el || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '600px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  // with reduced motion the video stays on its first frame
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) v.pause();
    else v.play().catch(() => {});
  }, [near]);

  // the name at the foot: its letters rise in one after another as the footer scrolls up into view,
  // and go again one after another, last letter first, as it scrolls back down. Each letter reads its
  // own stretch of the scroll from an eased copy of the position, so it moves smoothly.
  const markRef = useRef(null);
  useEffect(() => {
    const letters = [...markRef.current.querySelectorAll('.ft-l')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      letters.forEach((l) => l.style.setProperty('--t', '1'));
      return;
    }
    const n = letters.length;
    let target = 0;
    let cur = 0;
    let raf = 0;
    // 0 as the name's top comes up over the foot of the screen, 1 at the very bottom of the page,
    // so the last letter lands just as the scroll runs out, on any screen
    const mark = markRef.current;
    const seen = () => {
      const vh = window.innerHeight;
      const top = mark.getBoundingClientRect().top;
      const left = document.documentElement.scrollHeight - vh - window.scrollY; // scroll still to go
      const run = vh - (top - left);
      return run <= 0 ? 1 : Math.min(1, Math.max(0, (vh - top) / run));
    };
    const paint = () => {
      letters.forEach((l, i) => {
        const start = (i / n) * 0.62;
        const t = Math.min(1, Math.max(0, (cur - start) / 0.34));
        l.style.setProperty('--t', t.toFixed(3));
      });
    };
    const tick = () => {
      raf = 0;
      const gap = target - cur;
      if (Math.abs(gap) < 0.001) cur = target;
      else {
        cur += gap * 0.14;
        raf = requestAnimationFrame(tick);
      }
      paint();
    };
    const onScroll = () => {
      target = seen();
      if (!raf) raf = requestAnimationFrame(tick);
    };
    target = cur = seen();
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <footer className="footer" ref={rootRef}>
      <div className="ft-stage" aria-hidden="true">
        {near && (
          <video
            ref={videoRef}
            className="ft-video"
            src={footer.video}
            muted
            loop
            playsInline
            preload="auto"
          />
        )}
      </div>

      {/* the logo's own letters, one <svg> each, so they rise in one by one */}
      <p className="ft-wordmark" aria-hidden="true" ref={markRef}>
        <Wordmark split letterClass="ft-l" />
      </p>

      <div className="ft-content">
        <div className="ft-brand">
          <Link className="ft-logo" to="/" aria-label={`${brand.name} ${brand.sub}, home`}>
            <LogoMark className="ft-mark" />
            <Wordmark className="ft-word" />
          </Link>
          <h2 className="ft-title">{footer.title}</h2>
          <p className="ft-text">{details.intro}</p>
          <Link className="ft-cta glass-btn" to="/hire-us">
            {Ico.camera}
            Book a shoot
          </Link>
          <p className="ft-copy">
            © {year} {brand.name} {brand.sub} ·{' '}
            <Link className="ft-terms" to="/terms">
              Terms of service
            </Link>
          </p>
          <p className="ft-credit">{footer.credit}</p>
          <ul className="ft-status" aria-label="The studio at a glance">
            <li className="ft-chip">
              <span className="ft-dot" aria-hidden="true" />
              {fact('Delivery')}
            </li>
            <li className="ft-chip">
              {Ico.people}
              {fact('Crew')}
            </li>
          </ul>
        </div>

        <nav className="ft-col ft-col--menu" aria-label="Pages">
          <h3 className="ft-col-title">Pages</h3>
          <ul className="ft-list">
            {pages.map((page) => (
              <li key={page.to}>
                <Link to={page.to}>{page.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="ft-col ft-col--services" aria-label="Services">
          <h3 className="ft-col-title">Services</h3>
          <ul className="ft-list">
            {services.items.map((item) => (
              <li key={item.tag}>
                <Link to={`/our-work?show=${item.tag}#gallery`}>{item.name}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ft-col">
          <h3 className="ft-col-title">Contact</h3>
          <ul className="ft-list">
            <li>
              <a href={`mailto:${studio.email}`}>{studio.email}</a>
            </li>
            {studio.phone && (
              <li>
                <a href={`tel:${studio.phone.replace(/[^+\d]/g, '')}`}>{studio.phone}</a>
              </li>
            )}
            {studio.location && <li>{studio.location}</li>}
            <li className="ft-social">
              {studio.social.map(([label, href]) => (
                <a key={label} className="ft-soc" href={href} target="_blank" rel="noreferrer" aria-label={`${label} (opens in a new tab)`} title={label}>
                  {Social[label] ?? label}
                </a>
              ))}
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
