import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Lightbox from '../../components/Lightbox.jsx';
import useDialog, { dialogProps } from '../../hooks/useDialog.js';
import useFontsReady from '../../hooks/useFontsReady.js';
import { getSession, isStaff, restoreSession, signOut, NotConnected } from '../../lib/auth.js';
import {
  checkGallery,
  enterGallery,
  forgetVisit,
  leaveGallery,
  myGalleries,
  openByCode,
  rememberVisit,
  visitRanOut,
  CHECK_IN_MS,
  VISIT_ENDED,
  CODE_FIRST,
} from '../../lib/gallery.js';
import { CODE_LENGTH, formatCode, isCode } from '../../lib/galleryCode.js';
import { downloadPhotos, formatBytes } from '../../lib/download.js';
import { allGalleryItems, galleryDetails } from '../../lib/customerGallery.js';
import useMarquee from './useMarquee.js';
import { auth, brand, studio } from '../../data/content.js';
import '../../styles/auth.css';
import '../../styles/dashboard.css';

const pad = (n) => String(n).padStart(2, '0');
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/* "2026-06-14" → "Sunday 14 June 2026" (midday, so no time zone moves the day) */
const longDate = (d) => {
  if (!d) return '';
  const t = new Date(`${d}T12:00`);
  return `${t.toLocaleDateString('en-GB', { weekday: 'long' })} ${t.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
};
const dayMonthYear = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
/* ["Asha", "Bikash", "Chandra"] → "Asha, Bikash and Chandra" */
const names = (list) => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);
/* a tall photo takes two rows of the grid */
const shapeOf = (p) => (p.width && p.height && p.height > p.width * 1.1 ? 'p' : 'l');
// the links to the files are asked for again this long before they run out
const RELINK_MS = 3 * 60_000;
// what ends the gallery for this browser (the dashboard then goes back to the sign-in page)
const GONE = new Set(['GALLERY_SESSION_ENDED', 'GALLERY_EXPIRED', 'GALLERY_GONE']);

/* names inside one .zip, each once: a second "IMG_0412.jpg" becomes "IMG_0412-2.jpg" */
function zipNames(list) {
  const seen = new Map();
  return list.map((p) => {
    const n = (seen.get(p.name) || 0) + 1;
    seen.set(p.name, n);
    if (n === 1) return p.name;
    const dot = p.name.lastIndexOf('.');
    return dot > 0 ? `${p.name.slice(0, dot)}-${n}${p.name.slice(dot)}` : `${p.name}-${n}`;
  });
}

const Ico = {
  download: <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4.5 19.5h15" />,
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />,
  expand: <path d="M14.5 4.5h5v5M9.5 19.5h-5v-5M19.5 4.5l-6 6M4.5 19.5l6-6" />,
  play: <path d="M9 6.5v11l9-5.5z" fill="currentColor" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  leave: <path d="M14 4.5h4.5v15H14M10 8l-4 4 4 4M6 12h9" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" />
    </>
  ),
  check: <path d="M5 12.5l4.2 4.2L19 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  select: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
    </>
  ),
  marquee: (
    <>
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M12 4h2M18 4h.5A1.5 1.5 0 0 1 20 5.5V8M20 12v2M4 12v2M4 18v.5A1.5 1.5 0 0 0 5.5 20H8" />
      <path d="M13 13l7 2.6-3 1.2-1.2 3z" />
    </>
  ),
  large: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  small: (
    <>
      <rect x="4" y="4" width="4" height="4" rx="1" />
      <rect x="10" y="4" width="4" height="4" rx="1" />
      <rect x="16" y="4" width="4" height="4" rx="1" />
      <rect x="4" y="10" width="4" height="4" rx="1" />
      <rect x="10" y="10" width="4" height="4" rx="1" />
      <rect x="16" y="10" width="4" height="4" rx="1" />
      <rect x="4" y="16" width="4" height="4" rx="1" />
      <rect x="10" y="16" width="4" height="4" rx="1" />
      <rect x="16" y="16" width="4" height="4" rx="1" />
    </>
  ),
  // a contact sheet: sixteen tiny frames
  tiny: (
    <>
      {[3.5, 8.25, 13, 17.75].flatMap((y) =>
        [3.5, 8.25, 13, 17.75].map((x) => <rect className="db-dot" key={`${x}-${y}`} x={x} y={y} width="3" height="3" rx=".7" />)
      )}
    </>
  ),
};
const Icon = ({ name, className = 'db-ico' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    {Ico[name]}
  </svg>
);

/* Favourites stay on this device, per gallery code, so a guest can come back to their picks. */
function readFavourites(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch {
    return new Set();
  }
}
function useFavourites(code) {
  const key = `actionify:favourites:${code || ''}`;
  const [fav, setFav] = useState(() => (code ? readFavourites(key) : new Set()));
  // the code arrives with the gallery: its favourites come with it
  useEffect(() => {
    setFav(code ? readFavourites(key) : new Set());
  }, [code, key]);
  const save = (next) => {
    if (!code) return next;
    try {
      localStorage.setItem(key, JSON.stringify([...next]));
    } catch {
      /* storage off: favourites last until the page closes */
    }
    return next;
  };
  // the photos picked, all in or all out (Favourite in the dock)
  const setMany = (ids, on) =>
    setFav((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return save(next);
    });
  return [fav, setMany];
}

/* The album filter: a pill of glass slides under the album that is shown. */
function Albums({ albums, show, counts, onChoose }) {
  const barRef = useRef(null);
  const [pill, setPill] = useState(null);
  useLayoutEffect(() => {
    const bar = barRef.current;
    const place = () => {
      const on = bar.querySelector('[aria-pressed="true"]');
      if (on) setPill({ x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight });
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [show]);

  const options = [['all', 'All photos'], ...albums.map((a) => [a.id, a.name]), ['favourites', 'Favourites']];
  return (
    <div className="db-albums" ref={barRef} role="group" aria-label="Show an album">
      {pill && (
        <span
          className="db-albums-pill"
          aria-hidden="true"
          style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h }}
        />
      )}
      {options.map(([key, label]) => (
        <button key={key} className="db-album" type="button" aria-pressed={show === key} onClick={() => onChoose(key)}>
          {key === 'favourites' && <Icon name="heart" className="db-album-heart" />}
          {label}
          <span className="db-album-n">{counts[key] ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

/* "Share the gallery": the gallery's private link to copy and its QR code (both open this gallery only). */
function ShareDialog({ open, onClose, gallery }) {
  const ref = useDialog(open, 300);
  const uid = useId();
  const [copied, setCopied] = useState(false);
  const url = gallery.link || '';

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.getElementById(`${uid}-url`);
      input?.select();
      document.execCommand?.('copy');
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <dialog ref={ref} className="au-dialog db-share" aria-labelledby={`${uid}-t`} {...dialogProps(open, onClose)}>
      <div className="au-dlg-in">
        <button className="glass-btn au-dlg-close" type="button" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
          </svg>
        </button>
        <span className="au-badge" aria-hidden="true">
          <Icon name="share" className="" />
        </span>
        <h2 className="au-dlg-title display" id={`${uid}-t`}>
          Share the gallery
        </h2>
        <p className="au-dlg-note">
          Anyone with this link, the QR code or the code <strong>{gallery.code}</strong> can open the gallery. Share it
          with your guests only.
        </p>
        {url && (
          <>
            <div className="db-link">
              <label className="sr-only" htmlFor={`${uid}-url`}>
                Gallery link
              </label>
              <input id={`${uid}-url`} type="text" readOnly value={url} onFocus={(e) => e.target.select()} />
              <button className={`glass-btn db-copy${copied ? ' is-done' : ''}`} type="button" onClick={copy}>
                <Icon name={copied ? 'check' : 'copy'} />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="sr-only" role="status">
              {copied ? 'Link copied' : ''}
            </p>
          </>
        )}
        {gallery.qr && (
          <>
            <div className={`db-qr${open ? ' in' : ''}`}>
              <img className="db-qr-img" src={gallery.qr} alt="QR code that opens this gallery" width="200" height="200" />
              <span className="qr-scan" aria-hidden="true" />
            </div>
            <p className="db-qr-note">Print it on the table cards: guests scan it and the gallery opens.</p>
          </>
        )}
      </div>
    </dialog>
  );
}

/* The ring in the dock: fills as the photos arrive, turns into a tick when the file is saved. */
function Ring({ value, done, busy }) {
  const R = 15;
  const C = 2 * Math.PI * R;
  return (
    <span className={`db-ring${done ? ' is-done' : ''}${busy ? ' is-busy' : ''}`} aria-hidden="true">
      <svg className="db-ring-svg" viewBox="0 0 36 36">
        <circle className="db-ring-track" cx="18" cy="18" r={R} />
        <circle className="db-ring-bar" cx="18" cy="18" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - (busy ? 0.28 : value))} />
      </svg>
      <Icon name={done ? 'check' : 'download'} />
    </span>
  );
}

/*
  The dock: a pane of smoked glass at the foot of the screen. With photos picked it says how many and
  what can be done with them (pick them all, favourite them, download them as one file); while a
  download runs it shows the progress and a way to stop it, then the name of the file saved.
*/
function Dock({ shown, count, inView, allInView, allFav, job, onClear, onSelectAll, onFavourite, onDownload, onStop }) {
  const running = job?.phase === 'run';
  return (
    <div className={`db-dock${shown ? ' on' : ''}`} role="region" aria-label="Selected photos" aria-hidden={!shown} inert={!shown}>
      {job ? (
        <div className="db-job">
          <Ring value={job.total ? job.done / job.total : 0} done={job.phase === 'done'} busy={running && job.total === 1} />
          <div className="db-job-text" role="status">
            <p className="db-job-t">
              {job.phase === 'done' ? 'Saved to your downloads' : job.total > 1 ? `Packing ${job.done} of ${job.total} photos` : 'Downloading the photo'}
            </p>
            <p className="db-job-s">
              {job.phase === 'done' ? job.filename : `${formatBytes(job.bytes)} · ${job.total > 1 ? 'one .zip file, full quality' : 'full quality'}`}
            </p>
          </div>
          {running && (
            <button className="db-dock-btn" type="button" onClick={onStop}>
              Stop
            </button>
          )}
        </div>
      ) : (
        <div className="db-dock-row">
          <button className="db-dock-x" type="button" onClick={onClear} aria-label="Clear the selection">
            <Icon name="close" />
          </button>
          <p className="db-dock-n" aria-live="polite">
            {count ? (
              <>
                <strong>{count}</strong> selected
              </>
            ) : (
              <span className="db-dock-hint">
                <span className="db-hint-fine">Drag across photos, or tick them</span>
                <span className="db-hint-touch">Tap photos to pick them</span>
              </span>
            )}
          </p>
          <span className="db-dock-sep" aria-hidden="true" />
          <button className="db-dock-btn db-dock-all" type="button" onClick={onSelectAll} disabled={!inView}>
            {allInView ? 'Deselect all' : (
              <>
                Select all<span className="db-dock-label"> {inView}</span>
              </>
            )}
          </button>
          <button className="db-dock-btn db-dock-fav" type="button" onClick={onFavourite} disabled={!count} aria-pressed={allFav && count > 0}>
            <Icon name="heart" />
            <span className="db-dock-label">{allFav && count ? 'Unfavourite' : 'Favourite'}</span>
          </button>
          <button className="glass-btn db-dock-go" type="button" onClick={onDownload} disabled={!count}>
            <Icon name="download" />
            <span>
              Download<span className="db-dock-label">{count > 1 ? ` ${count}` : ''}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

/* where a drag-to-select may not start: the controls, the cover, the windows */
const NO_DRAG = '.db-cover, .db-bar, .db-tools, .db-dock, .db-check, .db-tool, a, input, dialog, .hdr, .to-top';

/*
  The gallery dashboard (/dashboard), opened with a gallery code. Everything on it comes from the
  studio's own records (/api/v1/customer-gallery, lib/customerGallery.js): the event the code was made
  for (its name, kind, day, venue and who photographed it), its albums (the event's categories) and its
  photographs and videos on R2. The code decides the event: nothing else can be opened from here.

  A cover with the event and "Download all" (every file in one .zip), then the photographs under a bar of
  glass that follows the page: the albums, "Select", and the size of the photos. Pick photos by dragging
  across them (a rectangle of glass follows the cursor), by their round tick, with Shift for a run, or
  Ctrl/Cmd+A for all; the dock at the foot then favourites or downloads them. The links to the files are
  signed for a while, so they are asked for again before they run out. Who may see it is decided by
  Dashboard, at the end of this file; `onGone` hands back a gallery that ended while open.
*/
function GalleryView({ onLeave, onGone }) {
  const ready = useFontsReady();
  const [g, setG] = useState(null); // the event, albums, totals, cover, code and its link
  const [all, setAll] = useState([]); // every photograph and video, as the pages arrive
  const [phase, setPhase] = useState('loading'); // loading | more | ready
  const [fail, setFail] = useState('');
  const [linksUntil, setLinksUntil] = useState(0);
  const [show, setShow] = useState('all');
  const [fav, setFavMany] = useFavourites(g?.gallery.code);
  const [open, setOpen] = useState(-1);
  const [share, setShare] = useState(false);
  const [toast, setToast] = useState('');
  const [size, setSize] = useState('large');
  const [sel, setSel] = useState(() => new Set());
  const [picking, setPicking] = useState(false);
  const [job, setJob] = useState(null);
  const mainRef = useRef(null);
  const boxRef = useRef(null);
  const photosRef = useRef(null);
  const toolsRef = useRef(null);
  const [stuck, setStuck] = useState(false);
  const anchor = useRef(-1);
  const stopRef = useRef(null);
  const selRef = useRef(sel);
  selRef.current = sel;

  const selecting = picking || sel.size > 0;

  /*
    The gallery, then its files a page at a time (the grid fills as they come). `quiet`: the links are
    being renewed, so what is on screen stays until the fresh set replaces it.
  */
  const load = useCallback(
    async (quiet = false) => {
      try {
        const d = await galleryDetails();
        setG(d);
        setFail('');
        const out = await allGalleryItems({
          onPage: quiet
            ? undefined
            : (list) => {
                setAll(list);
                setPhase('more');
              },
        });
        setAll(out.items);
        setPhase('ready');
        setLinksUntil(Math.min(Date.parse(d.linksUntil), Date.parse(out.linksUntil || d.linksUntil)));
      } catch (err) {
        if (GONE.has(err.code)) return onGone(err);
        // offline or a hiccup: a renewal tries again shortly; a first load says so
        if (quiet) setLinksUntil(Date.now() + RELINK_MS + 60_000);
        else setFail(err instanceof NotConnected ? auth.offline : err.message);
      }
    },
    [onGone]
  );

  useEffect(() => {
    load();
  }, [load]);

  // the links run out: ask again a few minutes before
  useEffect(() => {
    if (!linksUntil) return undefined;
    const t = setTimeout(() => load(true), Math.max(30_000, linksUntil - Date.now() - RELINK_MS));
    return () => clearTimeout(t);
  }, [linksUntil, load]);

  useEffect(() => {
    document.title = g ? `${g.event.name} · ${brand.name}` : `Your gallery · ${brand.name}`;
  }, [g]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4600);
    return () => clearTimeout(t);
  }, [toast]);

  // a saved file's message stays a moment, then the dock goes back to the selection (or away)
  useEffect(() => {
    if (job?.phase !== 'done') return;
    const t = setTimeout(() => setJob(null), 3400);
    return () => clearTimeout(t);
  }, [job]);

  /*
    Once the bar of albums reaches the top it stops there, beside the logo: it takes the space to the
    right of the brand name (from 561px up; on a phone it stays under the logo).
  */
  const shown = Boolean(g);
  useEffect(() => {
    const el = toolsRef.current;
    if (!el) return;
    const wide = window.matchMedia('(min-width: 561px)');
    let raf = 0;
    const measure = () => {
      raf = 0;
      const top = parseFloat(getComputedStyle(el).top) || 0;
      const on = wide.matches && window.scrollY > 0 && el.getBoundingClientRect().top <= top + 1;
      if (on) {
        const logo = document.querySelector('.hdr-logo')?.getBoundingClientRect();
        const left = el.parentElement.getBoundingClientRect().left;
        if (logo) el.style.setProperty('--beside', `${Math.max(0, Math.round(logo.right + 14 - left))}px`);
      }
      setStuck(on);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
    };
  }, [shown]);

  // leaving the page stops a download on its way
  useEffect(() => () => stopRef.current?.abort(), []);

  const albums = useMemo(() => g?.albums || [], [g]);
  // each file's place in the whole gallery: "Photo 12 of 240"
  const order = useMemo(() => new Map(all.map((p, i) => [p.id, i])), [all]);

  const counts = useMemo(() => {
    const c = { all: phase === 'ready' ? all.length : g?.totals.files ?? 0, favourites: all.filter((p) => fav.has(p.id)).length };
    albums.forEach((a) => (c[a.id] = phase === 'ready' ? all.filter((p) => p.album === a.id).length : a.count));
    return c;
  }, [all, fav, albums, g, phase]);

  const items = useMemo(
    () =>
      show === 'all'
        ? all
        : show === 'favourites'
          ? all.filter((p) => fav.has(p.id))
          : all.filter((p) => p.album === show),
    [all, show, fav]
  );

  const altOf = useCallback(
    (p) => `${p.kind === 'video' ? 'Video' : 'Photo'} ${(order.get(p.id) ?? 0) + 1} of ${g?.totals.files ?? all.length}${g ? `, ${g.event.name}` : ''}`,
    [order, g, all.length]
  );
  const slides = useMemo(
    () => items.map((p) => ({ full: p.url, alt: altOf(p), video: p.kind === 'video', poster: p.hasPreview ? p.previewUrl : null })),
    [items, altOf]
  );

  const clear = useCallback(() => {
    setSel(new Set());
    setPicking(false);
    anchor.current = -1;
  }, []);

  const allInView = items.length > 0 && items.every((p) => sel.has(p.id));
  const selectAll = useCallback(() => {
    setSel((prev) => {
      const next = new Set(prev);
      const every = items.every((p) => next.has(p.id));
      items.forEach((p) => (every ? next.delete(p.id) : next.add(p.id)));
      return next;
    });
  }, [items]);

  // one photo in or out; with Shift, the whole run from the last one picked
  const toggle = (id, i, run) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (run && anchor.current >= 0 && anchor.current < items.length) {
        const [a, b] = [Math.min(anchor.current, i), Math.max(anchor.current, i)];
        for (let k = a; k <= b; k++) next.add(items[k].id);
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    anchor.current = i;
  };

  useMarquee({
    areaRef: mainRef,
    boxRef,
    tileSelector: '.db-tile',
    ignore: NO_DRAG,
    getSelection: () => selRef.current,
    onPreview: setSel,
    onCommit: setSel,
    onCancel: setSel,
    enabled: shown, // the page is drawn once the gallery has come
  });

  // Ctrl/Cmd+A picks every photo shown; Escape lets them go
  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector('dialog[open]')) return;
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSel(new Set(items.map((p) => p.id)));
      } else if (e.key === 'Escape' && (selRef.current.size || picking)) {
        clear();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, picking, clear]);

  // the files as they were uploaded, at full quality (one saves as itself, several as one .zip)
  async function download(list, zipName) {
    if (!list.length || job?.phase === 'run') return;
    const ctrl = new AbortController();
    stopRef.current = ctrl;
    setJob({ phase: 'run', done: 0, total: list.length, bytes: 0 });
    const fileNames = zipNames(list);
    try {
      const r = await downloadPhotos(
        list.map((p, i) => ({ url: p.downloadUrl, name: fileNames[i] })),
        {
          zipName,
          signal: ctrl.signal,
          onProgress: (p) => setJob((j) => (j?.phase === 'run' ? { ...j, ...p } : j)),
        }
      );
      setJob({ phase: 'done', done: list.length, total: list.length, bytes: r.bytes, filename: r.filename });
    } catch (err) {
      setJob(null);
      if (err?.name === 'AbortError') setToast('Download stopped. Nothing was saved.');
      else if (list.length === 1) {
        // the file could not be fetched here: its own link saves it straight from storage
        window.open(list[0].downloadUrl, '_blank', 'noopener');
      } else setToast('The photos could not be fetched just now. Check your connection and try again.');
    } finally {
      stopRef.current = null;
    }
  }

  const slug = g?.event.slug || 'gallery';
  const loadedAll = phase === 'ready';
  const downloadAll = () => download(all, `${slug}-all-${all.length}-files.zip`);
  const downloadSelected = () => {
    const picked = all.filter((p) => sel.has(p.id));
    download(picked, `${slug}-${picked.length}-files.zip`);
  };
  const pickedIds = [...sel];
  const allFav = pickedIds.length > 0 && pickedIds.every((id) => fav.has(id));

  const choose = (key) => {
    setOpen(-1);
    setShow(key);
    anchor.current = -1;
  };
  const jumpTo = (key) => {
    choose(key);
    photosRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };

  const onTile = (e, i, p) => {
    if (selecting || e.shiftKey || e.metaKey || e.ctrlKey) toggle(p.id, i, e.shiftKey);
    else setOpen(i);
  };

  const leave = () => {
    stopRef.current?.abort();
    onLeave();
  };

  // an album's picture: its first photo (a photo always has an image to show; a video only with its still)
  const firstOf = (album) => all.find((p) => p.album === album && (p.kind === 'photo' || p.hasPreview));

  // the first answer: nothing to show yet, or it could not be had
  if (!g) {
    if (!fail) return <main id="main" className="db-gate" aria-busy="true" aria-label="Opening your gallery" />;
    return (
      <GateCard title="The gallery could not be loaded" onLeave={leave} leaveLabel="Leave gallery">
        <p className="db-gate-alert" role="alert">
          {fail}
        </p>
        <button className="btn glass-btn" type="button" onClick={() => load()}>
          Try again
        </button>
      </GateCard>
    );
  }

  const { event, totals, gallery } = g;
  const nothing = loadedAll && all.length === 0;
  const photographers = event.photographers.length ? `Photographed by ${names(event.photographers)} · ${brand.name}` : `Photographed by ${brand.name}`;
  const keptFor = gallery.expiresAt ? `Online until ${dayMonthYear(gallery.expiresAt)}` : 'Kept online by the studio';
  const what = totals.videos ? plural(totals.files, 'file') : plural(totals.photos, 'photo');

  return (
    <main id="main" ref={mainRef} className={`db${ready ? ' in' : ''}${selecting ? ' is-selecting' : ''}`}>
      {/* the colour behind everything: the cover photo, blurred to a wash, so the glass has something to frost */}
      <div className="db-ambient" aria-hidden="true">
        {g.cover && <img src={g.cover} alt="" />}
      </div>

      <div className="wrap">
        {/* the bar under the logo: which gallery this is, and the way out */}
        <div className="db-bar db-rise" style={{ '--i': 0 }}>
          <span className="db-chip">
            <Icon name="lock" />
            <span className="db-chip-text">Private gallery</span>
            <span className="db-chip-code">{gallery.code}</span>
          </span>
          <div className="db-bar-end">
            {gallery.link && (
              <button className="glass-btn db-pill" type="button" onClick={() => setShare(true)} aria-haspopup="dialog">
                <Icon name="share" />
                <span className="db-pill-more">Share</span>
              </button>
            )}
            <button className="glass-btn db-pill" type="button" onClick={leave}>
              <Icon name="leave" />
              <span>
                Leave<span className="db-pill-more"> gallery</span>
              </span>
            </button>
          </div>
        </div>

        {/* the cover: the event on a pane of smoked glass, the albums beside it */}
        <section className="db-cover" aria-labelledby="db-title">
          <div className="db-cover-photo">{g.cover && <img src={g.cover} alt={`From ${event.name}`} fetchPriority="high" />}</div>

          <div className="db-cover-card">
            <span className="label db-cover-label db-rise" style={{ '--i': 1 }}>
              {event.kind}
            </span>
            <h1 className="db-title display db-rise" id="db-title" style={{ '--i': 2 }}>
              {event.name}
            </h1>
            <p className="db-when db-rise" style={{ '--i': 3 }}>
              {longDate(event.date)}
              {event.venue ? ` · ${event.venue}` : ''}
            </p>
            <ul className="db-stats db-rise" style={{ '--i': 4 }}>
              <li>
                <strong>{pad(totals.photos)}</strong> {totals.photos === 1 ? 'photo' : 'photos'}
              </li>
              {totals.videos > 0 && (
                <li>
                  <strong>{pad(totals.videos)}</strong> {totals.videos === 1 ? 'video' : 'videos'}
                </li>
              )}
              {albums.length > 0 && (
                <li>
                  <strong>{pad(albums.length)}</strong> {albums.length === 1 ? 'album' : 'albums'}
                </li>
              )}
              <li>{keptFor}</li>
            </ul>
            <div className="db-actions db-rise" style={{ '--i': 5 }}>
              <button
                className="glass-btn db-act db-act--main"
                type="button"
                onClick={downloadAll}
                disabled={job?.phase === 'run' || !loadedAll || !all.length}
                aria-busy={!loadedAll}
              >
                <Icon name="download" />
                <span className="db-act-text">
                  <span>Download all</span>
                  <small>{loadedAll ? `${what} · ${formatBytes(totals.bytes)} · one .zip file` : `Loading ${all.length} of ${totals.files}…`}</small>
                </span>
              </button>
              {gallery.link && (
                <button className="glass-btn glass-btn--dark db-act" type="button" onClick={() => setShare(true)} aria-haspopup="dialog">
                  <Icon name="share" />
                  <span>Share gallery</span>
                </button>
              )}
            </div>
          </div>

          {albums.length > 0 && (
            <nav className="db-cover-albums db-rise" style={{ '--i': 6 }} aria-label="Go to an album">
              {albums.map((a) => {
                const p = firstOf(a.id);
                return (
                  <button key={a.id} className="db-alb" type="button" onClick={() => jumpTo(a.id)}>
                    {p ? <img src={p.previewUrl} alt="" loading="lazy" draggable={false} /> : <span className="db-alb-ph" aria-hidden="true" />}
                    <span className="db-alb-text">
                      <span className="db-alb-name">{a.name}</span>
                      <span className="db-alb-n">{plural(counts[a.id] ?? a.count, 'photo')}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
        </section>

        {/* the photographs */}
        <section className="db-photos" ref={photosRef} aria-labelledby="db-photos-title">
          <div className="db-photos-head">
            <h2 className="db-photos-title display" id="db-photos-title">
              The photographs
            </h2>
            <p className="db-photos-note" aria-live="polite">
              {!loadedAll ? (
                `Loading the photographs: ${all.length} of ${totals.files}…`
              ) : (
                <>
                  <span className="db-hint-fine">Drag across the photos to pick several, then download them as one file.</span>
                  <span className="db-hint-touch">Tap Select, pick your photos, then download them as one file.</span>
                </>
              )}
            </p>
          </div>

          {/* the bar that follows the page */}
          <div className={`db-tools${stuck ? ' is-stuck' : ''}`} ref={toolsRef}>
            <Albums albums={albums} show={show} counts={counts} onChoose={choose} />
            <div className="db-tools-end">
              <span className="db-drag-hint" aria-hidden="true">
                <Icon name="marquee" />
                Drag to select
              </span>
              <button
                className={`glass-btn db-pill db-select${selecting ? ' on' : ''}`}
                type="button"
                aria-pressed={selecting}
                onClick={() => (selecting ? clear() : setPicking(true))}
              >
                <Icon name={selecting ? 'close' : 'select'} />
                <span>{selecting ? 'Done' : 'Select'}</span>
              </button>
              <div className="db-size" role="group" aria-label="Photo size">
                <button type="button" aria-pressed={size === 'large'} onClick={() => setSize('large')} aria-label="Large photos">
                  <Icon name="large" />
                </button>
                <button type="button" aria-pressed={size === 'small'} onClick={() => setSize('small')} aria-label="Small photos">
                  <Icon name="small" />
                </button>
                <button type="button" aria-pressed={size === 'tiny'} onClick={() => setSize('tiny')} aria-label="Smallest photos, many to a screen">
                  <Icon name="tiny" />
                </button>
              </div>
            </div>
          </div>

          {nothing ? (
            <div className="db-empty">
              <Icon name="download" />
              <p className="display">Your photographs are on their way</p>
              <span>The studio is still adding them. They show here as soon as they are online: come back with the same code.</span>
            </div>
          ) : items.length === 0 && loadedAll ? (
            <div className="db-empty">
              <Icon name="heart" />
              <p className="display">No favourites yet</p>
              <span>Pick photos, then press Favourite in the bar at the foot of the screen.</span>
            </div>
          ) : (
            <ul className="db-grid" key={show} data-size={size} aria-label={`${plural(items.length, 'photo')}`}>
              {items.map((p, i) => {
                const on = sel.has(p.id);
                const alt = altOf(p);
                return (
                  <li className={`db-tile db-tile--${shapeOf(p)}${on ? ' is-sel' : ''}`} key={p.id} data-id={p.id} style={{ '--i': Math.min(i, 9) }}>
                    <button
                      className="db-open"
                      type="button"
                      onClick={(e) => onTile(e, i, p)}
                      aria-label={selecting ? `${on ? 'Unselect' : 'Select'}: ${alt}` : `Open full size: ${alt}`}
                    >
                      {p.kind === 'video' && !p.hasPreview ? (
                        <video src={p.previewUrl} muted playsInline preload="metadata" aria-hidden="true" />
                      ) : (
                        <img src={p.previewUrl} alt={alt} loading={i < (size === 'tiny' ? 24 : 6) ? 'eager' : 'lazy'} draggable={false} />
                      )}
                      {p.kind === 'video' && (
                        <span className="db-play" aria-hidden="true">
                          <Icon name="play" />
                        </span>
                      )}
                    </button>
                    <button
                      className="db-check"
                      type="button"
                      aria-pressed={on}
                      aria-label={`Select ${alt}`}
                      onClick={(e) => toggle(p.id, i, e.shiftKey)}
                    >
                      <Icon name="check" />
                    </button>
                    <div className="db-tile-tools">
                      <button className="db-tool" type="button" onClick={() => download([p])} aria-label={`Download ${alt}`}>
                        <Icon name="download" />
                      </button>
                      <button className="db-tool" type="button" onClick={() => setOpen(i)} aria-label="Open full size">
                        <Icon name="expand" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className="db-foot">
          <span>{photographers}</span>
          <span>
            Questions about your photos?{' '}
            <a className="tlink" href={`mailto:${studio.email}`}>
              {studio.email}
            </a>
          </span>
        </footer>
      </div>

      {/* the rectangle of glass that follows a drag */}
      <div className="db-marquee" ref={boxRef} hidden aria-hidden="true">
        <span className="db-marquee-n" data-n="">
          0
        </span>
      </div>

      <Dock
        shown={selecting || !!job}
        count={sel.size}
        inView={items.length}
        allInView={allInView}
        allFav={allFav}
        job={job}
        onClear={clear}
        onSelectAll={selectAll}
        onFavourite={() => setFavMany(pickedIds, !allFav)}
        onDownload={downloadSelected}
        onStop={() => stopRef.current?.abort()}
      />

      <Lightbox items={slides} index={open} onMove={setOpen} onClose={() => setOpen(-1)} />
      {gallery.link && <ShareDialog open={share} onClose={() => setShare(false)} gallery={gallery} />}
      <div className="db-toast" role="status" data-on={toast ? '' : undefined}>
        {toast}
      </div>
    </main>
  );
}

/*
  Who may see the dashboard (/dashboard): a browser holding an open gallery. It gets one by
    - a QR code's link (/dashboard?code=…): the code is opened like a typed one, then taken out of
      the address;
    - a code typed or scanned on the sign-in page (already open when it arrives here);
    - a signed-in client account: its own gallery is opened.
  Whoever views it is a client of that one gallery (the API says role 'client', and nothing else
  is shown). A visit lasts 24 hours from when the code was entered: when they are up (on the minute,
  or found on the next visit) the page goes back to the sign-in page, which asks for the code again
  (VISIT_ENDED), and a signed-in client's account can't reopen it without the code either. The page
  checks in every minute, which keeps its seat (a code may allow only so many browsers at once) and
  ends the visit when the code is revoked or runs out. Anyone else goes to the sign-in page; staff to
  their panel.
*/
export default function Dashboard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState({ phase: 'checking' }); // checking | open | none | ended
  const asked = useRef(false);

  // an opened gallery: only ever as a client, and remembered until its 24 hours are up
  function show(out) {
    if (out.role !== 'client') return setView({ phase: 'ended', message: 'This gallery opens only for its client. Enter its gallery code.' });
    rememberVisit(out.session?.expiresAt);
    setView({ phase: 'open', gallery: out.gallery, until: out.session?.expiresAt });
  }

  // the 24 hours are up: free the seat, then the sign-in page asks for the code again
  // (to = CODE_FIRST when the account never entered the code at all)
  const timeUp = useCallback(
    async (to = VISIT_ENDED) => {
      forgetVisit();
      await leaveGallery();
      navigate(typeof to === 'string' ? to : VISIT_ENDED, { replace: true });
    },
    [navigate]
  );

  /*
    The session ended while the page was open. Its 24 hours up: the sign-in page asks for the code again.
    Before then, the studio closed it (the code was revoked) or it was left in another tab: say so here,
    rather than claim the time ran out.
  */
  function sessionEnded() {
    if (visitRanOut()) return timeUp(VISIT_ENDED);
    forgetVisit();
    setView({ phase: 'ended', message: 'This gallery is no longer open here. The studio may have closed it, or it was left in another tab. Enter its code again, or ask the studio for a new one.' });
  }

  useEffect(() => {
    if (asked.current) return; // once, even when React runs effects twice in development
    asked.current = true;
    const fromLink = formatCode(params.get('code') || '');
    if (params.has('code')) setParams({}, { replace: true }); // the code doesn't stay in the history
    const end = (err) => setView({ phase: 'ended', message: err instanceof NotConnected ? auth.offline : err.message });

    (async () => {
      // 1. a QR code's link
      if (isCode(fromLink)) {
        try {
          return show(await openByCode(fromLink));
        } catch (err) {
          return end(err);
        }
      }
      // 2. a gallery already open in this browser (its 24 hours not yet up)
      try {
        return show(await checkGallery());
      } catch (err) {
        if (err instanceof NotConnected) return end(err);
        if (err.code === 'GALLERY_SESSION_ENDED' && visitRanOut()) return timeUp(VISIT_ENDED);
      }
      // 3. a signed-in account: its gallery, within 24 hours of its code being entered
      if (await restoreSession()) {
        const { user } = getSession();
        if (isStaff(user)) return navigate('/photographer', { replace: true });
        try {
          const mine = await myGalleries();
          if (!mine.length) return setView({ phase: 'none' });
          return show(await enterGallery(mine[0].id));
        } catch (err) {
          if (err.code === 'GALLERY_VISIT_ENDED') return timeUp(VISIT_ENDED);
          if (err.code === 'GALLERY_CODE_REQUIRED') return timeUp(CODE_FIRST);
          return end(err);
        }
      }
      navigate('/login', { replace: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the 24 hours run out while the page is open: back to the sign-in page on the minute
  const until = view.phase === 'open' ? Date.parse(view.until) : 0;
  useEffect(() => {
    if (!until) return undefined;
    const t = setTimeout(() => timeUp(VISIT_ENDED), Math.min(Math.max(0, until - Date.now()), 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [until, timeUp]);

  // the gallery's photographs can't be had any more: the visit is over, or the code or event is gone
  const gone = useCallback(
    (err) => (err.code === 'GALLERY_SESSION_ENDED' ? sessionEnded() : setView({ phase: 'ended', message: err.message })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timeUp]
  );

  // the check-in: keeps the seat, and ends the visit when its time is up or the code stops working
  const open = view.phase === 'open';
  useEffect(() => {
    if (!open) return;
    const check = () =>
      checkGallery().catch((err) => {
        if (err instanceof NotConnected) return;
        if (err.code === 'GALLERY_SESSION_ENDED') return sessionEnded();
        setView({ phase: 'ended', message: err.message });
      });
    const timer = setInterval(check, CHECK_IN_MS);
    const onShow = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [open, timeUp]);

  // leaving frees the seat; a signed-in client signs out too (or the sign-in page would bring them back)
  async function leave() {
    forgetVisit();
    await leaveGallery();
    if (getSession().status === 'signedIn') await signOut().catch(() => {});
    navigate('/login');
  }

  if (view.phase === 'open') return <GalleryView key={view.gallery.id} onLeave={leave} onGone={gone} />;
  if (view.phase === 'checking') return <main id="main" className="db-gate" aria-busy="true" aria-label="Opening your gallery" />;
  if (view.phase === 'none') {
    return (
      <GateCard title="No gallery yet" onLeave={leave} leaveLabel="Sign out">
        <p>When the studio shares a gallery with your account, it opens here. Have a gallery code? Open it now.</p>
        <CodeEntry onOpen={show} />
      </GateCard>
    );
  }
  return (
    <GateCard title="This gallery isn't open" onLeave={leave} leaveLabel="Back to sign in">
      <p className="db-gate-alert" role="alert">
        {view.message}
      </p>
    </GateCard>
  );
}

function GateCard({ title, children, onLeave, leaveLabel }) {
  useEffect(() => {
    document.title = `${title} · ${brand.name}`;
  }, [title]);
  return (
    <main id="main" className="db-gate">
      <div className="db-gate-card">
        <h1 className="display">{title}</h1>
        {children}
        <button className="glass-btn db-gate-leave" type="button" onClick={onLeave}>
          {leaveLabel}
        </button>
      </div>
    </main>
  );
}

/* A gallery code, for a signed-in client without a gallery yet (wrong codes count, as on the sign-in page). */
function CodeEntry({ onOpen }) {
  const uid = useId();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!isCode(code)) {
      setError(code ? 'A gallery code has 14 letters and numbers in groups of 4, 4, 4 and 2.' : 'Enter the code from your card or email.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      onOpen(await openByCode(code));
    } catch (err) {
      setError(err instanceof NotConnected ? auth.offline : err.message);
      setBusy(false);
    }
  }

  return (
    <form className="db-gate-form" onSubmit={submit} noValidate>
      <label className="label" htmlFor={`${uid}-code`}>
        Gallery code
      </label>
      <div className="db-gate-row">
        <input
          id={`${uid}-code`}
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="e.g. ANNA-LEO1-JUNE-24"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(e) => {
            setCode(formatCode(e.target.value));
            setError('');
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${uid}-error` : undefined}
          disabled={busy}
        />
        <button className="btn glass-btn" type="submit" disabled={busy} aria-busy={busy}>
          {busy ? 'Opening…' : 'Open'}
        </button>
      </div>
      {error && (
        <p className="field-error" id={`${uid}-error`}>
          {error}
        </p>
      )}
    </form>
  );
}
