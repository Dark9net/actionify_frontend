import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Arrow } from '../../components/Icons.jsx';
import useFontsReady from '../../hooks/useFontsReady.js';
import { auth, brand } from '../../data/content.js';
import '../../styles/forms.css';
import '../../styles/auth.css';

/*
  The pages an emailed link opens (/verify-email, /reset-password): the sign-in page's film behind a
  narrower frosted card, with one heading and what the link needs.
*/
export default function AuthCard({ title, children }) {
  const ready = useFontsReady();
  const uid = useId();
  const filmRef = useRef(null);
  const [filmReady, setFilmReady] = useState(false);

  useEffect(() => {
    document.title = `${title} · ${brand.name}`;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) filmRef.current?.pause();
  }, [title]);

  return (
    <main id="main" className={`au${ready ? ' in' : ''}`}>
      <div className={`au-bg${filmReady ? ' is-ready' : ''}`} aria-hidden="true">
        <video
          ref={filmRef}
          src={auth.film}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={(e) => {
            setFilmReady(true);
            if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) e.currentTarget.play().catch(() => {});
          }}
        />
      </div>
      <section className="au-side au-side--narrow" aria-labelledby={`${uid}-h`}>
        <div className="au-inner au-rise" style={{ '--i': 0 }}>
          <h1 className="au-h2 display au-card-title" id={`${uid}-h`}>
            {title}
          </h1>
          {children}
        </div>
      </section>
    </main>
  );
}

/* The way back to the sign-in page, as a button. */
export function ToSignIn({ label = 'Sign in' }) {
  return (
    <Link className="btn glass-btn au-submit" to="/login">
      <span>{label}</span>
      <Arrow />
    </Link>
  );
}

/* The drawn tick from the sign-in page, for a step that went through. */
export function Tick() {
  return (
    <span className="au-done-tick" aria-hidden="true">
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" />
        <path d="M12.5 20.5l5 5 10-11" />
      </svg>
    </span>
  );
}
