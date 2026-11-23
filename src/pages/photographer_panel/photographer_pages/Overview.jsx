import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Avatar, Badge, Btn, Empty, PageHead, Pane, Stat } from '../ui.jsx';
import { useUploads } from '../lib/uploads.js';
import { refreshEvents, useEvents } from '../lib/media.js';
import { refreshOverview, useOverview } from '../lib/overview.js';
import { useR2Usage } from '../lib/r2usage.js';
import { METHODS, listPayments, refreshPaymentSummary, usePaymentSummary } from '../lib/payments.js';
import { can, useSession } from '../../../lib/auth.js';
import { ago, formatBytes, fromToday, npr, num, plural, shortDate, weekday } from '../lib/format.js';

/* the booking states on the pipeline, in the order a booking runs (the Bookings page's names) */
export const STATUS = {
  requested: { label: 'New requests', short: 'Requested', tone: 'new', cls: 'requested' },
  confirmed: { label: 'Waiting for a photographer', short: 'Confirmed', tone: 'pending', cls: 'pending' },
  dispatched: { label: 'At the site', short: 'On site', tone: 'onsite', cls: 'onsite' },
  completed: { label: 'Completed', short: 'Completed', tone: 'done', cls: 'completed' },
};

function greeting(h = new Date().getHours()) {
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/* "2026-06-14" → a time (midday, so no time zone moves the day) */
const dayOf = (d) => new Date(`${d}T12:00`).getTime();

/*
  The dashboard, from the database (GET /api/v1/overview, lib/overview.js): what is on R2 and what
  went up lately, the clients, the bookings and where each one stands (new, waiting for a
  photographer, photographers at the site, completed), then who is out on a job, the three events
  taking the most storage and the three latest payments. The bucket's own size comes from R2 itself
  (lib/r2usage.js). Each role sees the parts it may: an editor has no bookings or payments here.
*/
export default function Overview() {
  const u = useUploads();
  const navigate = useNavigate();
  const { user } = useSession();
  const seesPayments = can(user, 'payment.view');
  const paid = usePaymentSummary();
  const o = useOverview();
  const r2 = useR2Usage(can(user, 'storage.view'));
  const now = Date.now();
  useEffect(() => {
    if (seesPayments) refreshPaymentSummary();
    refreshEvents(); // Storage by event
  }, [seesPayments]);

  const d = o.data;
  const media = d?.media;
  const bk = d?.bookings;
  const cl = d?.clients;
  const loading = !d;
  const wait = '…';

  if (o.status === 'error' && !d) {
    return (
      <>
        <PageHead kicker={weekday(now)} title={greeting()} />
        <Empty icon="alert" title="The overview could not be loaded" text={o.error}>
          <Btn icon="retry" onClick={() => refreshOverview()}>
            Try again
          </Btn>
        </Empty>
      </>
    );
  }

  const delta = media ? media.week.files - media.lastWeek.files : 0;
  const soonest = bk?.needPhotographer[0];
  const bucket = r2.usage?.storage?.used;
  const manage = can(user, 'booking.manage');
  // seven cards for a role that sees bookings and clients; fewer fill the row by themselves
  const cards = 2 + (cl ? 1 : 0) + (bk ? 4 : 1);

  return (
    <>
      <PageHead
        kicker={weekday(now)}
        title={greeting()}
        text={
          loading
            ? 'Loading the latest from the studio…'
            : !bk
              ? 'What is on R2, what went up lately and where the storage goes.'
              : soonest
                ? `${plural(bk.confirmed, 'booking')} still need${bk.confirmed === 1 ? 's' : ''} a photographer. The next is ${soonest.name}'s ${soonest.type.toLowerCase()}, ${fromToday(dayOf(soonest.date)).toLowerCase()}.`
                : bk.requested
                  ? `${plural(bk.requested, 'new request')} to confirm. Every confirmed booking has its photographers.`
                  : 'Every booking has its photographers. Uploads and payments are below.'
        }
        actions={
          <>
            {can(user, 'access_code.view') && (
              <Btn icon="key" onClick={() => navigate('/photographer/access-codes')}>
                Access codes
              </Btn>
            )}
            {manage && (
              <Btn icon="send" onClick={() => navigate('/photographer/bookings?show=pending')}>
                Send photographers
              </Btn>
            )}
          </>
        }
      />

      <div className={`pn-stats${cards === 7 ? ' pn-stats--7' : ''}`} aria-busy={loading}>
        <Stat
          icon="cloud"
          label="Photos on R2"
          value={media ? num(media.photos) : wait}
          note={
            media
              ? `${formatBytes(media.bytes)} in ${plural(media.events, 'event')}${media.videos ? ` · ${plural(media.videos, 'video')}` : ''}${bucket !== undefined ? ` · bucket ${formatBytes(bucket)}` : ''}`
              : 'Counting…'
          }
          onClick={() => navigate('/photographer/storage')}
        />
        <Stat
          icon="upload"
          label="Uploaded this week"
          value={media ? `+${num(media.week.files)}` : wait}
          note={
            media
              ? `${formatBytes(media.week.bytes)}${delta ? ` · ${delta > 0 ? '+' : ''}${num(delta)} on last week` : ''}${u.active ? ` · ${u.active} going up now` : ''}`
              : 'Counting…'
          }
          trend={delta > 0 ? 'up' : undefined}
          onClick={() => navigate('/photographer/uploads')}
        />
        {cl && (
          <Stat
            icon="clients"
            label="Clients"
            value={num(cl.clients)}
            note={cl.recent ? `${cl.recent} new in ${cl.recentDays} days` : `None new in ${cl.recentDays} days`}
            onClick={() => navigate('/photographer/clients')}
          />
        )}
        {bk ? (
          <>
            <Stat
              icon="calendar"
              label="Bookings"
              value={num(bk.all)}
              note={`${bk.upcoming} coming up${bk.requested ? ` · ${bk.requested} new` : ''}`}
              onClick={() => navigate('/photographer/bookings')}
            />
            <Stat icon="send" tone="pending" label="Pending dispatch" value={num(bk.confirmed)} note="Waiting for a photographer" onClick={() => navigate('/photographer/bookings?show=pending')} />
            <Stat
              icon="pin"
              tone="onsite"
              label="Photographers at site"
              value={num(bk.crewOut)}
              note={`${plural(bk.dispatched, 'event')} under way`}
              onClick={() => navigate('/photographer/bookings?show=onsite')}
            />
            <Stat
              icon="flag"
              tone="done"
              label="Completed events"
              value={num(bk.completed)}
              note={seesPayments && paid.loaded ? `${npr(paid.last30.npr)} received in 30 days` : 'Finished and delivered'}
              onClick={() => navigate('/photographer/bookings?show=completed')}
            />
          </>
        ) : (
          <Stat
            icon="folder"
            label="Events"
            value={media ? num(media.events) : wait}
            note={media ? `${plural(media.files, 'file')} on R2` : 'Counting…'}
            onClick={() => navigate('/photographer/uploads')}
          />
        )}
      </div>

      <div className={`pn-grid${bk || loading ? ' pn-grid--2-1' : ''}`}>
        <Pane title="Uploads, last 14 days" aside={<span className="pn-pane-note">{media ? plural(media.days.reduce((a, x) => a + x.files, 0), 'file') : wait}</span>}>
          {media ? <UploadsChart days={media.days} /> : <p className="pn-quiet">Loading…</p>}
        </Pane>
        {(bk || loading) && (
          <Pane title="Where the bookings stand">
            {bk ? (
              <>
                <Pipeline counts={bk} />
                <div className="pn-mini-head">
                  <p>Needs a photographer</p>
                  <Link to="/photographer/bookings?show=pending" className="pn-link">
                    All {bk.confirmed}
                  </Link>
                </div>
                {bk.needPhotographer.length ? (
                  <ul className="pn-list">
                    {bk.needPhotographer.map((b) => (
                      <li key={b.id} className="pn-list-row">
                        <span className="pn-date-chip">
                          <b>{new Date(dayOf(b.date)).getDate()}</b>
                          {new Date(dayOf(b.date)).toLocaleString('en-GB', { month: 'short' })}
                        </span>
                        <span className="pn-list-main">
                          <span className="pn-list-title">
                            {b.name} · {b.type}
                          </span>
                          <span className="pn-list-sub">
                            {fromToday(dayOf(b.date))}
                            {b.time ? ` at ${b.time}` : ''} · {b.venue}
                          </span>
                        </span>
                        {manage && (
                          <Btn size="sm" icon="send" onClick={() => navigate(`/photographer/bookings?send=${b.id}`)}>
                            Send
                          </Btn>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pn-quiet">Every confirmed booking has its photographers.</p>
                )}
              </>
            ) : (
              <p className="pn-quiet">Loading…</p>
            )}
          </Pane>
        )}
      </div>

      <div className="pn-grid pn-grid--fit">
        {bk && (
          <Pane title="On site now">
            {bk.onsite.length ? (
              <ul className="pn-list">
                {bk.onsite.map((b) => (
                  <li key={b.id} className="pn-list-row pn-list-row--top">
                    <span className="pn-live" aria-hidden="true" />
                    <span className="pn-list-main">
                      <span className="pn-list-title">
                        {b.name} · {b.type}
                      </span>
                      <span className="pn-list-sub">
                        {b.venue} · {fromToday(dayOf(b.date))}
                        {b.time ? `, from ${b.time}` : ''}
                      </span>
                      <span className="pn-crew">
                        {b.crew.map((p) => (
                          <span key={p.id} className="pn-crew-one">
                            <Avatar name={p.name} photo={p.photo} size={24} />
                            {p.name.split(' ')[0]}
                          </span>
                        ))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon="pin" title="Nobody is out on a job" text="Photographers sent to a booking show here until it is marked completed." />
            )}
          </Pane>
        )}
        <Pane title="Storage by event" aside={<Link to="/photographer/storage" className="pn-link">Storage</Link>}>
          <StorageBars limit={3} />
        </Pane>
        {seesPayments && (
          <Pane title="Latest payments" aside={<Link to="/photographer/payments" className="pn-link">All payments</Link>}>
            <LatestPayments />
          </Pane>
        )}
      </div>
    </>
  );
}

const PAY_STATE = {
  requested: ['warn', 'Awaiting'],
  paid: ['paid', 'Received'],
  refunded: ['neutral', 'Refunded'],
  cancelled: ['neutral', 'Cancelled'],
};

/* the three newest payments from the server (bookings_payment), in Nepalese rupees */
const LATEST = 3;
function LatestPayments() {
  const [list, setList] = useState(null); // null: loading
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    listPayments({ limit: LATEST })
      .then((d) => live && setList(d.payments.slice(0, LATEST)))
      .catch((e) => {
        if (!live) return;
        setList([]);
        setError(e.message || "The payments couldn't be loaded.");
      });
    return () => {
      live = false;
    };
  }, []);
  if (list === null) return <p className="pn-quiet">Loading…</p>;
  if (error) return <p className="pn-quiet">{error}</p>;
  if (!list.length) return <p className="pn-quiet">No payments yet. Ask for one from Clients.</p>;
  return (
    <ul className="pn-list">
      {list.map((p) => {
        const at = p.status === 'paid' && p.paidAt ? p.paidAt : p.status === 'refunded' && p.refundedAt ? p.refundedAt : p.createdAt;
        return (
          <li key={p.id} className="pn-list-row">
            <Avatar name={p.booking.name} size={32} />
            <span className="pn-list-main">
              <span className="pn-list-title">{p.booking.name}</span>
              <span className="pn-list-sub">
                {p.kind === 'advance' ? 'Advance' : 'Full payment'}
                {p.method ? ` · ${METHODS[p.method]}` : ''} · {ago(Date.parse(at))}
              </span>
            </span>
            <span className="pn-list-end">
              <span className="pn-money">{npr(p.amount)}</span>
              <Badge tone={PAY_STATE[p.status][0]}>{PAY_STATE[p.status][1]}</Badge>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/*
  Files that reached R2 each day (the server's 14 days, today last): one series, so one colour and no
  legend (the title names it). A light grid, the value on hover or focus, and the numbers as a table
  for screen readers.
*/
function UploadsChart({ days: rows }) {
  const [hover, setHover] = useState(null);
  const days = useMemo(() => rows.map((r) => ({ t: dayOf(r.day), n: r.files, bytes: r.bytes })), [rows]);
  const max = Math.max(4, ...days.map((d) => d.n));
  const top = Math.ceil(max / 4) * 4;
  const ticks = [top, top / 2, 0];

  return (
    <div className="pn-chart">
      <div className="pn-chart-plot">
        <div className="pn-chart-grid" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t} style={{ bottom: `${(t / top) * 100}%` }}>
              <i>{t}</i>
            </span>
          ))}
        </div>
        <div className="pn-chart-bars" onPointerLeave={() => setHover(null)}>
          {days.map((d, i) => (
            <div
              key={d.t}
              className={`pn-col${hover === i ? ' is-on' : ''}${i === days.length - 1 ? ' is-today' : ''}`}
              tabIndex={0}
              aria-label={`${weekday(d.t)}: ${plural(d.n, 'file')}, ${formatBytes(d.bytes)}`}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
            >
              <span className="pn-col-bar" style={{ height: d.n ? `max(4px, ${(d.n / top) * 100}%)` : 0 }} />
              {hover === i && (
                <span className={`pn-tip${i > 9 ? ' is-left' : ''}`} role="presentation">
                  <b>{plural(d.n, 'file')}</b>
                  <span>{weekday(d.t)}</span>
                  <span>{formatBytes(d.bytes)}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="pn-chart-x" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.t}>{i === days.length - 1 ? 'Today' : i % 2 === 1 ? shortDate(d.t) : ''}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>Files uploaded to R2 each day, the last 14 days</caption>
        <tbody>
          {days.map((d) => (
            <tr key={d.t}>
              <th scope="row">{weekday(d.t)}</th>
              <td>{d.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* the bookings by state (from the server), in one segmented bar with the count on each part and a legend under it */
function Pipeline({ counts }) {
  const parts = Object.entries(STATUS).map(([k, st]) => ({ k, st, n: counts[k] }));
  const total = parts.reduce((a, p) => a + p.n, 0) || 1;
  return (
    <div className="pn-pipe">
      <div className="pn-pipe-bar" role="img" aria-label={parts.map((p) => `${p.st.label}: ${p.n}`).join(', ')}>
        {parts.map((p) =>
          p.n ? (
            <span key={p.k} className={`pn-pipe-seg is-${p.st.cls}`} style={{ flexGrow: p.n }} title={`${p.st.label}: ${p.n}`}>
              {p.n / total > 0.12 && p.n}
            </span>
          ) : null
        )}
      </div>
      <ul className="pn-legend">
        {parts.map((p) => (
          <li key={p.k}>
            <i className={`is-${p.st.cls}`} aria-hidden="true" />
            {p.st.label}
            <b>{p.n}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* the events taking the most room on R2 (from the server), the largest `limit` of them */
export function StorageBars({ limit = 3 }) {
  const { events } = useEvents();
  const rows = useMemo(
    () =>
      events
        .filter((ev) => ev.stats.bytes > 0)
        .map((ev) => ({ ev, bytes: ev.stats.bytes, n: ev.stats.files }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, limit),
    [events, limit]
  );
  if (!rows.length) return <p className="pn-quiet">Nothing on R2 yet.</p>;
  const max = rows[0].bytes;
  return (
    <ul className="pn-hbars">
      {rows.map((r) => (
        <li key={r.ev.id}>
          <Link to={`/photographer/uploads/${r.ev.id}`} className="pn-hbar">
            <span className="pn-hbar-name">{r.ev.name}</span>
            <span className="pn-hbar-track" aria-hidden="true">
              <i style={{ width: `${(r.bytes / max) * 100}%` }} />
            </span>
            <span className="pn-hbar-val">
              {formatBytes(r.bytes)}
              <small>{plural(r.n, 'file')}</small>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
