import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import useMenu from '../hooks/useMenu.js';
import BookButton from './BookButton.jsx';
import LogoMark from './LogoMark.jsx';
import Wordmark from './Wordmark.jsx';
import { brand, pages } from '../data/content.js';
import '../styles/header.css';

const TOP = 24; // within this many pixels of the top, the header sits clear over the page
const HIDE_AFTER = 120; // scrolling down hides it only once the visitor is past this
const NOISE = 4; // smaller scroll steps (trackpad jitter) change nothing
// the client area (sign-in and the gallery dashboard): the logo alone, no links, no buttons
const APP_PAGES = ['/login', '/dashboard'];

/*
  A link that opens a menu of its pages when clicked ("Our Work": Films, Production, Originals, and
  all the work). It closes on a choice, a click elsewhere, Escape (back to its button), the focus
  leaving it, a new page, or the header stepping away. It is marked current on any of its pages.
*/
function DropMenu({ page, onPointerEnter, away }) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const id = `hdr-menu-${page.to.replace(/\W+/g, '')}`;
  const current = pathname === page.to || pathname.startsWith(`${page.to}/`);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (away) setOpen(false);
  }, [away]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      btnRef.current?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // the arrow keys step through the items; down on the button opens the menu at its first item
  function onKeyDown(e) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...rootRef.current.querySelectorAll('.hdr-drop-link')];
    if (!items.length) return;
    e.preventDefault();
    if (!open) setOpen(true);
    const at = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    requestAnimationFrame(() => items[at < 0 ? 0 : next].focus());
  }

  return (
    <li
      className="hdr-drop-li"
      ref={rootRef}
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={btnRef}
        className={`hdr-link hdr-drop-btn${current ? ' is-current' : ''}`}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        onPointerEnter={onPointerEnter}
      >
        {page.label}
        <svg className="hdr-chev" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>
      <div className="hdr-drop" id={id} data-open={open ? '' : undefined}>
        <ul>
          {page.menu.map((item) => (
            <li key={item.to}>
              <NavLink className="hdr-drop-link" to={item.to} end onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
                <span className="hdr-drop-mark" aria-hidden="true">
                  <LogoMark bare />
                </span>
                <span className="hdr-drop-text">
                  <span className="hdr-drop-name">{item.name}</span>
                  <span className="hdr-drop-hint label">{item.eyebrow}</span>
                </span>
              </NavLink>
            </li>
          ))}
          <li className="hdr-drop-all">
            <NavLink className="hdr-drop-link" to={page.to} end onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>
              <span className="hdr-drop-name">All work</span>
              <svg className="hdr-drop-go" viewBox="0 0 14 10" aria-hidden="true">
                <path d="M1 5h12M9 1l4 4-4 4" />
              </svg>
            </NavLink>
          </li>
        </ul>
      </div>
    </li>
  );
}

/*
  The header of every page.
    top     at the top of the page: the full header, clear over the page
    shown   scrolling up: the full header on a frosted paper bar
    hidden  scrolling down: only the logo stays, on a small frosted pill
  Focus inside the header, or an open menu, always shows it whole.
  On the client pages (APP_PAGES) it is the logo alone. The photo storage (R2) status is shown only
  in the photographer panel, never on these public pages.
*/
export default function SiteHeader() {
  const { open: menuOpen, openMenu } = useMenu();
  const { pathname } = useLocation();
  const [mode, setMode] = useState('top');
  const [focused, setFocused] = useState(false);
  const navRef = useRef(null);
  const pillRef = useRef(null);

  /*
    The hover pill behind the links. Coming in from outside, it appears under the link
    pointed at; moving along the links, it slides from one to the next. Mouse only:
    a tap or the keyboard goes straight to the page, with nothing to follow.
  */
  function pointAt(e) {
    if (e.pointerType !== 'mouse') return;
    const nav = navRef.current;
    const pill = pillRef.current;
    if (!nav || !pill) return;
    const link = e.currentTarget;
    const arriving = nav.dataset.hover !== 'on';
    // a menu's button sits in its own positioned item: add that item's place in the row
    const holder = link.offsetParent;
    const x = link.offsetLeft + (holder?.classList.contains('hdr-drop-li') ? holder.offsetLeft : 0);
    pill.style.setProperty('--x', `${x}px`);
    pill.style.setProperty('--w', `${link.offsetWidth}px`);
    if (arriving) {
      getComputedStyle(pill).transform; // settle the jump before the slide transition switches on
      nav.dataset.hover = 'on';
    }
  }
  function leaveLinks() {
    if (navRef.current) delete navRef.current.dataset.hover;
  }

  useEffect(() => {
    // asked for less motion: the header never steps away, it simply stays (on its bar once off the top)
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let last = window.scrollY;
    let queued = false;
    function update() {
      queued = false;
      const y = window.scrollY;
      const dy = y - last;
      if (y <= TOP) setMode('top');
      else if (calm) setMode('shown');
      else if (Math.abs(dy) < NOISE) return; // keep `last` until the step is a real one
      else if (dy > 0 && y > HIDE_AFTER) setMode('hidden');
      else if (dy < 0) setMode('shown');
      last = y;
    }
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // a new page starts at its top, with the whole header
  useEffect(() => {
    setMode(window.scrollY <= TOP ? 'top' : 'shown');
  }, [pathname]);

  const app = APP_PAGES.includes(pathname);
  let state = mode;
  if ((focused || menuOpen) && mode === 'hidden') state = 'shown';

  return (
    <header
      className={`hdr${app ? ' hdr--app' : ''}`}
      data-state={state}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="hdr-bar" aria-hidden="true" />

      <div className="wrap hdr-in">
        <Link className="hdr-logo" to="/" aria-label={`${brand.name} ${brand.sub}, home`}>
          <span className="hdr-mark">
            <LogoMark bare />
          </span>
          <span className="hdr-name">
            <Wordmark className="hdr-title" />
            <span className="hdr-sub label">{brand.sub}</span>
          </span>
        </Link>

        {!app && (
          <nav
            className="hdr-links hdr-fade"
            aria-label="Main"
            ref={navRef}
            onPointerLeave={leaveLinks}
          >
            <span className="hdr-pill" ref={pillRef} aria-hidden="true" />
            <ul>
              {pages.map((page) =>
                page.menu ? (
                  <DropMenu key={page.to} page={page} onPointerEnter={pointAt} away={state === 'hidden'} />
                ) : (
                  <li key={page.to}>
                    <NavLink className="hdr-link" to={page.to} end onPointerEnter={pointAt}>
                      {page.label}
                    </NavLink>
                  </li>
                )
              )}
            </ul>
          </nav>
        )}

        {!app && (
          <div className="hdr-actions hdr-fade">
            <BookButton className="hdr-book" />
            <button
              className="hdr-menu"
              type="button"
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={openMenu}
            >
              <svg viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2 7h16M2 13h16" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
