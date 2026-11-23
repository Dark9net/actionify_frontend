import { Link } from 'react-router-dom';
import { landingFor, useSession } from '../lib/auth.js';
import { bookPrints } from '../data/content.js';
import '../styles/book-button.css';

/*
  "Access your gallery": the header's way into the sign-in page (/login), or past it (useGalleryLink).
  - Idle: a thin amber light travels round the border (one lap in 3.5 s),
    so the button reads as live without moving anything else.
  - Hover / focus: the little stack of prints fans open, the ground warms,
    the arrow swaps and the button lifts 1px. Press: scales to 0.97.
  - Arrives with the header, then the stack deals its three prints in.
  Reduced motion: no travelling light, no fan, no entrance.
*/
const ArrowPath = () => (
  <svg viewBox="0 0 14 10">
    <path d="M1 5h12M9 1l4 4-4 4" />
  </svg>
);

/*
  Where it goes: the sign-in page, which sends a visitor already signed in on this browser (the
  sign-in cookie) straight on to the photographer panel (staff) or their gallery dashboard (a client).
  When this tab already knows they are signed in, it skips the sign-in page and goes there itself.
*/
export function useGalleryLink() {
  const { status, user } = useSession();
  return status === 'signedIn' ? landingFor(user) || '/login' : '/login';
}

export default function BookButton({ className = '' }) {
  const to = useGalleryLink();
  return (
    <Link to={to} className={`book-btn ${className}`}>
      <span className="book-btn__ring" aria-hidden="true" />
      <span className="book-btn__stack" aria-hidden="true">
        {bookPrints.map((src, i) => (
          <span className="book-btn__print" style={{ '--i': i }} key={src}>
            <img src={src} alt="" width="20" height="26" decoding="async" />
          </span>
        ))}
      </span>
      <span className="book-btn__label">Access your gallery</span>
      <span className="book-btn__arrow" aria-hidden="true">
        <ArrowPath />
        <ArrowPath />
      </span>
    </Link>
  );
}
