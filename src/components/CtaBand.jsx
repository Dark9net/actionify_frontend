import { Link } from 'react-router-dom';
import { Arrow } from './Icons.jsx';
import { slogans } from '../data/content.js';
import '../styles/sections.css';

/* The closing line of a page: one question, one way to book a shoot. */
export default function CtaBand() {
  return (
    <section className="cta-band">
      <div className="wrap cta-in">
        <h2 className="cta-title display">{slogans.cta}</h2>
        <Link className="btn glass-btn" to="/hire-us">
          <span>Book a shoot</span>
          <Arrow />
        </Link>
      </div>
    </section>
  );
}
