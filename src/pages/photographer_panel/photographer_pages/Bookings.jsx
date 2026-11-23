import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../icons.jsx';
import { Avatar, Badge, Btn, Confirm, Empty, Field, IconBtn, Modal, PageHead, Pane, Search, Segments } from '../ui.jsx';
import NewEvent from './NewEvent.jsx';
import { KIND_OF, addBooking, bookingCrew, bookingTime, changeBooking, listBookings, refreshBookingSummary, showMobile, useBookingSummary } from '../lib/bookings.js';
import { NotConnected, can, useSession } from '../../../lib/auth.js';
import { auth, hire } from '../../../data/content.js';
import { toast } from '../lib/toast.js';
import { date, fromToday, num, plural } from '../lib/format.js';

export const BOOKING_STATUS = {
  requested: { label: 'New requests', short: 'Requested', tone: 'new' },
  confirmed: { label: 'Confirmed', short: 'Confirmed', tone: 'pending' },
  dispatched: { label: 'At the site', short: 'On site', tone: 'onsite' },
  completed: { label: 'Completed', short: 'Completed', tone: 'done' },
  cancelled: { label: 'Cancelled', short: 'Cancelled', tone: 'neutral' },
};
const LANES = ['requested', 'confirmed', 'dispatched', 'completed'];
// older links (the dashboard's) used the panel's first names for the lists
const SHOW_ALIAS = { pending: 'confirmed', onsite: 'dispatched' };
const COLUMNS = 6;
const ROLE = { photographer: 'Photographer', assistant: 'Assistant', studio_lead: 'Studio lead' };

const names = (list) => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);
const problem = (err) => (err instanceof NotConnected ? auth.offline : err.message);
const showOf = (v) => {
  const s = SHOW_ALIAS[v] || v;
  return BOOKING_STATUS[s] ? s : 'all';
};

