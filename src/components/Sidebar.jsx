import { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import useDialog, { dialogProps } from '../hooks/useDialog.js';
import { useGalleryLink } from './BookButton.jsx';
import { Arrow, Cross } from './Icons.jsx';
import LogoMark from './LogoMark.jsx';
import Wordmark from './Wordmark.jsx';
import { brand, facts, menuCard, pages, slogans, studio } from '../data/content.js';
import '../styles/overlays.css';

const pad = (n) => String(n).padStart(2, '0');
const delivery = facts.rows.find(([k]) => k === 'Delivery')?.[1] ?? '';

/*
  The phone and tablet menu: a sheet from the right (the side its button is on).
  The brand and a round close button; one row per page with its number, a line on what is there and
  a small photograph, the current page on a raised panel; a booking card on a photograph; the
  studio's email and social links. Everything deals in once the sheet has started to slide.
*/
export default function Sidebar({ open, onClose }) {
  const ref = useDialog(open, 420);
  const { pathname } = useLocation();
  const galleryLink = useGalleryLink();

  // arriving on another page always closes it
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <dialog ref={ref} className="sheet sheet--right sidebar" aria-label="Menu" {...dialogProps(open, onClose)}>
      <div className="sb">
        <div className="sb-head">
          <Link className="sb-brand" to="/" onClick={onClose} aria-label={`${brand.name} ${brand.sub}, home`}>
            <LogoMark className="sb-brand-mark" />
            <span>
              <Wordmark className="sb-brand-name" />
              <span className="sb-brand-sub label">{brand.sub}</span>
            </span>
          </Link>
          <button className="sb-close" type="button" onClick={onClose} aria-label="Close menu">
            <Cross />
          </button>
        </div>

        <div className="sb-scroll">
          <nav className="sb-nav" aria-label="Pages">
            <p className="sb-kicker label" aria-hidden="true">
              Menu <span>{pad(pages.length)} pages</span>
            </p>
            <ul className="sb-list">
              {pages.map((page, i) => (
                <li key={page.to} style={{ '--i': i }}>
                  <NavLink className="sb-link" to={page.to} end onClick={onClose}>
                    <span className="sb-n label">{pad(i + 1)}</span>
                    <span className="sb-text">
                      <span className="sb-name display">{page.label}</span>
                      <span className="sb-hint">{page.hint}</span>
                    </span>
                    <span className="sb-thumb" aria-hidden="true">
                      <img src={page.thumb} alt="" loading="lazy" />
                      <span className="sb-go">
                        <Arrow />
                      </span>
                    </span>
                  </NavLink>
                  {/* the pages under it (Our Work: Films, Production, Originals) */}
                  {page.menu && (
                    <ul className="sb-sub" aria-label={page.label}>
                      {page.menu.map((item) => (
                        <li key={item.to}>
                          <NavLink className="sb-sub-link" to={item.to} end onClick={onClose}>
                            {item.name}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* the one action, on a photograph */}
          <div className="sb-card" style={{ '--i': pages.length }}>
            <img className="sb-card-img" src={menuCard.photo} alt="" loading="lazy" />
            <div className="sb-card-in">
              <span className="sb-chip label">
                <span aria-hidden="true" />
                {delivery}
              </span>
              <p className="sb-card-title display">{slogans.cta}</p>
              <Link className="sb-book glass-btn glass-btn--dark" to="/hire-us" onClick={onClose}>
                <span>Book a shoot</span>
                <span className="sb-book-ico" aria-hidden="true">
                  <Arrow />
                </span>
              </Link>
            </div>
          </div>

          <div className="sb-foot" style={{ '--i': pages.length + 1 }}>
            {/* the header's "Access your gallery" is hidden on these screens, so it lives here */}
            <Link className="sb-access" to={galleryLink} onClick={onClose}>
              <span className="sb-access-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <rect x="5" y="10.5" width="14" height="10" rx="2" />
                  <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
                </svg>
              </span>
              <span className="sb-access-text">
                <span>Access your gallery</span>
                <span className="sb-access-sub">Sign in to your private gallery</span>
              </span>
              <Arrow />
            </Link>
            <p className="sb-slogan display">{slogans.menu}</p>
            <a className="sb-mail" href={`mailto:${studio.email}`}>
              {studio.email}
            </a>
            <ul className="sb-social" aria-label="Follow the studio">
              {studio.social.map(([label, href]) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noreferrer">
                    {label}
                    <Arrow />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </dialog>
  );
}
