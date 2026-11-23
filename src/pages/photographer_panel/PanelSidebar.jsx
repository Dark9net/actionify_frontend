import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Icon from './icons.jsx';
import { Bar } from './ui.jsx';
import { refreshSummary, useCodeSummary } from './lib/accessCodes.js';
import { refreshBookingSummary, useBookingSummary } from './lib/bookings.js';
import { refreshClientSummary, useClientSummary } from './lib/clients.js';
import { refreshPaymentSummary, usePaymentSummary } from './lib/payments.js';
import { isLead, refreshAccessSummary, useAccessSummary } from './lib/access.js';
import { can, useSession } from '../../lib/auth.js';
import { useUploads } from './lib/uploads.js';
import { useEvents } from './lib/media.js';
import { compact, useR2Usage } from './lib/r2usage.js';
import useStorageStatus from '../../hooks/useStorageStatus.js';
import { formatBytes, num, plural } from './lib/format.js';
import { brand } from '../../data/content.js';
import LogoMark, { CREAM } from '../../components/LogoMark.jsx';
import Wordmark from '../../components/Wordmark.jsx';

const BASE = '/photographer';

// the sidebar folds only beside the page; below this it is the drawer and always shows its words
const DESK = '(min-width: 1025px)';

/*
  The panel's own sidebar: the studio's mark, the pages in four groups (with counts that need
  attention: bookings waiting for a photographer, photographers on site, payments owed), the storage
  meter. A drawer from the left on tablets and phones.
  On a laptop or desktop it folds to a rail of icons (the toggle is in the top bar): the words stay in
  the page for screen readers, and a label slides out beside each icon on hover or keyboard focus.
*/
export default function PanelSidebar({ open, onClose, folded }) {
  const u = useUploads();
  const side = useRef(null);
  const [tip, setTip] = useState(null);

  // live codes, from the server (the Access codes page refreshes it after every change)
  const session = useSession();
  // bookings, from the server: new requests waiting for a reply, and photographers out on site
  const seesBookings = can(session.user, 'booking.view');
  const bookingSummary = useBookingSummary();
  useEffect(() => {
    if (seesBookings) refreshBookingSummary();
  }, [seesBookings]);
  const pending = seesBookings ? bookingSummary.requested : 0;
  const onsite = seesBookings ? bookingSummary.crewOut : 0;
  // clients, from the server (every booking's client; the Clients page refreshes it)
  const seesClients = can(session.user, 'client.view');
  const clientSummary = useClientSummary();
  useEffect(() => {
    if (seesClients) refreshClientSummary();
  }, [seesClients]);
  const clientCount = seesClients ? clientSummary.clients : 0;
  // payment requests not paid yet, from the server (the Payments and Clients pages refresh it)
  const seesPayments = can(session.user, 'payment.view');
  const paymentSummary = usePaymentSummary();
  useEffect(() => {
    if (seesPayments) refreshPaymentSummary();
  }, [seesPayments]);
  const owed = seesPayments ? paymentSummary.requested.n : 0;
  const seesCodes = can(session.user, 'access_code.view');
  const codes = useCodeSummary();
  useEffect(() => {
    if (seesCodes) refreshSummary();
  }, [seesCodes]);
  const live = seesCodes ? codes.active : 0;
  // the studio lead only: every account (the Access page), and the sign-ups waiting for approval
  const lead = isLead(session.user);
  const accounts = useAccessSummary();
  useEffect(() => {
    if (lead) refreshAccessSummary();
  }, [lead]);
  const waiting = lead ? accounts.summary.pending : 0;
  // what R2 holds and has served this month, against the plan (GET /api/v1/storage/usage)
  const seesStorage = can(session.user, 'storage.view');
  const r2 = useR2Usage(seesStorage);
  const r2Live = useStorageStatus() === 'up';
  // until Cloudflare answers (or for a role that can't see it): the studio's own records
  const { events } = useEvents();
  const recorded = events.reduce((a, e) => a + e.stats.bytes, 0);
  const meter = describeMeter(r2, recorded, events.reduce((a, e) => a + e.stats.files, 0));

  const groups = [
    { label: null, links: [{ to: BASE, end: true, icon: 'overview', label: 'Dashboard' }] },
    {
      label: 'Photographs',
      links: [
        { to: `${BASE}/uploads`, icon: 'upload', label: 'Uploads', badge: u.active ? `${u.active}` : null, busy: u.active > 0, note: u.active ? `${u.active} uploading` : null },
        { to: `${BASE}/access-codes`, icon: 'key', label: 'Access codes', count: live, note: live ? `${live} live` : null },
      ],
    },
    {
      label: 'Studio',
      links: [
        { to: `${BASE}/bookings`, icon: 'calendar', label: 'Bookings', badge: pending ? `${pending}` : null, note: pending ? `${pending} new ${pending === 1 ? 'request' : 'requests'}` : null },
        { to: `${BASE}/team`, icon: 'camera', label: 'Photographers', count: onsite ? `${onsite} on site` : null, note: onsite ? `${onsite} on site` : null },
      ],
    },
    {
      label: 'Business',
      links: [
        { to: `${BASE}/clients`, icon: 'clients', label: 'Clients', count: clientCount, note: plural(clientCount, 'client') },
        { to: `${BASE}/payments`, icon: 'card', label: 'Payments', badge: owed ? `${owed}` : null, note: owed ? `${owed} awaiting` : null },
      ],
    },
    {
      label: 'Settings',
      links: [
        ...(lead
          ? [{ to: `${BASE}/access`, icon: 'shield', label: 'Access', badge: waiting ? `${waiting}` : null, note: waiting ? `${waiting} waiting for approval` : 'Accounts and roles' }]
          : []),
        { to: `${BASE}/storage`, icon: 'storage', label: 'Storage' },
        { to: `${BASE}/settings`, icon: 'settings', label: 'Settings' },
      ],
    },
  ];

  // the label beside a folded icon: one element, fixed to the window, so the sidebar's edge can't clip it
  const showTip = (e) => {
    if (!folded || !window.matchMedia(DESK).matches) return;
    const el = e.target.closest?.('[data-tip]');
    if (!el || !side.current?.contains(el)) return setTip(null);
    const r = el.getBoundingClientRect();
    setTip({ text: el.dataset.tip, note: el.dataset.note || null, x: r.right + 14, y: r.top + r.height / 2 });
  };
  const hideTip = () => setTip(null);

  return (
    <>
      <aside
        ref={side}
        id="pn-side"
        className={`pn-side${open ? ' is-open' : ''}`}
        aria-label="Studio panel"
        onPointerOver={showTip}
        onPointerLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
      >
        <div className="pn-side-brand">
          {/* the logo's icon, and the name in cream beside it, straight on the sidebar's own dark ground
              (folded to the rail: the icon alone, the name in its tip) */}
          <Link
            to={BASE}
            className="pn-brand"
            onClick={onClose}
            aria-label={`${brand.name} studio panel, overview`}
            data-tip={brand.name}
            data-note="Studio panel"
          >
            <span className="pn-brand-mark">
              <LogoMark />
            </span>
            <span className="pn-brand-name pn-side-word">
              <Wordmark className="pn-brand-title" fill={CREAM} />
            </span>
          </Link>
          <button type="button" className="pn-side-x" aria-label="Close the menu" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <nav className="pn-nav" aria-label="Panel" onScroll={hideTip}>
          {groups.map((g, i) => (
            <div className="pn-nav-group" key={g.label || i}>
              {g.label && <p className="pn-nav-label">{g.label}</p>}
              <ul>
                {g.links.map((l) => (
                  <li key={l.to}>
                    <NavLink to={l.to} end={l.end} className="pn-nav-link" onClick={onClose} data-tip={l.label} data-note={l.note || undefined}>
                      <Icon name={l.icon} />
                      <span className="pn-nav-text pn-side-word">{l.label}</span>
                      {l.badge && <span className={`pn-nav-badge${l.busy ? ' is-busy' : ''}`}>{l.badge}</span>}
                      {!l.badge && l.count != null && l.count !== 0 && <span className="pn-nav-count pn-side-word">{l.count}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="pn-side-foot">
          <Link
            to={`${BASE}/storage`}
            className="pn-meter"
            onClick={onClose}
            data-tip={`Cloudflare R2 · ${r2Live ? 'Connected' : 'Offline'}`}
            data-note={meter.tip}
            aria-busy={meter.loading || undefined}
          >
            <span className="pn-meter-top">
              <Icon name="cloud" />
              <span className="pn-side-word">Cloudflare R2</span>
              {meter.aside && <span className="pn-meter-free pn-side-word">{meter.aside}</span>}
              <span className={`pn-mode${r2Live ? ' is-live' : ''}`} title={r2Live ? 'Connected' : 'Offline'}>
                {r2Live ? 'Connected' : 'Offline'}
              </span>
            </span>
            {meter.rows.map((row, i) => (
              <span className={`pn-meter-line${i ? ' pn-side-word' : ''}`} key={row.name} title={row.title}>
                <span className="pn-meter-k pn-side-word">{row.name}</span>
                <Bar value={row.ratio} tone={row.tone} label={row.label} />
                <span className="pn-meter-v pn-side-word">{row.value}</span>
              </span>
            ))}
          </Link>
        </div>
      </aside>

      {folded && tip && (
        <span className="pn-sidetip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
          <b>{tip.text}</b>
          {tip.note && <span>{tip.note}</span>}
        </span>
      )}
    </>
  );
}

/* ---------- The storage meter's words ---------- */

// what is left, rounded down so 8 MB used of 10 GB reads "9.9 GB free", never "10 GB free"
const GB = 1024 ** 3;
const left = (n) => (n >= GB ? `${Math.floor((n / GB) * 10) / 10} GB` : formatBytes(n));

const toneOf = (ratio) => (ratio >= 1 ? 'is-over' : ratio >= 0.8 ? 'is-high' : '');

/* one line of the meter: "Class A ▬▬░░░ 182K/1M" */
function opRow(name, what, m) {
  if (!m) return { name, value: '—', ratio: 0, tone: '', label: `${name} operations`, title: `${name}: add CLOUDFLARE_API_TOKEN to backend/.env to see operations` };
  const ratio = m.included ? m.used / m.included : 0;
  return {
    name,
    value: `${compact(m.used)}/${compact(m.included)}`,
    ratio,
    tone: toneOf(ratio),
    label: `${name} operations used`,
    title: `${name}: ${num(m.used)} of ${num(m.included)} this month · ${m.over ? `${num(m.over)} over the plan, billed` : `${num(m.remaining)} ${what} left`}`,
  };
}

/*
  What the meter says, from the usage answer:
    ready      R2's own numbers: stored (and free) of the plan, Class A / B operations this month
    loading    the studio's records until R2 answers
    off/error  the studio's records, and why R2's numbers are missing
*/
function describeMeter(r2, recorded, files) {
  const u = r2.status === 'ready' ? r2.usage : null;
  if (!u) {
    const why = r2.status === 'off' ? 'Off' : r2.status === 'error' ? 'Unavailable' : r2.status === 'idle' ? null : 'Checking…';
    return {
      loading: r2.status === 'loading',
      aside: why,
      rows: [
        { name: 'Storage', value: formatBytes(recorded), ratio: 0, tone: '', label: 'Storage used', title: r2.error || `${plural(files, 'file')} in the studio's records` },
        opRow('Class A', 'writes', null),
        opRow('Class B', 'reads', null),
      ],
      tip: `${formatBytes(recorded)} · ${plural(files, 'file')}`,
    };
  }

  const st = u.storage;
  const ratio = st.included ? st.used / st.included : 0;
  const free = st.over ? `${formatBytes(st.over)} over` : `${u.partial ? '≥ ' : ''}${left(st.remaining)} free`;
  const rows = [
    {
      name: 'Storage',
      value: formatBytes(st.used),
      ratio,
      tone: toneOf(ratio),
      label: 'Storage used',
      title: `${formatBytes(st.used)} of ${formatBytes(st.included)} · ${free} · ${plural(st.objects, 'file')}${u.stale ? ' · not current' : ''}`,
    },
    opRow('Class A', 'writes', u.classA),
    opRow('Class B', 'reads', u.classB),
  ];
  const tip = [
    `${formatBytes(st.used)} of ${formatBytes(st.included)}`,
    free,
    ...(u.classA && u.classB ? rows.slice(1).map((r) => `${r.name} ${r.value}`) : []),
  ].join(' · ');
  return { loading: false, aside: free, rows, tip };
}