/*
  Bookings, from the website's form (Hire Us and the booking sheet) and taken by phone: who booked,
  when and where, and where each stands. Everything is on the server (bookings), ten rows at a time,
  newest first; each page comes with a cursor for the next one, and the cursors already seen are kept
  so Previous goes back without asking for a count.
    New request → Confirm → Send photographers (choose who goes; the client is emailed their names
    and phones) → At the site → Mark completed (the client is emailed a thank-you, with the gallery
    link, code and QR code when its folder has a live access code) → Completed, then "Create folder"
    makes its event on Uploads, filled in from the booking.
  ?show=requested|confirmed|dispatched|completed|cancelled opens a list.
*/
export default function Bookings() {
  const navigate = useNavigate();
  const session = useSession();
  const manage = can(session.user, 'booking.manage');
  const makesEvents = can(session.user, 'event.manage');
  const summary = useBookingSummary();
  const [params, setParams] = useSearchParams();

  const [show, setShow] = useState(() => showOf(params.get('show')));
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // q, once typing pauses
  const [cursors, setCursors] = useState([null]); // the cursor that starts each page seen so far
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ bookings: [], nextCursor: null, pageSize: 10 });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [sending, setSending] = useState(null);
  const [folderFor, setFolderFor] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [completing, setCompleting] = useState(null);
  const [adding, setAdding] = useState(false);
  const asked = useRef(0);

  useEffect(() => {
    if (!params.get('show') && !params.get('send')) return;
    if (params.get('show')) setShow(showOf(params.get('show')));
    setParams({}, { replace: true });
  }, [params, setParams]);

  // a new filter or search starts again from the first page
  const firstPage = () => {
    setCursors([null]);
    setPage(0);
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim() === query) return;
      setQuery(q.trim());
      firstPage();
    }, 300);
    return () => clearTimeout(t);
  }, [q, query]);

  const load = useCallback(async () => {
    const ticket = ++asked.current; // only the latest answer is shown
    setStatus('loading');
    try {
      const d = await listBookings({ status: show, q: query, cursor: cursors[page] });
      if (ticket !== asked.current) return;
      setData(d);
      setStatus('ready');
    } catch (err) {
      if (ticket !== asked.current) return;
      setError(problem(err));
      setStatus('error');
    }
  }, [show, query, cursors, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    refreshBookingSummary();
  }, []);

  const filter = (v) => {
    setShow(v);
    firstPage();
  };

  function next() {
    if (!data.nextCursor) return;
    setCursors((c) => [...c.slice(0, page + 1), data.nextCursor]);
    setPage((p) => p + 1);
  }

  // a changed booking: its row is replaced in place, so the page doesn't jump
  function changed(b) {
    setData((d) => ({ ...d, bookings: d.bookings.map((x) => (x.id === b.id ? b : x)) }));
    refreshBookingSummary();
  }

  async function move(b, body, done) {
    try {
      const { booking: out, email } = await changeBooking(b.id, body);
      changed(out);
      done?.(out, email);
      return out;
    } catch (err) {
      toast({ tone: 'error', title: `Couldn't update ${b.ref}`, text: problem(err) });
      return null;
    }
  }

  const confirm = (b) => move(b, { status: 'confirmed' }, () => toast({ tone: 'success', title: `${b.ref} confirmed`, text: `${b.name}'s ${b.type.toLowerCase()} is booked. Send photographers when the team is set.` }));

  const restore = (b, to = 'requested') => move(b, { status: to }, () => toast({ tone: 'success', title: `${b.ref} restored`, text: `It is back under ${BOOKING_STATUS[to].label}.` }));

  // completing emails the client a thank-you, with their gallery link, code and QR code when it has a live code
  const complete = (b) =>
    move(b, { status: 'completed' }, (out, email) => {
      toast({
        tone: 'success',
        title: `${b.ref} completed`,
        text: email?.sent
          ? email.gallery
            ? `${b.name} was emailed a thank-you with their gallery link, code and QR code at ${email.to}.`
            : `${b.name} was emailed a thank-you at ${email.to}. It says the gallery link follows: send it once the folder has an access code.`
          : out.event
            ? 'Its photographs can go up now.'
            : 'Make its folder to upload the photographs.',
        action: out.event
          ? { label: 'Open folder', run: () => navigate(`/photographer/uploads/${out.event.id}`) }
          : makesEvents
            ? { label: 'Create folder', run: () => setFolderFor(out) }
            : undefined,
      });
      if (email && !email.sent) {
        toast({
          tone: 'error',
          title: `The email to ${email.to} wasn't sent`,
          text: 'The mail service failed. Thank the client and send their gallery link from your own email.',
          action: { label: 'Write to them', run: () => window.open(`mailto:${email.to}?subject=${encodeURIComponent(`Thank you · ${b.ref}`)}`) },
        });
      }
    });

  const from = page * data.pageSize + 1;
  const to = page * data.pageSize + data.bookings.length;
  const total = query ? null : summary.loaded ? summary[show] : null;

  return (
    <>
      <PageHead
        kicker="Studio"
        title="Bookings"
        text="Requests from the website arrive here. Confirm them, send photographers on the day and mark each one completed; its photographs then go up on Uploads."
        actions={
          manage && (
            <Btn tone="primary" icon="plus" onClick={() => setAdding(true)}>
              New booking
            </Btn>
          )
        }
      />

      <div className="pn-kanban pn-kanban--4" aria-label="Bookings by status">
        {LANES.map((st) => (
          <button key={st} type="button" className={`pn-lane is-${st}${show === st ? ' is-on' : ''}`} onClick={() => filter(show === st ? 'all' : st)} aria-pressed={show === st}>
            <span className="pn-lane-top">
              <i aria-hidden="true" />
              {BOOKING_STATUS[st].label}
            </span>
            <b>{summary.loaded ? num(summary[st]) : '–'}</b>
            <small>
              {st === 'requested'
                ? summary.requested
                  ? 'Waiting for a reply'
                  : 'Nothing waiting'
                : st === 'confirmed'
                  ? `${num(summary.withinWeek)} within a week`
                  : st === 'dispatched'
                    ? `${plural(summary.crewOut, 'photographer')} out`
                    : `${num(summary.withoutFolder)} without a folder`}
            </small>
          </button>
        ))}
      </div>

      <Pane pad={false}>
        <div className="pn-table-tools">
          <Segments
            label="Show bookings"
            value={show}
            onChange={filter}
            items={[
              { id: 'all', label: 'All', count: summary.all },
              { id: 'requested', label: 'Requested', count: summary.requested },
              { id: 'confirmed', label: 'Confirmed', count: summary.confirmed },
              { id: 'dispatched', label: 'On site', count: summary.dispatched },
              { id: 'completed', label: 'Completed', count: summary.completed },
              { id: 'cancelled', label: 'Cancelled', count: summary.cancelled },
            ]}
          />
          <Search value={q} onChange={setQ} label="Search bookings" placeholder="Name, email, venue or BK- reference" />
        </div>

        {status === 'error' ? (
          <Empty icon="info" title="Couldn't load the bookings" text={error}>
            <Btn icon="retry" onClick={load}>
              Try again
            </Btn>
          </Empty>
        ) : status === 'ready' && !data.bookings.length ? (
          page > 0 ? (
            <Empty icon="calendar" title="No more bookings" text="The bookings on this page have changed.">
              <Btn icon="back" onClick={() => setPage(0)}>
                First page
              </Btn>
            </Empty>
          ) : query || show !== 'all' ? (
            <Empty icon="calendar" title="No booking matches" text={query ? 'Search part of a name, email, phone or venue, or a whole reference like BK-3F2A9C.' : 'Nothing in this list right now.'} />
          ) : (
            <Empty icon="calendar" title="No bookings yet" text="Requests sent from the website's booking form arrive here. A booking taken by phone can be added by hand.">
              {manage && (
                <Btn tone="primary" icon="plus" onClick={() => setAdding(true)}>
                  New booking
                </Btn>
              )}
            </Empty>
          )
        ) : (
          <>
            <div className="pn-table-wrap">
              <table className="pn-table" aria-busy={status === 'loading'}>
                <thead>
                  <tr>
                    <th scope="col">Booking</th>
                    <th scope="col">Client</th>
                    <th scope="col">Date</th>
                    <th scope="col">Photographers</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className={status === 'loading' ? 'is-loading' : ''}>
                  {status === 'loading' && !data.bookings.length
                    ? Array.from({ length: 4 }, (_, i) => (
                        <tr key={i} className="pn-row-skel" aria-hidden="true">
                          <td colSpan={COLUMNS}>
                            <span />
                          </td>
                        </tr>
                      ))
                    : data.bookings.map((b) => (
                        <tr key={b.id} className={b.status === 'cancelled' ? 'is-dim' : ''}>
                          <td>
                            <span className="pn-cell-2" title={b.notes || undefined}>
                              <b>{b.type}</b>
                              <small>
                                {b.ref} · {b.venue}
                                {b.notes ? ' · Notes' : ''}
                              </small>
                            </span>
                          </td>
                          <td>
                            <span className="pn-cell-2 pn-cell-clip" title={[b.name, b.email, b.phone].filter(Boolean).join(' · ')}>
                              <span>{b.name}</span>
                              <small>
                                <a className="pn-cell-link" href={`mailto:${b.email}?subject=${encodeURIComponent(`Your booking ${b.ref}`)}`}>
                                  {b.email}
                                </a>
                                {b.phone ? ` · ${b.phone}` : ''}
                              </small>
                            </span>
                          </td>
                          <td>
                            <span className="pn-cell-2">
                              <span className="pn-nowrap">{date(bookingTime(b))}</span>
                              <small>
                                {fromToday(bookingTime(b))}
                                {b.time ? ` · ${b.time}` : ''}
                                {b.coverage ? ` · ${b.coverage.replace(/ \(.*\)$/, '')}` : ''}
                              </small>
                            </span>
                          </td>
                          <td>
                            {b.crew.length ? (
                              <span className="pn-stack" title={b.crew.map((p) => p.name).join(', ')}>
                                {b.crew.map((p) => (
                                  <Avatar key={p.id} name={p.name} photo={p.photo} size={28} />
                                ))}
                                <span className="pn-stack-names">{b.crew.map((p) => p.name.split(' ')[0]).join(', ')}</span>
                              </span>
                            ) : (
                              <span className="pn-quiet">{plural(b.crewSize, 'photographer')} wanted</span>
                            )}
                          </td>
                          <td>
                            <Badge tone={BOOKING_STATUS[b.status].tone}>{BOOKING_STATUS[b.status].short}</Badge>
                          </td>
                          <td>
                            <span className="pn-row-acts">
                              {manage && b.status === 'requested' && (
                                <>
                                  <Btn size="sm" tone="primary" icon="check" onClick={() => confirm(b)}>
                                    Confirm
                                  </Btn>
                                  <IconBtn icon="close" label={`Cancel ${b.ref}`} onClick={() => setCancelling(b)} />
                                </>
                              )}
                              {manage && b.status === 'confirmed' && (
                                <>
                                  <Btn size="sm" tone="primary" icon="send" onClick={() => setSending(b)}>
                                    Send photographers
                                  </Btn>
                                  <IconBtn icon="close" label={`Cancel ${b.ref}`} onClick={() => setCancelling(b)} />
                                </>
                              )}
                              {manage && b.status === 'dispatched' && (
                                <Btn size="sm" icon="flag" onClick={() => setCompleting(b)}>
                                  Mark completed
                                </Btn>
                              )}
                              {b.status === 'completed' &&
                                (b.event ? (
                                  <Link to={`/photographer/uploads/${b.event.id}`} className="pn-btn pn-btn--glass pn-btn--sm">
                                    <Icon name="folder" />
                                    <span>Open folder</span>
                                  </Link>
                                ) : (
                                  makesEvents && (
                                    <Btn size="sm" icon="plus" onClick={() => setFolderFor(b)}>
                                      Create folder
                                    </Btn>
                                  )
                                ))}
                              {manage && b.status === 'cancelled' && (
                                <Btn size="sm" icon="retry" onClick={() => restore(b)}>
                                  Restore
                                </Btn>
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>

            <nav className="pn-pager" aria-label="Pages of bookings">
              <p className="pn-pager-note" aria-live="polite">
                {data.bookings.length ? (
                  <>
                    {from}–{to}
                    {total !== null && ` of ${num(total)}`}
                  </>
                ) : (
                  'Loading…'
                )}
              </p>
              <span className="pn-pager-acts">
                <Btn size="sm" icon="back" onClick={() => setPage((p) => p - 1)} disabled={page === 0 || status === 'loading'}>
                  Previous
                </Btn>
                <span className="pn-pager-page">Page {page + 1}</span>
                <Btn size="sm" className="pn-pager-next" onClick={next} disabled={!data.nextCursor || status === 'loading'}>
                  Next
                  <Icon name="chevron" />
                </Btn>
              </span>
            </nav>
          </>
        )}
      </Pane>

      <Dispatch
        booking={sending}
        onClose={() => setSending(null)}
        onSend={async (b, crew, chosen) => {
          const out = await move(b, { status: 'dispatched', crew }, (_, email) => {
            toast({
              tone: 'success',
              title: `${names(chosen)} sent to ${b.venue}`,
              text: email?.sent ? `${b.name} was emailed their ${chosen.length > 1 ? 'names and phones' : 'name and phone'} at ${email.to}.` : `${b.ref} is now under At the site.`,
            });
            // the booking moved on; only the email failed: say so, with a way to tell the client by hand
            if (email && !email.sent) {
              toast({
                tone: 'error',
                title: `The email to ${email.to} wasn't sent`,
                text: 'The mail service failed. Tell the client who is coming by phone or from your own email.',
                action: { label: 'Write to them', run: () => window.open(`mailto:${email.to}?subject=${encodeURIComponent(`Your photographer for ${b.ref}`)}`) },
              });
            }
          });
          return Boolean(out);
        }}
      />
      <NewEvent
        open={Boolean(folderFor)}
        from={
          folderFor && {
            id: folderFor.id,
            ref: folderFor.ref,
            title: folderFor.name,
            date: bookingTime(folderFor),
            venue: folderFor.venue,
            kind: KIND_OF[folderFor.type] || 'Celebration',
            clientId: '',
          }
        }
        onClose={() => setFolderFor(null)}
        onDone={(ev) => navigate(`/photographer/uploads/${ev.id}`)}
      />
      <NewBooking
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={() => {
          refreshBookingSummary();
          // the newest booking is first: show the first page of every booking
          if (show === 'all' && page === 0 && cursors.length === 1) load();
          else filter('all');
        }}
      />
      <Complete booking={completing} onClose={() => setCompleting(null)} onConfirm={complete} />
      <Confirm
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        title={`Cancel ${cancelling?.ref}?`}
        text={`${cancelling?.name}'s ${cancelling?.type.toLowerCase()} moves to Cancelled. It can be restored. Tell them by email, and refund any deposit from Payments.`}
        action="Cancel booking"
        onConfirm={() => {
          const b = cancelling;
          move(b, { status: 'cancelled' }, () => toast({ tone: 'info', title: `${b.ref} cancelled`, action: { label: 'Undo', run: () => restore(b, b.status) } }));
        }}
      />
    </>
  );
}

/* marking it completed: says what the client's thank-you email will hold before it goes */
function Complete({ booking, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (booking) setBusy(false);
  }, [booking]);
  const gallery = Boolean(booking?.event?.hasCode);

  async function send() {
    if (busy) return;
    setBusy(true);
    const out = await onConfirm(booking);
    setBusy(false);
    if (out) onClose();
  }

  return (
    <Modal
      open={Boolean(booking)}
      onClose={onClose}
      size="sm"
      title={booking ? `Mark ${booking.ref} completed?` : ''}
      text={booking ? `${booking.name}'s ${booking.type.toLowerCase()} at ${booking.venue} moves to Completed.` : ''}
      onSubmit={send}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>
            Not yet
          </Btn>
          <Btn tone="primary" type="submit" icon="flag" disabled={busy} aria-busy={busy}>
            {busy ? 'Sending…' : 'Mark completed'}
          </Btn>
        </>
      }
    >
      {booking && (
        <p className={`pn-note${gallery ? '' : ' pn-note--warn'}`}>
          <Icon name={gallery ? 'send' : 'info'} />
          <span>
            {booking.name} gets a thank-you email at {booking.email}
            {gallery
              ? ' saying their photographs are ready, with the private gallery link, its code and a QR code to share with their guests.'
              : `. ${booking.event ? 'Its folder has no live access code yet' : 'It has no folder or access code yet'}, so the email says the gallery link and QR code follow. To send them in this email, make the folder and its access code first.`}
          </span>
        </p>
      )}
    </Modal>
  );
}

/* choosing who goes: the studio's photographers, with where each one is now; free ones first, then
   those out at a site, then those off today (marked on Photographers) */
function Dispatch({ booking, onClose, onSend }) {
  const [crew, setCrew] = useState(null); // null: loading
  const [loadError, setLoadError] = useState('');
  const [pick, setPick] = useState(() => new Set());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!booking) return;
    let live = true;
    setCrew(null);
    setLoadError('');
    setErr('');
    setBusy(false);
    bookingCrew()
      .then((list) => {
        if (!live) return;
        const rank = (m) => (m.off ? 2 : m.busy ? 1 : 0);
        const sorted = [...list].sort((a, b) => rank(a) - rank(b));
        setCrew(sorted);
        // as many free people as the client asked for
        setPick(new Set(sorted.filter((m) => !m.busy && !m.off).slice(0, booking.crewSize).map((m) => m.id)));
      })
      .catch((e) => live && setLoadError(problem(e)));
    return () => {
      live = false;
    };
  }, [booking]);

  // chosen people the client's email can't give a phone for
  const noPhone = (crew || []).filter((m) => pick.has(m.id) && !m.mobile).map((m) => m.name.split(' ')[0]);

  async function send() {
    if (busy) return;
    if (!pick.size) return setErr('Choose at least one photographer.');
    setBusy(true);
    const chosen = crew.filter((m) => pick.has(m.id)).map((m) => m.name.split(' ')[0]);
    const ok = await onSend(booking, [...pick], chosen);
    setBusy(false);
    if (ok) onClose();
  }

  return (
    <Modal
      open={Boolean(booking)}
      onClose={onClose}
      title="Send photographers"
      text={booking ? `${booking.ref} · ${booking.type} · ${date(bookingTime(booking))}${booking.time ? `, ${booking.time}` : ''} · ${booking.venue}. ${plural(booking.crewSize, 'photographer')} asked for.` : ''}
      onSubmit={send}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Btn>
          <Btn tone="primary" type="submit" icon="send" disabled={busy || !crew?.length} aria-busy={busy}>
            {busy ? 'Sending…' : `Send ${pick.size ? plural(pick.size, 'photographer') : ''}`}
          </Btn>
        </>
      }
    >
      {loadError ? (
        <p className="pn-note pn-note--warn" role="alert">
          <Icon name="info" />
          {loadError}
        </p>
      ) : crew === null ? (
        <p className="pn-quiet">Loading the team…</p>
      ) : !crew.length ? (
        <p className="pn-note">
          <Icon name="info" />
          Nobody can be sent yet. Give staff accounts the Photographer, Assistant or Studio lead role under Settings.
        </p>
      ) : (
        <fieldset className="pn-pick-list">
          <legend className="sr-only">Photographers</legend>
          {crew.map((m) => (
            <label key={m.id} className={`pn-pick${pick.has(m.id) ? ' is-on' : ''}${m.busy || m.off ? ' is-busy' : ''}`}>
              <input
                type="checkbox"
                checked={pick.has(m.id)}
                onChange={() =>
                  setPick((o) => {
                    const n = new Set(o);
                    n.has(m.id) ? n.delete(m.id) : n.add(m.id);
                    setErr('');
                    return n;
                  })
                }
              />
              <Avatar name={m.name} photo={m.photo} size={40} />
              <span className="pn-pick-text">
                <b>{m.name}</b>
                <small>
                  {ROLE[m.role] || m.role} · {m.mobile ? showMobile(m.mobile) : 'No phone on file'}
                </small>
                <Badge tone={m.busy ? 'onsite' : m.off ? 'neutral' : 'done'}>{m.busy ? `At ${m.busy.ref} · ${m.busy.venue}` : m.off ? 'Off today' : 'Free'}</Badge>
              </span>
              <span className="pn-pick-box" aria-hidden="true">
                <Icon name="check" />
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {booking && crew?.length > 0 && (
        <p className="pn-note">
          <Icon name="send" />
          <span>
            {booking.name} gets an email at {booking.email} with the {pick.size > 1 ? 'names and phones' : 'name and phone'} of who is coming, and that they will arrive on site on time.
            {noPhone.length > 0 && ` ${names(noPhone)} ${noPhone.length > 1 ? 'have' : 'has'} no phone on file: add it under Settings, Profile.`}
          </span>
        </p>
      )}
      {err && <p className="pn-error">{err}</p>}
    </Modal>
  );
}

/* a booking taken by phone or email: the website form's fields; it starts confirmed */
function NewBooking({ open, onClose, onAdded }) {
  const blank = { name: '', email: '', phone: '', type: 'Wedding', date: '', time: '', venue: '', coverage: '', crew: '1', notes: '' };
  const [v, setV] = useState(blank);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setV(blank);
      setErr({});
      setBusy(false);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k) => (e) => {
    setV((o) => ({ ...o, [k]: e.target.value }));
    setErr((o) => (o[k] ? { ...o, [k]: undefined } : o));
  };

  async function submit() {
    if (busy) return;
    const e = {};
    if (!v.name.trim()) e.name = "Enter the client's name.";
    if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'Enter an email address to send the confirmation to.';
    if (!v.date) e.date = 'Choose the day.';
    if (!v.venue.trim()) e.venue = 'Where the photographers go.';
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const b = await addBooking({ ...v, crew: Number(v.crew) || 1 });
      toast({ tone: 'success', title: `${b.ref} added`, text: `${b.name}'s ${b.type.toLowerCase()} is confirmed. Send photographers when the team is set.` });
      onAdded?.(b);
      onClose();
    } catch (error) {
      setBusy(false);
      if (error instanceof NotConnected) return setErr({ form: auth.offline });
      const fields = {};
      for (const [k, msg] of Object.entries(error.errors || {})) fields[k] = msg;
      setErr(Object.keys(fields).length ? fields : { form: error.message });
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="New booking"
      text="For a booking taken by phone or email. It starts as confirmed; requests from the website's form arrive here by themselves."
      onSubmit={submit}
      footer={
        <>
          <Btn tone="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Btn>
          <Btn tone="primary" type="submit" icon="plus" disabled={busy} aria-busy={busy}>
            {busy ? 'Adding…' : 'Add booking'}
          </Btn>
        </>
      }
    >
      <div className="pn-form">
        {err.form && (
          <p className="pn-note pn-note--warn" role="alert">
            <Icon name="info" />
            {err.form}
          </p>
        )}
        <div className="pn-form-row">
          <Field label="Client's name" error={err.name}>
            {(p) => <input {...p} className="pn-input" value={v.name} onChange={set('name')} maxLength={100} autoComplete="off" />}
          </Field>
          <Field label="Kind of event" error={err.type}>
            {(p) => (
              <select {...p} className="pn-input" value={v.type} onChange={set('type')}>
                {hire.eventTypes.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className="pn-form-row">
          <Field label="Email" error={err.email}>
            {(p) => <input {...p} type="email" className="pn-input" value={v.email} onChange={set('email')} maxLength={254} autoComplete="off" />}
          </Field>
          <Field label="Phone" optional error={err.phone}>
            {(p) => <input {...p} type="tel" className="pn-input" value={v.phone} onChange={set('phone')} maxLength={30} autoComplete="off" />}
          </Field>
        </div>
        <div className="pn-form-row pn-form-row--3">
          <Field label="Date" error={err.date}>
            {(p) => <input {...p} type="date" className="pn-input" value={v.date} onChange={set('date')} />}
          </Field>
          <Field label="Start" optional error={err.time}>
            {(p) => <input {...p} type="time" className="pn-input" value={v.time} onChange={set('time')} />}
          </Field>
          <Field label="Photographers" error={err.crew}>
            {(p) => (
              <select {...p} className="pn-input" value={v.crew} onChange={set('crew')}>
                {['1', '2', '3', '4'].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className="pn-form-row">
          <Field label="Venue and city" error={err.venue}>
            {(p) => <input {...p} className="pn-input" value={v.venue} onChange={set('venue')} maxLength={200} />}
          </Field>
          <Field label="Coverage" optional error={err.coverage}>
            {(p) => (
              <select {...p} className="pn-input" value={v.coverage} onChange={set('coverage')}>
                <option value="">Not set</option>
                {hire.coverage.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <Field label="About the day" optional error={err.notes}>
          {(p) => <textarea {...p} className="pn-input" rows={3} value={v.notes} onChange={set('notes')} maxLength={2000} />}
        </Field>
      </div>
    </Modal>
  );
}
