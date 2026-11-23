import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../icons.jsx';
import { Avatar, Badge, Btn, Empty, PageHead, Pane, Search, Segments, Stat } from '../ui.jsx';
import { listTeam, refreshTeamSummary, setDayOff, useTeamSummary } from '../lib/team.js';
import { bookingTime, refreshBookingSummary, showMobile, useBookingSummary } from '../lib/bookings.js';
import { NotConnected, can, useSession } from '../../../lib/auth.js';
import { auth } from '../../../data/content.js';
import { toast } from '../lib/toast.js';
import { date, num, plural } from '../lib/format.js';

const STATE = {
  free: { label: 'Free', tone: 'done' },
  onsite: { label: 'At a site', tone: 'onsite' },
  off: { label: 'Off today', tone: 'neutral' },
  inactive: { label: 'Not active', tone: 'neutral' },
};
const ACCOUNT = { pending: 'Waiting for approval', disabled: 'Account disabled' };
const problem = (err) => (err instanceof NotConnected ? auth.offline : err.message);

/*
  The photographers and editors (every account with either role), and where each one is now:
  free, out at a site (on the crew of a booking under At the site), off today, or not active (an
  account waiting for approval or disabled). Ten at a time, by name; each page comes with a cursor
  for the next one, and the cursors already seen are kept so Previous goes back without a count.
  "Off today" keeps someone out of Send photographers on Bookings; anyone can mark themselves, the
  studio lead (team.manage) anyone.
*/
export default function Team() {
  const navigate = useNavigate();
  const session = useSession();
  const me = session.user;
  const manageAll = can(me, 'team.manage');
  const seesBookings = can(me, 'booking.view');
  const summary = useTeamSummary();
  const bookings = useBookingSummary();

  const [show, setShow] = useState('all'); // all | free | onsite | off
  const [role, setRole] = useState('all'); // all | photographer | editor
  const [q, setQ] = useState('');
  const [query, setQuery] = useState(''); // q, once typing pauses
  const [cursors, setCursors] = useState([null]); // the cursor that starts each page seen so far
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ members: [], nextCursor: null, pageSize: 10 });
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(() => new Set());
  const asked = useRef(0);

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
      const d = await listTeam({ status: show, role, q: query, cursor: cursors[page] });
      if (ticket !== asked.current) return;
      setData(d);
      setStatus('ready');
    } catch (err) {
      if (ticket !== asked.current) return;
      setError(problem(err));
      setStatus('error');
    }
  }, [show, role, query, cursors, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    refreshTeamSummary();
    if (seesBookings) refreshBookingSummary();
  }, [seesBookings]);

  const filter = (v) => {
    setShow(v);
    firstPage();
  };
  const byRole = (v) => {
    setRole(v);
    firstPage();
  };

  function next() {
    if (!data.nextCursor) return;
    setCursors((c) => [...c.slice(0, page + 1), data.nextCursor]);
    setPage((p) => p + 1);
  }

  async function toggleOff(m, off) {
    setSaving((s) => new Set(s).add(m.id));
    try {
      const out = await setDayOff(m.id, off);
      // the card changes in place, so the page doesn't jump
      setData((d) => ({ ...d, members: d.members.map((x) => (x.id === out.id ? out : x)) }));
      refreshTeamSummary();
      const who = m.id === me?.id ? 'You are' : `${m.name} is`;
      toast({
        tone: 'info',
        title: off ? `${who} off today` : `${who} back today`,
        text: off ? 'Not offered when sending photographers.' : 'Offered again when sending photographers.',
      });
    } catch (err) {
      toast({ tone: 'error', title: `Couldn't change ${m.name}'s day`, text: problem(err) });
    } finally {
      setSaving((s) => {
        const n = new Set(s);
        n.delete(m.id);
        return n;
      });
    }
  }

  const from = page * data.pageSize + 1;
  const to = page * data.pageSize + data.members.length;
  const roleTotal = role === 'photographer' ? summary.photographers : role === 'editor' ? summary.editors : summary.all;
  const total = query || !summary.loaded ? null : show === 'all' ? roleTotal : role === 'all' ? summary[show] : null;

  return (
    <>
      <PageHead
        kicker="Studio"
        title="Photographers"
        text="Every photographer and editor, and where each one is now: free, out at a site or off today. Send them from Bookings."
        actions={
          seesBookings && (
            <Btn tone="primary" icon="send" onClick={() => navigate('/photographer/bookings?show=confirmed')}>
              {bookings.confirmed ? `${plural(bookings.confirmed, 'booking')} to send` : 'Bookings'}
            </Btn>
          )
        }
      />
      <div className="pn-stats pn-stats--3">
        <Stat icon="check" tone="done" label="Free" value={summary.loaded ? num(summary.free) : '–'} note="Ready to send" onClick={() => filter(show === 'free' ? 'all' : 'free')} />
        <Stat icon="pin" tone="onsite" label="At a site" value={summary.loaded ? num(summary.onsite) : '–'} note="Out on a booking now" onClick={() => filter(show === 'onsite' ? 'all' : 'onsite')} />
        <Stat icon="clock" label="Off today" value={summary.loaded ? num(summary.off) : '–'} note="Not offered when sending" onClick={() => filter(show === 'off' ? 'all' : 'off')} />
      </div>

      <Pane pad={false}>
        <div className="pn-table-tools">
          <div className="pn-team-filters">
            <Segments
              label="Show people"
              value={show}
              onChange={filter}
              items={[
                { id: 'all', label: 'All', count: summary.all },
                { id: 'free', label: 'Free', count: summary.free },
                { id: 'onsite', label: 'At a site', count: summary.onsite },
                { id: 'off', label: 'Off today', count: summary.off },
              ]}
            />
            <Segments
              label="Role"
              value={role}
              onChange={byRole}
              items={[
                { id: 'all', label: 'Every role' },
                { id: 'photographer', label: 'Photographers', count: summary.photographers },
                { id: 'editor', label: 'Editors', count: summary.editors },
              ]}
            />
          </div>
          <Search value={q} onChange={setQ} label="Search the team" placeholder="Name, email or mobile" />
        </div>

        {status === 'error' ? (
          <Empty icon="info" title="Couldn't load the team" text={error}>
            <Btn icon="retry" onClick={load}>
              Try again
            </Btn>
          </Empty>
        ) : status === 'ready' && !data.members.length ? (
          page > 0 ? (
            <Empty icon="user" title="No more people" text="The people on this page have changed.">
              <Btn icon="back" onClick={() => setPage(0)}>
                First page
              </Btn>
            </Empty>
          ) : query || show !== 'all' || role !== 'all' ? (
            <Empty icon="user" title="Nobody matches" text={query ? 'Search part of a name, email or mobile number.' : 'Nobody in this list right now.'} />
          ) : (
            <Empty icon="user" title="No photographers or editors yet" text="Accounts with the Photographer or Editor role show here. The studio lead gives roles to staff accounts." />
          )
        ) : (
          <>
            <ul className={`pn-team pn-team--live${status === 'loading' ? ' is-loading' : ''}`} aria-busy={status === 'loading'}>
              {status === 'loading' && !data.members.length
                ? Array.from({ length: 3 }, (_, i) => <li key={i} className="pn-member pn-member--skel" aria-hidden="true" />)
                : data.members.map((m) => (
                    <Member key={m.id} m={m} isMe={m.id === me?.id} canOff={(m.id === me?.id || manageAll) && m.account === 'active'} saving={saving.has(m.id)} onOff={(off) => toggleOff(m, off)} />
                  ))}
            </ul>

            <nav className="pn-pager" aria-label="Pages of the team">
              <p className="pn-pager-note" aria-live="polite">
                {data.members.length ? (
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
    </>
  );
}

/* one person: who, where they are now, how to reach them, and the day-off switch */
function Member({ m, isMe, canOff, saving, onOff }) {
  const st = STATE[m.state];
  const site = m.onsite;
  const last = m.lastEvent;
  return (
    <li className={`pn-member is-${m.state}`}>
      <div className="pn-member-body">
        <div className="pn-member-top">
          <span className="pn-member-who">
            <Avatar name={m.name} photo={m.photo} size={48} />
            <span>
              <h2 className="pn-member-name">
                {m.name}
                {isMe && <span className="pn-quiet"> (you)</span>}
              </h2>
              <p className="pn-member-focus">
                {m.role.name}
                {ACCOUNT[m.account] ? ` · ${ACCOUNT[m.account]}` : ''}
              </p>
            </span>
          </span>
          <Badge tone={st.tone}>{st.label}</Badge>
        </div>

        {site ? (
          <p className="pn-member-now">
            <span className="pn-live" aria-hidden="true" />
            <span>
              <b>
                {site.type} for {site.client}
              </b>
              <small>
                {site.ref} · {site.venue}
                {site.time ? ` · from ${site.time}` : ''}
              </small>
            </span>
          </p>
        ) : (
          <p className="pn-member-now is-quiet">
            <Icon name="calendar" />
            <span>
              <b>{last ? `Last: ${last.type} for ${last.client}` : 'No events yet'}</b>
              <small>{last ? `${date(bookingTime(last))} · ${last.venue}` : m.role.slug === 'photographer' ? 'Send them from Bookings' : 'Sorts and shares the photographs'}</small>
            </span>
          </p>
        )}

        <p className="pn-member-contact">
          <a className="pn-cell-link" href={`mailto:${m.email}`} title={m.email}>
            {m.email}
          </a>
          <span className={m.mobile ? '' : 'pn-quiet'}>{m.mobile ? showMobile(m.mobile) : 'No phone on file'}</span>
        </p>

        <div className="pn-member-foot">
          <span className="pn-quiet">{plural(m.completed, 'event')} completed</span>
          {site ? (
            <Link to="/photographer/bookings?show=dispatched" className="pn-link">
              See booking
            </Link>
          ) : canOff ? (
            <label className="pn-switch">
              <input type="checkbox" checked={m.offToday} disabled={saving} onChange={(e) => onOff(e.target.checked)} />
              <span aria-hidden="true" />
              Off today
            </label>
          ) : null}
        </div>
      </div>
    </li>
  );
}
